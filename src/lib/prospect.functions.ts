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

export interface Competitor {
  title: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  website: string | null;
  placeId: string | null;
  score: number;
  isTarget: boolean;
}

export interface CompetitionReport {
  radiusKm: number;
  segment: string;
  location: string;
  competitors: Competitor[];
  stats: {
    total: number;
    avgRating: number;
    avgReviews: number;
    totalReviews: number;
    targetPosition: number | null;
    targetScore: number | null;
    percentile: number | null;
    reviewsShare: number | null;
    topScore: number;
  };
  insights: string[];
}

function competitorScore(rating: number | null, reviews: number | null) {
  const r = rating ?? 0;
  const n = reviews ?? 0;
  // Bayesian-ish: rating weighted by log(reviews+1)
  return Math.round(r * 10 * Math.log10(n + 10));
}

export const analyzeCompetition = createServerFn({ method: "POST" })
  .inputValidator((data: { segment: string; address: string; targetName: string; targetPlaceId?: string | null; radiusKm: 5 | 10 | 15 }) => {
    if (!data?.segment || !data?.address || !data?.targetName) throw new Error("segment, address e targetName obrigatórios");
    const radiusKm = ([5, 10, 15] as const).includes(data.radiusKm) ? data.radiusKm : 5;
    return {
      segment: String(data.segment).slice(0, 120),
      address: String(data.address).slice(0, 200),
      targetName: String(data.targetName).slice(0, 160),
      targetPlaceId: data.targetPlaceId ?? null,
      radiusKm,
    };
  })
  .handler(async ({ data }): Promise<CompetitionReport> => {
    // Raio aproximado via quantidade de resultados (Serper não filtra por raio real)
    const numByRadius: Record<number, number> = { 5: 10, 10: 20, 15: 30 };
    const num = numByRadius[data.radiusKm];
    const q = `${data.segment} perto de ${data.address}`;
    const json = (await serper("places", { q, gl: "br", hl: "pt-br", location: data.address, num })) as {
      places?: Array<{
        title?: string; address?: string; rating?: number; ratingCount?: number;
        website?: string; placeId?: string;
      }>;
    };

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetKey = normalize(data.targetName);

    const competitors: Competitor[] = (json.places ?? []).slice(0, num).map((p) => {
      const title = p.title ?? "Sem nome";
      const isTarget = !!(
        (data.targetPlaceId && p.placeId === data.targetPlaceId) ||
        normalize(title) === targetKey
      );
      return {
        title,
        address: p.address ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
        ratingCount: typeof p.ratingCount === "number" ? p.ratingCount : null,
        website: p.website ?? null,
        placeId: p.placeId ?? null,
        score: competitorScore(p.rating ?? null, p.ratingCount ?? null),
        isTarget,
      };
    });

    // Ordena por score (desc)
    competitors.sort((a, b) => b.score - a.score);

    const total = competitors.length;
    const totalReviews = competitors.reduce((s, c) => s + (c.ratingCount ?? 0), 0);
    const ratings = competitors.map((c) => c.rating ?? 0).filter((r) => r > 0);
    const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const avgReviews = total ? totalReviews / total : 0;

    const targetIdx = competitors.findIndex((c) => c.isTarget);
    const targetPosition = targetIdx >= 0 ? targetIdx + 1 : null;
    const target = targetIdx >= 0 ? competitors[targetIdx] : null;
    const targetScore = target?.score ?? null;
    const percentile = target && total > 1 ? Math.round(((total - targetIdx) / total) * 100) : null;
    const reviewsShare = target && totalReviews > 0 ? Math.round(((target.ratingCount ?? 0) / totalReviews) * 100) : null;
    const topScore = competitors[0]?.score ?? 0;

    const insights: string[] = [];
    if (target) {
      if (targetPosition === 1) insights.push(`🏆 Líder do raio de ${data.radiusKm}km entre ${total} concorrentes.`);
      else insights.push(`Posição ${targetPosition}º de ${total} no raio de ${data.radiusKm}km.`);
      if ((target.rating ?? 0) < avgRating) insights.push(`Nota (${target.rating?.toFixed(1) ?? "–"}) abaixo da média local (${avgRating.toFixed(1)}).`);
      else insights.push(`Nota acima ou igual à média local (${avgRating.toFixed(1)}).`);
      if ((target.ratingCount ?? 0) < avgReviews) insights.push(`Poucos reviews (${target.ratingCount ?? 0}) vs média ${Math.round(avgReviews)}. Oportunidade de gestão de reputação.`);
      if (reviewsShare != null) insights.push(`Detém ${reviewsShare}% do volume de reviews da região.`);
      if (targetScore != null && topScore > 0) {
        const gap = Math.round(((topScore - targetScore) / topScore) * 100);
        if (gap > 0) insights.push(`Está ${gap}% atrás do líder em pontuação combinada (nota × reviews).`);
      }
    } else {
      insights.push(`Perfil não apareceu no top ${total}. Alta oportunidade de otimização de SEO local.`);
    }

    return {
      radiusKm: data.radiusKm,
      segment: data.segment,
      location: data.address,
      competitors,
      stats: { total, avgRating, avgReviews, totalReviews, targetPosition, targetScore, percentile, reviewsShare, topScore },
      insights,
    };
  });

