import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Search, Sparkles, Download, Loader2, ExternalLink, Star, MapPin, Phone,
  Globe, MessageSquare, Building2, User, TrendingUp, TrendingDown, Minus, Check,
  Target, Trophy, Instagram,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchPlaces, enrichLead, fetchPlacePhotos, analyzeCompetition, fetchInstagramProfile, type ProspectPlace, type EnrichResult, type PlacePhoto, type CompetitionReport, type InstagramProfile } from "@/lib/prospect.functions";
import { store, useStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospect")({
  head: () => ({ meta: [{ title: "Prospectar — Nexus360" }] }),
  component: ProspectPage,
});

type Row = ProspectPlace & {
  selected: boolean;
  enriching?: boolean;
  enrichment?: EnrichResult;
  cnpj?: string;
  decisor?: string;
};

interface Analysis {
  score: number;
  tier: "quente" | "morno" | "frio";
  signals: { label: string; ok: boolean }[];
  reviewsTier: "top" | "solido" | "novo";
}

function analyze(r: Row): Analysis {
  const rating = r.rating ?? 0;
  const reviews = r.ratingCount ?? 0;
  const hasSite = !!r.website;
  const hasPhone = !!r.phone;

  let score = 0;
  if (rating >= 4.5) score += 35;
  else if (rating >= 4.0) score += 25;
  else if (rating >= 3.5) score += 15;
  if (reviews >= 200) score += 30;
  else if (reviews >= 50) score += 20;
  else if (reviews >= 10) score += 10;
  if (hasSite) score += 15;
  if (hasPhone) score += 20;

  const tier: Analysis["tier"] = score >= 75 ? "quente" : score >= 45 ? "morno" : "frio";
  const reviewsTier: Analysis["reviewsTier"] = reviews >= 200 ? "top" : reviews >= 30 ? "solido" : "novo";

  return {
    score,
    tier,
    reviewsTier,
    signals: [
      { label: "Telefone", ok: hasPhone },
      { label: "Site", ok: hasSite },
      { label: `${reviews}+ reviews`, ok: reviews >= 30 },
      { label: `Nota ${rating || "–"}`, ok: rating >= 4.0 },
    ],
  };
}

