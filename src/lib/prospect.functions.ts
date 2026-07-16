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

    // 1) Tenta raspar CNPJ do site oficial (mais confiável)
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

    // 2) Fallback: Serper busca "CNPJ empresa cidade"
    if (cnpjSet.size === 0) {
      try {
        const q = `CNPJ "${data.name}" ${data.city}`;
        const json = (await serper("search", { q, gl: "br", hl: "pt-br", num: 5 })) as {
          organic?: Array<{ title?: string; snippet?: string; link?: string }>;
        };
        for (const o of json.organic ?? []) {
          const text = `${o.title ?? ""} ${o.snippet ?? ""}`;
          const matches = text.match(CNPJ_REGEX) ?? [];
          for (const m of matches) if (!cnpjSet.has(m)) cnpjSet.set(m, o.link ?? "serper");
        }
      } catch {}
    }

    // 3) Decisores via LinkedIn
    const decisores: EnrichResult["decisor_suggestions"] = [];
    try {
      const q = `site:linkedin.com/in "${data.name}" (CEO OR sócio OR diretor OR proprietário OR fundador)`;
      const json = (await serper("search", { q, gl: "br", hl: "pt-br", num: 5 })) as {
        organic?: Array<{ title?: string; snippet?: string; link?: string }>;
      };
      for (const o of json.organic ?? []) {
        if (!o.link?.includes("linkedin.com/in")) continue;
        // "Nome Sobrenome - Cargo - Empresa | LinkedIn"
        const raw = (o.title ?? "").replace(/\s*\|\s*LinkedIn.*$/i, "");
        const parts = raw.split(" - ").map((s) => s.trim());
        decisores.push({
          name: parts[0] ?? raw,
          role: parts[1] ?? null,
          url: o.link,
        });
      }
    } catch {}

    return {
      cnpj_suggestions: Array.from(cnpjSet, ([value, source]) => ({ value, source })),
      decisor_suggestions: decisores.slice(0, 5),
    };
  });
