import { createServerFn } from "@tanstack/react-start";

export interface ProspectPlace {
  title: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  category: string | null;
  placeId: string | null;
  cid: string | null;
}

export interface EnrichResult {
  cnpj_suggestions: { value: string; source: string }[];
  decisor_suggestions: { name: string; role: string | null; url: string }[];
}

const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;

async function serper(path: string, body: unknown) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY não configurada");
  const res = await fetch(`https://google.serper.dev/${path}`, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Serper ${path} ${res.status}`);
  return res.json();
}

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: { segment: string; city: string; num?: number }) => {
    if (!data?.segment || !data?.city) throw new Error("segment e city obrigatórios");
    return { segment: String(data.segment).slice(0, 120), city: String(data.city).slice(0, 80), num: Math.min(Math.max(Number(data.num) || 20, 1), 40) };
  })
  .handler(async ({ data }) => {
    const q = `${data.segment} em ${data.city}`;
    const json = (await serper("places", { q, gl: "br", hl: "pt-br", location: `${data.city}, Brazil`, num: data.num })) as {
      places?: Array<{
        title?: string; address?: string; phoneNumber?: string; website?: string;
        rating?: number; ratingCount?: number; category?: string; placeId?: string; cid?: string;
      }>;
    };
    const places: ProspectPlace[] = (json.places ?? []).slice(0, data.num).map((p) => ({
      title: p.title ?? "Sem nome",
      address: p.address ?? null,
      phone: p.phoneNumber ?? null,
      website: p.website ?? null,
      rating: typeof p.rating === "number" ? p.rating : null,
      ratingCount: typeof p.ratingCount === "number" ? p.ratingCount : null,
      category: p.category ?? null,
      placeId: p.placeId ?? null,
      cid: p.cid ?? null,
    }));
    return { places };
  });

export interface PlacePhoto {
  url: string;
  thumb: string;
  source: string | null;
  title: string | null;
}

export const fetchPlacePhotos = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; city?: string | null; address?: string | null }) => {
    if (!data?.name) throw new Error("name obrigatório");
    return {
      name: String(data.name).slice(0, 160),
      city: data.city ? String(data.city).slice(0, 80) : "",
      address: data.address ? String(data.address).slice(0, 200) : "",
    };
  })
  .handler(async ({ data }): Promise<{ photos: PlacePhoto[] }> => {
    const q = `${data.name} ${data.city || data.address || ""}`.trim();
    try {
      const json = (await serper("images", { q, gl: "br", hl: "pt-br", num: 10 })) as {
        images?: Array<{ imageUrl?: string; thumbnailUrl?: string; title?: string; link?: string; source?: string }>;
      };
      const seen = new Set<string>();
      const photos: PlacePhoto[] = [];
      for (const im of json.images ?? []) {
        const url = im.imageUrl || im.thumbnailUrl;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        photos.push({
          url,
          thumb: im.thumbnailUrl || url,
          source: im.source || im.link || null,
          title: im.title || null,
        });
        if (photos.length >= 8) break;
      }
      return { photos };
    } catch {
      return { photos: [] };
    }
  });

export const enrichLead = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; city: string; website?: string | null }) => {
    if (!data?.name) throw new Error("name obrigatório");
    return {
      name: String(data.name).slice(0, 160),
      city: String(data.city || "").slice(0, 80),
      website: data.website ? String(data.website).slice(0, 200) : null,
    };
  })
  .handler(async ({ data }): Promise<EnrichResult> => {
    const cnpjSet = new Map<string, string>();
    const decisorMap = new Map<string, { name: string; role: string | null; url: string }>();

    const CNPJ_SITES = [
      "cnpj.biz",
      "casadosdados.com.br",
      "cnpj.news",
      "econodata.com.br",
      "consultacnpj.com",
      "cnpja.com",
      "empresaqui.com.br",
      "cnpjs.rocket.chat",
    ];

    // Extrai nomes de sócios/QSA de páginas de indexadores.
    // Padrões comuns: "SÓCIO-ADMINISTRADOR", "Administrador", "Diretor", "QSA".
    const SOCIO_ROLE = /(S[ÓO]CIO[-\s]?ADMINISTRADOR|S[ÓO]CIO|ADMINISTRADOR|DIRETOR|PRESIDENTE|TITULAR|PROPRIET[ÁA]RIO)/i;
    const NAME_LINE = /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'` ]{6,60})/;

    function extractSocios(html: string, sourceUrl: string) {
      // Remove tags e normaliza whitespace
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ");
      // Encontra ocorrências "CARGO - NOME" ou "NOME - CARGO"
      const patterns = [
        new RegExp(`${SOCIO_ROLE.source}\\s*[-–:]\\s*${NAME_LINE.source}`, "gi"),
        new RegExp(`${NAME_LINE.source}\\s*[-–:]\\s*${SOCIO_ROLE.source}`, "gi"),
      ];
      for (const re of patterns) {
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = re.exec(text)) && count < 8) {
          const role = (m[1].match(SOCIO_ROLE) ? m[1] : m[2]).trim();
          const name = (m[1].match(SOCIO_ROLE) ? m[2] : m[1]).trim();
          // Filtros: nome com pelo menos 2 palavras, não caixa alta total suspeita
          if (!/^[A-ZÀ-Ú][a-zà-úA-ZÀ-Ú' ]+\s[A-ZÀ-Ú]/.test(name) && !/^[A-ZÀ-Ú ]{6,}$/.test(name)) continue;
          const key = name.toLowerCase();
          if (!decisorMap.has(key)) {
            decisorMap.set(key, { name: toTitleCase(name), role: toTitleCase(role), url: sourceUrl });
          }
          count++;
        }
      }
    }

    function toTitleCase(s: string) {
      return s
        .toLowerCase()
        .split(" ")
        .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ")
        .trim();
    }

    // 1) Site oficial: CNPJ + possíveis nomes no rodapé
    if (data.website) {
      try {
        const url = data.website.startsWith("http") ? data.website : `https://${data.website}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const html = (await res.text()).slice(0, 500_000);
          const matches = html.match(CNPJ_REGEX) ?? [];
          for (const m of matches.slice(0, 3)) cnpjSet.set(m, url);
        }
      } catch {}
    }

    // 2) Serper em indexadores de CNPJ — grava CNPJ do snippet e coleta top links pra scraping
    const scrapeTargets: string[] = [];
    try {
      const siteFilter = CNPJ_SITES.map((s) => `site:${s}`).join(" OR ");
      const q = `"${data.name}" ${data.city} (${siteFilter})`;
      const json = (await serper("search", { q, gl: "br", hl: "pt-br", num: 8 })) as {
        organic?: Array<{ title?: string; snippet?: string; link?: string }>;
      };
      for (const o of json.organic ?? []) {
        const text = `${o.title ?? ""} ${o.snippet ?? ""}`;
        const matches = text.match(CNPJ_REGEX) ?? [];
        for (const m of matches) if (!cnpjSet.has(m)) cnpjSet.set(m, o.link ?? "serper");
        if (o.link && CNPJ_SITES.some((s) => o.link!.includes(s)) && scrapeTargets.length < 3) {
          scrapeTargets.push(o.link);
        }
      }
    } catch {}

    // 3) Scraping das páginas dos indexadores (CNPJ + sócios/QSA) em paralelo
    await Promise.all(
      scrapeTargets.map(async (url) => {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(6000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Nexus360-Bot/1.0)" },
          });
          if (!res.ok) return;
          const html = (await res.text()).slice(0, 400_000);
          const matches = html.match(CNPJ_REGEX) ?? [];
          for (const m of matches.slice(0, 2)) if (!cnpjSet.has(m)) cnpjSet.set(m, url);
          extractSocios(html, url);
        } catch {}
      }),
    );

    // 4) LinkedIn (adiciona ao pool de decisores)
    try {
      const q = `site:linkedin.com/in "${data.name}" (CEO OR sócio OR diretor OR proprietário OR fundador)`;
      const json = (await serper("search", { q, gl: "br", hl: "pt-br", num: 5 })) as {
        organic?: Array<{ title?: string; snippet?: string; link?: string }>;
      };
      for (const o of json.organic ?? []) {
        if (!o.link?.includes("linkedin.com/in")) continue;
        const raw = (o.title ?? "").replace(/\s*\|\s*LinkedIn.*$/i, "");
        const parts = raw.split(" - ").map((s) => s.trim());
        const name = parts[0] ?? raw;
        const key = name.toLowerCase();
        if (!decisorMap.has(key)) {
          decisorMap.set(key, { name, role: parts[1] ?? null, url: o.link });
        }
      }
    } catch {}

    return {
      cnpj_suggestions: Array.from(cnpjSet, ([value, source]) => ({ value, source })),
      decisor_suggestions: Array.from(decisorMap.values()).slice(0, 8),
    };
  });