export interface KeywordPlaceEntry {
  position: number;
  title: string;
  address: string | null;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  website: string | null;
  isTarget: boolean;
  reasons: string[];
}

export interface KeywordRadiusBlock {
  radiusKm: 5 | 10 | 15;
  top3: KeywordPlaceEntry[];
  targetPosition: number | null;
  totalShown: number;
}

export interface KeywordRanking {
  keyword: string;
  location: string;
  localPack: {
    position: number | null;
    totalShown: number;
    top: KeywordPlaceEntry[];
  };
  organic: {
    position: number | null;
    totalShown: number;
    matchedUrl: string | null;
    top: Array<{ title: string; link: string; position: number; isTarget: boolean }>;
  };
  perRadius: KeywordRadiusBlock[];
  targetAnalysis: string[];
}

export const analyzeKeywordRanking = createServerFn({ method: "POST" })
  .inputValidator((data: { keyword: string; location: string; targetName: string; targetPlaceId?: string | null; targetWebsite?: string | null }) => {
    if (!data?.keyword || !data?.location || !data?.targetName) throw new Error("keyword, location e targetName obrigatórios");
    return {
      keyword: String(data.keyword).slice(0, 160),
      location: String(data.location).slice(0, 160),
      targetName: String(data.targetName).slice(0, 160),
      targetPlaceId: data.targetPlaceId ?? null,
      targetWebsite: data.targetWebsite ?? null,
    };
  })
  .handler(async ({ data }): Promise<KeywordRanking> => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetKey = normalize(data.targetName);
    const kwTokens = data.keyword.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const targetHost = (() => {
      if (!data.targetWebsite) return null;
      try { return new URL(data.targetWebsite.startsWith("http") ? data.targetWebsite : `https://${data.targetWebsite}`).hostname.replace(/^www\./, ""); }
      catch { return null; }
    })();

    type RawPlace = { title?: string; address?: string; rating?: number; ratingCount?: number; placeId?: string; category?: string; website?: string };

    // Raio real não é suportado pela API — aproximamos aumentando o num.
    const radii: Array<{ km: 5 | 10 | 15; num: number }> = [
      { km: 5, num: 5 }, { km: 10, num: 10 }, { km: 15, num: 20 },
    ];

    const [radiusResults, searchJson] = await Promise.all([
      Promise.all(
        radii.map((r) =>
          serper("places", { q: data.keyword, gl: "br", hl: "pt-br", location: data.location, num: r.num })
            .then((j) => ({ km: r.km, arr: ((j as { places?: RawPlace[] }).places ?? []).slice(0, r.num) }))
            .catch(() => ({ km: r.km, arr: [] as RawPlace[] })),
        ),
      ),
      serper("search", { q: data.keyword, gl: "br", hl: "pt-br", location: data.location, num: 20 })
        .catch(() => ({} as { organic?: Array<{ title?: string; link?: string }> })),
    ]);

    function buildEntry(p: RawPlace, i: number): KeywordPlaceEntry {
      const title = p.title ?? "Sem nome";
      const rating = typeof p.rating === "number" ? p.rating : null;
      const reviews = typeof p.ratingCount === "number" ? p.ratingCount : null;
      const isTarget = !!((data.targetPlaceId && p.placeId === data.targetPlaceId) || normalize(title) === targetKey);
      const titleLower = title.toLowerCase();
      const catLower = (p.category ?? "").toLowerCase();
      const reasons: string[] = [];
      if ((reviews ?? 0) >= 100) reasons.push(`Volume alto de reviews (${reviews})`);
      else if ((reviews ?? 0) >= 30) reasons.push(`Reviews consistentes (${reviews})`);
      if ((rating ?? 0) >= 4.7) reasons.push(`Nota excelente (${rating?.toFixed(1)})`);
      else if ((rating ?? 0) >= 4.3) reasons.push(`Nota sólida (${rating?.toFixed(1)})`);
      const kwHitTitle = kwTokens.filter((t) => titleLower.includes(t));
      if (kwHitTitle.length) reasons.push(`Palavra-chave no nome: "${kwHitTitle.join(", ")}"`);
      const kwHitCat = kwTokens.filter((t) => catLower.includes(t));
      if (kwHitCat.length && p.category) reasons.push(`Categoria alinhada: ${p.category}`);
      if (p.website) reasons.push("Site vinculado ao perfil");
      if (!reasons.length) reasons.push("Sem sinais fortes — posição provavelmente por proximidade geográfica");
      return {
        position: i + 1,
        title,
        address: p.address ?? null,
        rating,
        reviews,
        category: p.category ?? null,
        website: p.website ?? null,
        isTarget,
        reasons,
      };
    }

    const perRadius: KeywordRadiusBlock[] = radiusResults.map(({ km, arr }) => {
      const entries = arr.map(buildEntry);
      const idx = entries.findIndex((e) => e.isTarget);
      return {
        radiusKm: km,
        top3: entries.slice(0, 3),
        targetPosition: idx >= 0 ? idx + 1 : null,
        totalShown: entries.length,
      };
    });

    // Usa o maior raio (15km / num:20) como base para localPack global
    const fullest = radiusResults.find((r) => r.km === 15) ?? radiusResults[radiusResults.length - 1];
    const localTop = fullest.arr.map(buildEntry);
    const localIdx = localTop.findIndex((e) => e.isTarget);

    const organicArr = ((searchJson as { organic?: Array<{ title?: string; link?: string }> }).organic ?? []).slice(0, 20);
    let matchedUrl: string | null = null;
    const organicTop = organicArr.map((o, i) => {
      const title = o.title ?? "";
      const link = o.link ?? "";
      let isTarget = false;
      if (targetHost && link) {
        try {
          const h = new URL(link).hostname.replace(/^www\./, "");
          if (h === targetHost || h.endsWith("." + targetHost)) { isTarget = true; if (!matchedUrl) matchedUrl = link; }
        } catch {}
      }
      if (!isTarget && normalize(title).includes(targetKey) && targetKey.length > 4) {
        isTarget = true;
        if (!matchedUrl) matchedUrl = link;
      }
      return { title, link, position: i + 1, isTarget };
    });
    const organicIdx = organicTop.findIndex((o) => o.isTarget);

    // Análise do alvo: por que está (ou não) posicionado
    const targetAnalysis: string[] = [];
    const targetEntry = localTop.find((e) => e.isTarget) ?? null;
    if (targetEntry) {
      targetAnalysis.push(`Aparece em ${targetEntry.position}º no local pack para "${data.keyword}".`);
      targetAnalysis.push(...targetEntry.reasons.map((r) => `Fator observado: ${r}.`));
      const leader = localTop[0];
      if (leader && !leader.isTarget) {
        const gapReviews = (leader.reviews ?? 0) - (targetEntry.reviews ?? 0);
        if (gapReviews > 0) targetAnalysis.push(`Líder tem ${gapReviews} reviews a mais.`);
        const gapRating = (leader.rating ?? 0) - (targetEntry.rating ?? 0);
        if (gapRating > 0.1) targetAnalysis.push(`Líder tem nota ${gapRating.toFixed(1)} pontos acima.`);
      }
    } else {
      targetAnalysis.push(`Não aparece nos ${localTop.length} primeiros para "${data.keyword}".`);
      const leader = localTop[0];
      if (leader) targetAnalysis.push(`Líder atual: ${leader.title} (${leader.rating?.toFixed(1) ?? "–"} • ${leader.reviews ?? 0} reviews).`);
      targetAnalysis.push("Ação: reforçar reviews, categoria, palavras-chave no nome/descrição e sinais de proximidade.");
    }

    return {
      keyword: data.keyword,
      location: data.location,
      localPack: { position: localIdx >= 0 ? localIdx + 1 : null, totalShown: localTop.length, top: localTop.slice(0, 10) },
      organic: { position: organicIdx >= 0 ? organicIdx + 1 : null, totalShown: organicTop.length, matchedUrl, top: organicTop.slice(0, 10) },
      perRadius,
      targetAnalysis,
    };
  });

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