const TIER_META: Record<Analysis["tier"], { label: string; className: string; icon: typeof TrendingUp }> = {
  quente: { label: "Lead quente", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400", icon: TrendingUp },
  morno: { label: "Potencial", className: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400", icon: Minus },
  frio: { label: "Baixa", className: "bg-slate-500/10 text-slate-500 border-slate-500/30", icon: TrendingDown },
};

function ProspectPage() {
  const campaigns = useStore((s) => s.campaigns);
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [num, setNum] = useState(20);
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const search = async () => {
    if (!segment || !city) return toast.error("Informe segmento e cidade");
    setLoading(true);
    try {
      const { places } = await searchPlaces({ data: { segment, city, num } });
      setRows(places.map((p) => ({ ...p, selected: false })));
      if (!places.length) toast.info("Nenhum resultado");
      else toast.success(`${places.length} leads encontrados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setLoading(false);
    }
  };

  const enrichRow = async (i: number) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, enriching: true } : r)));
    try {
      const row = rows[i];
      const en = await enrichLead({ data: { name: row.title, city, website: row.website } });
      setRows((rs) =>
        rs.map((r, idx) =>
          idx === i
            ? {
                ...r,
                enriching: false,
                enrichment: en,
                cnpj: en.cnpj_suggestions[0]?.value ?? r.cnpj,
                decisor: en.decisor_suggestions[0]?.name ?? r.decisor,
              }
            : r,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enriquecer");
      setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, enriching: false } : r)));
    }
  };

  const enrichSelected = async () => {
    const idxs = rows.map((r, i) => (r.selected && !r.enrichment ? i : -1)).filter((i) => i >= 0);
    if (!idxs.length) return toast.error("Selecione ao menos um lead");
    for (const i of idxs) await enrichRow(i);
    toast.success("Enriquecimento concluído");
  };

  const importSelected = () => {
    if (!campaignId) return toast.error("Selecione uma campanha");
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return toast.error("Selecione ao menos um lead");
    for (const r of selected) {
      store.addLead({
        campaign_id: campaignId,
        name: r.title,
        phone_e164: null,
        phone_raw: r.phone,
        address: r.address,
        category: r.category,
        website: r.website,
        rating: r.rating,
        has_whatsapp: null,
        place_id: r.placeId,
        stage: "novo",
        notes: [r.cnpj ? `CNPJ: ${r.cnpj}` : null, r.decisor ? `Decisor: ${r.decisor}` : null].filter(Boolean).join(" • ") || null,
        last_contacted_at: null,
      });
    }
    toast.success(`${selected.length} leads importados`);
    setRows((rs) => rs.map((r) => (r.selected ? { ...r, selected: false } : r)));
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const stats = useMemo(() => {
    const analyzed = rows.map(analyze);
    return {
      quente: analyzed.filter((a) => a.tier === "quente").length,
      morno: analyzed.filter((a) => a.tier === "morno").length,
      frio: analyzed.filter((a) => a.tier === "frio").length,
    };
  }, [rows]);

  return (
    <AppShell title="Prospectar Leads">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar no Google (Serper)</CardTitle>
            <CardDescription>Digite o segmento e a cidade para importar do Google Meu Negócio</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_100px_1fr_auto]">
            <div className="space-y-1">
              <Label>Segmento</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="ex.: dentista, restaurante" />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex.: São Paulo" />
            </div>
            <div className="space-y-1">
              <Label>Qtd</Label>
              <Input type="number" min={1} max={40} value={num} onChange={(e) => setNum(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Campanha destino</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={search} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="mr-1 h-3 w-3" /> {stats.quente} quentes
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <Minus className="mr-1 h-3 w-3" /> {stats.morno} potenciais
                </Badge>
                <Badge variant="outline" className="bg-slate-500/10 border-slate-500/30 text-slate-500">
                  <TrendingDown className="mr-1 h-3 w-3" /> {stats.frio} baixas
                </Badge>
                <span className="text-muted-foreground">• {selectedCount} selecionados</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={enrichSelected} disabled={!selectedCount}>
                  <Sparkles className="mr-1 h-3 w-3" /> Enriquecer
                </Button>
                <Button size="sm" onClick={importSelected} disabled={!selectedCount}>
                  <Download className="mr-1 h-3 w-3" /> Importar {selectedCount || ""}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((r, i) => (
                <LeadCard
                  key={r.placeId ?? `${r.title}-${i}`}
                  row={r}
                  segment={segment}
                  onToggle={(v) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, selected: v } : row))}
                  onEnrich={() => enrichRow(i)}
                  onCnpjChange={(v) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, cnpj: v } : row))}
                  onDecisorChange={(v) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, decisor: v } : row))}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function LeadCard({
  row, segment, onToggle, onEnrich, onCnpjChange, onDecisorChange,
}: {
  row: Row;
  segment: string;
  onToggle: (v: boolean) => void;
  onEnrich: () => void;
  onCnpjChange: (v: string) => void;
  onDecisorChange: (v: string) => void;
}) {
  const a = analyze(row);
  const tier = TIER_META[a.tier];
  const TierIcon = tier.icon;
  const site = row.website ? (row.website.startsWith("http") ? row.website : `https://${row.website}`) : null;
  const mapsUrl = row.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${row.placeId}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${row.title} ${row.address ?? ""}`)}`;

  const [photos, setPhotos] = useState<PlacePhoto[] | null>(null);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("google");
  const [radius, setRadius] = useState<5 | 10 | 15>(5);
  const [reports, setReports] = useState<Partial<Record<5 | 10 | 15, CompetitionReport>>>({});
  const [reportLoading, setReportLoading] = useState(false);
  const report = reports[radius];
  const [instagram, setInstagram] = useState<InstagramProfile | null>(null);
  const [igLoading, setIgLoading] = useState(false);

  const runCompetition = async (r: 5 | 10 | 15) => {
    if (!row.address) return toast.error("Endereço indisponível para análise");
    if (!segment) return toast.error("Segmento não informado");
    setReportLoading(true);
    try {
      const rep = await analyzeCompetition({
        data: { segment, address: row.address, targetName: row.title, targetPlaceId: row.placeId, radiusKm: r },
      });
      setReports((prev) => ({ ...prev, [r]: rep }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar concorrência");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "google" || photos !== null || photosLoading) return;
    setPhotosLoading(true);
    fetchPlacePhotos({ data: { name: row.title, city: row.address ?? "", address: row.address ?? "" } })
      .then((r) => setPhotos(r.photos))
      .catch(() => setPhotos([]))
      .finally(() => setPhotosLoading(false));
  }, [activeTab, photos, photosLoading, row.title, row.address]);

  useEffect(() => {
    if (activeTab !== "instagram" || instagram !== null || igLoading) return;
    setIgLoading(true);
    fetchInstagramProfile({ data: { name: row.title, city: row.address ?? "", website: row.website } })
      .then((r) => setInstagram(r))
      .catch(() => setInstagram(null))
      .finally(() => setIgLoading(false));
  }, [activeTab, instagram, igLoading, row.title, row.address, row.website]);

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all hover:shadow-lg",
      row.selected && "ring-2 ring-primary",
    )}>
      <div className={cn(
        "absolute inset-x-0 top-0 h-1",
        a.tier === "quente" && "bg-gradient-to-r from-emerald-500 to-teal-400",
        a.tier === "morno" && "bg-gradient-to-r from-amber-500 to-orange-400",
        a.tier === "frio" && "bg-gradient-to-r from-slate-400 to-slate-500",
      )} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <Checkbox checked={row.selected} onCheckedChange={(v) => onToggle(!!v)} className="mt-1" />
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{row.title}</CardTitle>
              {row.category && (
                <CardDescription className="mt-0.5 flex items-center gap-1 text-xs">
                  <Building2 className="h-3 w-3" /> {row.category}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-right">
              <div className="text-2xl font-bold leading-none tabular-nums">{a.score}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">score</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("gap-1", tier.className)}>
            <TierIcon className="h-3 w-3" /> {tier.label}
          </Badge>
          {row.rating != null && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {row.rating.toFixed(1)}
              {row.ratingCount != null && <span className="text-muted-foreground">({row.ratingCount})</span>}
            </Badge>
          )}
          {a.reviewsTier === "top" && <Badge variant="secondary" className="text-xs">🔥 Popular</Badge>}
          {a.reviewsTier === "novo" && <Badge variant="outline" className="text-xs">Novo no Google</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="google" className="text-xs">Google</TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs">Instagram</TabsTrigger>
            <TabsTrigger value="analise" className="text-xs">Análise</TabsTrigger>
            <TabsTrigger value="concorrentes" className="text-xs">Raio</TabsTrigger>
            <TabsTrigger value="enrich" className="text-xs">
              Dados {row.enrichment && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
            </TabsTrigger>
          </TabsList>


          <TabsContent value="google" className="mt-3 space-y-2">
            {/* Fotos reais do perfil (Google Images) */}
            <div className="relative overflow-hidden rounded-md border bg-muted aspect-video">
              {photosLoading && !photos && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Buscando fotos…
                </div>
              )}
              {photos && photos.length > 0 && (
                <img
                  src={photos[0].url}
                  alt={row.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              {photos && photos.length === 0 && !photosLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Sem fotos encontradas
                </div>
              )}
            </div>
            {photos && photos.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {photos.slice(1, 8).map((p, i) => (
                  <a key={i} href={p.source ?? p.url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                      src={p.thumb}
                      alt={p.title ?? row.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-14 w-20 rounded border object-cover hover:opacity-80 transition"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </a>
                ))}
              </div>
            )}
            {/* Mapa */}
            <div className="relative overflow-hidden rounded-md border bg-muted aspect-video">
              <iframe
                title={`Google Maps ${row.title}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  row.placeId ? `place_id:${row.placeId}` : `${row.title} ${row.address ?? ""}`,
                )}&z=16&output=embed`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="space-y-1.5 text-xs">
              {row.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{row.address}</span>
                </div>
              )}
              {row.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums">{row.phone}</span>
                </div>
              )}
              {site && (
                <a href={site} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate">{row.website}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 pt-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Abrir perfil completo no Google
              </a>
            </div>
          </TabsContent>

          <TabsContent value="instagram" className="mt-3 space-y-2">
            {igLoading && !instagram && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando perfil no Instagram…
              </div>
            )}
            {instagram && !instagram.found && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <Instagram className="mb-1 h-4 w-4" />
                Sem perfil público encontrado. Oportunidade de criar/otimizar presença.
              </div>
            )}
            {instagram && instagram.found && (
              <>
                <div className="flex items-center gap-3 rounded-md border p-2.5">
                  {instagram.avatar ? (
                    <img
                      src={`/api/ig-image?url=${encodeURIComponent(instagram.avatar)}`}
                      alt={instagram.handle ?? "ig"}
                      loading="lazy"
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Instagram className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 text-sm font-semibold">
                      <Instagram className="h-3.5 w-3.5 text-primary" />@{instagram.handle ?? "—"}
                      {instagram.isVerified && <Badge variant="secondary" className="h-4 px-1 text-[9px]">✓ Verificado</Badge>}
                      {instagram.isBusiness && <Badge variant="outline" className="h-4 px-1 text-[9px]">Business</Badge>}
                    </div>
                    {instagram.fullName && <div className="truncate text-xs text-muted-foreground">{instagram.fullName}</div>}
                    {instagram.category && <div className="truncate text-[11px] text-muted-foreground">📌 {instagram.category}</div>}
                    <div className="mt-1 flex gap-3 text-[11px] tabular-nums">
                      <span><strong>{instagram.posts ?? "–"}</strong> posts</span>
                      <span><strong>{instagram.followers ?? "–"}</strong> seg.</span>
                      <span><strong>{instagram.following ?? "–"}</strong> seguindo</span>
                    </div>
                  </div>
                </div>
                {instagram.bio && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">{instagram.bio}</div>
                )}
                {instagram.externalUrl && (
                  <a href={instagram.externalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline truncate">
                    <Globe className="h-3 w-3 shrink-0" /> {instagram.externalUrl}
                  </a>
                )}
                {instagram.recentPosts.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {instagram.recentPosts.slice(0, 9).map((p, i) => (
                      <a key={i} href={p.link ?? "#"} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded border bg-muted">
                        <img
                          src={`/api/ig-image?url=${encodeURIComponent(p.thumb)}`}
                          alt={`post ${i + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover hover:opacity-80 transition"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {instagram.url && (
                  <a href={instagram.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Abrir perfil no Instagram
                  </a>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="analise" className="mt-3 space-y-3">

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {a.signals.map((s) => (
                <div key={s.label} className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1",
                  s.ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : "border-border bg-muted/30 text-muted-foreground",
                )}>
                  {s.ok ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />}
                  <span className="truncate">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Reputação</span><span className="font-medium">{a.reviewsTier === "top" ? "Popular" : a.reviewsTier === "solido" ? "Sólida" : "Nova"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nota média</span><span className="font-medium tabular-nums">{row.rating?.toFixed(1) ?? "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reviews</span><span className="font-medium tabular-nums">{row.ratingCount ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span className="font-medium truncate max-w-[60%] text-right">{row.category ?? "–"}</span></div>
            </div>
          </TabsContent>

          <TabsContent value="concorrentes" className="mt-3 space-y-3">
            <div className="flex items-center gap-1.5">
              {([5, 10, 15] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={radius === r ? "default" : "outline"}
                  className="h-7 flex-1 text-xs"
                  onClick={() => { setRadius(r); if (!reports[r]) runCompetition(r); }}
                >
                  {r}km
                </Button>
              ))}
            </div>

            {reportLoading && !report && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Analisando concorrência no raio de {radius}km…
              </div>
            )}

            {!report && !reportLoading && (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                <Target className="mx-auto mb-1 h-4 w-4" />
                Selecione um raio para gerar o relatório de posicionamento vs concorrentes.
              </div>
            )}

            {report && (
              <>
                {/* Mapa com busca do segmento na região */}
                <div className="relative overflow-hidden rounded-md border bg-muted aspect-video">
                  <iframe
                    title={`Concorrentes ${radius}km`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${segment} perto de ${row.address}`)}&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}&output=embed`}
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                {/* Métricas principais */}
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div className="rounded-md border bg-muted/30 p-2 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Posição</div>
                    <div className="text-lg font-bold tabular-nums flex items-center justify-center gap-1">
                      {report.stats.targetPosition ? (
                        <>
                          {report.stats.targetPosition === 1 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                          {report.stats.targetPosition}º
                        </>
                      ) : "–"}
                      <span className="text-xs text-muted-foreground font-normal">/{report.stats.total}</span>
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Percentil</div>
                    <div className="text-lg font-bold tabular-nums">{report.stats.percentile != null ? `${report.stats.percentile}%` : "–"}</div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Reviews share</div>
                    <div className="text-lg font-bold tabular-nums">{report.stats.reviewsShare != null ? `${report.stats.reviewsShare}%` : "–"}</div>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Nota média (raio)</span><span className="font-medium tabular-nums">{report.stats.avgRating.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reviews média</span><span className="font-medium tabular-nums">{Math.round(report.stats.avgReviews)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total de reviews</span><span className="font-medium tabular-nums">{report.stats.totalReviews}</span></div>
                </div>

                {/* Insights */}
                {report.insights.length > 0 && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1">
                    <div className="font-medium text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> Insights</div>
                    {report.insights.map((ins, i) => (
                      <div key={i} className="text-foreground/80">• {ins}</div>
                    ))}
                  </div>
                )}

                {/* Ranking */}
                <div className="rounded-md border overflow-hidden">
                  <div className="bg-muted/40 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Ranking no raio de {radius}km
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {report.competitors.map((c, i) => (
                      <div key={c.placeId ?? `${c.title}-${i}`} className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-xs",
                        c.isTarget && "bg-primary/10 font-medium",
                      )}>
                        <span className="w-5 text-center tabular-nums text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate">{c.title}{c.isTarget && " (você)"}</span>
                        {c.rating != null && (
                          <span className="flex items-center gap-0.5 text-muted-foreground tabular-nums">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />{c.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="tabular-nums text-muted-foreground w-10 text-right">{c.ratingCount ?? 0}</span>
                        <span className="tabular-nums font-medium w-10 text-right">{c.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    const lines = [
                      `Relatório de Posicionamento — ${row.title}`,
                      `Segmento: ${segment} • Raio: ${radius}km`,
                      `Endereço: ${row.address}`,
                      "",
                      `Posição: ${report.stats.targetPosition ?? "fora do top"}/${report.stats.total}`,
                      `Percentil: ${report.stats.percentile ?? "–"}%`,
                      `Reviews share: ${report.stats.reviewsShare ?? "–"}%`,
                      `Nota média local: ${report.stats.avgRating.toFixed(1)} | Reviews média: ${Math.round(report.stats.avgReviews)}`,
                      "",
                      "Insights:",
                      ...report.insights.map((i) => `- ${i}`),
                      "",
                      "Ranking:",
                      ...report.competitors.map((c, i) => `${i + 1}. ${c.title}${c.isTarget ? " (VOCÊ)" : ""} — ${c.rating ?? "–"}⭐ (${c.ratingCount ?? 0}) score ${c.score}`),
                    ].join("\n");
                    navigator.clipboard.writeText(lines);
                    toast.success("Relatório copiado");
                  }}
                >
                  <Download className="mr-1 h-3 w-3" /> Copiar relatório
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="enrich" className="mt-3 space-y-2">


            {!row.enrichment && !row.enriching && (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Clique em <span className="font-medium">Analisar</span> para buscar CNPJ e decisores.
              </div>
            )}
            {row.enriching && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando CNPJ e decisor…
              </div>
            )}
            {row.enrichment && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {row.enrichment.cnpj_suggestions.length ? (
                    <select
                      className="flex-1 rounded border bg-background px-1.5 py-0.5 text-xs"
                      value={row.cnpj ?? ""}
                      onChange={(e) => onCnpjChange(e.target.value)}
                    >
                      {row.enrichment.cnpj_suggestions.map((s) => (
                        <option key={s.value} value={s.value}>{s.value}</option>
                      ))}
                    </select>
                  ) : <span className="text-xs text-muted-foreground italic">CNPJ não encontrado</span>}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {row.enrichment.decisor_suggestions.length ? (
                    <select
                      className="flex-1 rounded border bg-background px-1.5 py-0.5 text-xs"
                      value={row.decisor ?? ""}
                      onChange={(e) => onDecisorChange(e.target.value)}
                    >
                      {row.enrichment.decisor_suggestions.map((d) => (
                        <option key={d.url} value={d.name}>{d.name}{d.role ? ` — ${d.role}` : ""}</option>
                      ))}
                    </select>
                  ) : <span className="text-xs text-muted-foreground italic">Decisor não encontrado</span>}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-1">
          {!row.enrichment && !row.enriching && (
            <Button size="sm" variant="outline" className="flex-1" onClick={onEnrich}>
              <Sparkles className="mr-1 h-3 w-3" /> Analisar
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <a href={mapsUrl} target="_blank" rel="noreferrer" title="Abrir no Maps">
              <MapPin className="h-3 w-3" />
            </a>
          </Button>
          {row.phone && (
            <Button size="sm" variant="ghost" asChild>
              <a href={`https://wa.me/${row.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp">
                <MessageSquare className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