export interface InstagramPost {
  imageUrl: string;
  thumb: string;
  link: string | null;
  title: string | null;
}

export interface InstagramProfile {
  handle: string | null;
  url: string | null;
  fullName: string | null;
  bio: string | null;
  followers: string | null;
  following: string | null;
  posts: string | null;
  avatar: string | null;
  recentPosts: InstagramPost[];
  found: boolean;
  raw: { title: string; snippet: string; link: string }[];
}

function parseIgSnippet(text: string) {
  // Padrões comuns: "1.234 seguidores, 567 seguindo, 89 publicações"
  const nOr = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].replace(/\s/g, "") : null;
  };
  return {
    followers: nOr(/([\d.,KMkm]+)\s*(?:seguidores|followers)/i),
    following: nOr(/([\d.,KMkm]+)\s*(?:seguindo|following)/i),
    posts: nOr(/([\d.,KMkm]+)\s*(?:publica[cç][õo]es|posts)/i),
  };
}

export const fetchInstagramProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; city?: string | null; website?: string | null }) => {
    if (!data?.name) throw new Error("name obrigatório");
    return {
      name: String(data.name).slice(0, 160),
      city: data.city ? String(data.city).slice(0, 80) : "",
      website: data.website ? String(data.website).slice(0, 200) : "",
    };
  })
  .handler(async ({ data }): Promise<InstagramProfile> => {
    const q = `site:instagram.com "${data.name}" ${data.city}`.trim();
    const search = (await serper("search", { q, gl: "br", hl: "pt-br", num: 10 }).catch(() => ({}))) as {
      organic?: Array<{ title?: string; snippet?: string; link?: string }>;
    };

    const organic = (search.organic ?? []).filter((o) => o.link?.includes("instagram.com"));
    // Prioriza perfis (instagram.com/handle) sobre posts (/p/) ou reels
    const profileHit = organic.find((o) => {
      try {
        const u = new URL(o.link!);
        const parts = u.pathname.split("/").filter(Boolean);
        return parts.length === 1 && !["p", "reel", "explore", "reels"].includes(parts[0]);
      } catch { return false; }
    }) ?? organic[0];

    let handle: string | null = null;
    let url: string | null = null;
    let fullName: string | null = null;
    let bio: string | null = null;
    let followers: string | null = null;
    let following: string | null = null;
    let posts: string | null = null;

    if (profileHit?.link) {
      try {
        const u = new URL(profileHit.link);
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (seg && !["p", "reel", "explore", "reels"].includes(seg)) handle = seg;
        url = `https://www.instagram.com/${handle ?? seg}/`;
      } catch {}
      const rawTitle = profileHit.title ?? "";
      // Título costuma vir "Nome Completo (@handle) • Instagram photos and videos"
      const nameMatch = rawTitle.match(/^(.+?)\s*\(@/);
      if (nameMatch) fullName = nameMatch[1].trim();
      const snippet = profileHit.snippet ?? "";
      const stats = parseIgSnippet(snippet);
      followers = stats.followers;
      following = stats.following;
      posts = stats.posts;
      // Bio: parte do snippet após as estatísticas
      const bioPart = snippet.split(/\d+[\d.,KMkm]*\s*(?:publica[cç][õo]es|posts)/i)[1];
      bio = (bioPart || snippet).replace(/\s+/g, " ").trim().slice(0, 240) || null;
    }

    // Fotos: perfil e posts recentes via Serper images
    const imgQuery = handle ? `site:instagram.com/${handle}` : `site:instagram.com "${data.name}"`;
    const imgs = (await serper("images", { q: imgQuery, gl: "br", hl: "pt-br", num: 12 }).catch(() => ({}))) as {
      images?: Array<{ imageUrl?: string; thumbnailUrl?: string; title?: string; link?: string }>;
    };
    const seen = new Set<string>();
    const recentPosts: InstagramPost[] = [];
    let avatar: string | null = null;
    for (const im of imgs.images ?? []) {
      const u = im.imageUrl || im.thumbnailUrl;
      if (!u || seen.has(u)) continue;
      seen.add(u);
      if (!avatar) avatar = u;
      if (im.link && /instagram\.com\/(p|reel)\//.test(im.link) && recentPosts.length < 6) {
        recentPosts.push({
          imageUrl: u,
          thumb: im.thumbnailUrl || u,
          link: im.link,
          title: im.title || null,
        });
      }
    }

    return {
      handle,
      url,
      fullName,
      bio,
      followers,
      following,
      posts,
      avatar,
      recentPosts,
      found: !!profileHit,
      raw: (organic ?? []).slice(0, 5).map((o) => ({ title: o.title ?? "", snippet: o.snippet ?? "", link: o.link ?? "" })),
    };
  });

