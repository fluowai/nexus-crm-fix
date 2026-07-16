import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, Loader2, Star, MapPin, Phone, Globe, Zap, Printer,
  Trophy, Target, Check, Building2, User, TrendingUp, TrendingDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  searchPlaces, analyzeCompetition, fetchPlacePhotos, analyzeKeywordRanking,
  type ProspectPlace, type CompetitionReport, type PlacePhoto, type KeywordRanking,
} from "@/lib/prospect.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Auditoria & Proposta — Nexus360" }] }),
  component: AuditPage,
});

type Radius = 5 | 10 | 15;

interface ProposalItem {
  id: string;
  label: string;
  desc: string;
  price: number;
  selected: boolean;
}

const DEFAULT_ITEMS: ProposalItem[] = [
  { id: "gmb", label: "Otimização do Perfil Google (SEO Local)", desc: "Categorias, descrição, palavras-chave, horários, atributos, produtos/serviços.", price: 897, selected: true },
  { id: "photos", label: "Sessão de Fotos Profissionais", desc: "Fotos internas, externas, equipe e produtos para o perfil.", price: 1200, selected: true },
  { id: "reviews", label: "Gestão de Reputação (3 meses)", desc: "Respostas a avaliações, campanhas de coleta e monitoramento.", price: 1490, selected: true },
  { id: "site", label: "Criação de Site Institucional", desc: "Site responsivo com WhatsApp, formulário e integração com o Google.", price: 2490, selected: true },
  { id: "ads", label: "Google Ads Local (setup + 1º mês)", desc: "Campanhas geolocalizadas para captação de clientes qualificados.", price: 990, selected: false },
  { id: "posts", label: "Postagens no Google Meu Negócio (mensal)", desc: "8 posts/mês com novidades, promoções e conteúdo relevante.", price: 690, selected: false },
];

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AuditPage() {
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<ProspectPlace[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<ProspectPlace | null>(null);
  const [radius, setRadius] = useState<Radius>(10);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CompetitionReport | null>(null);
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);

  const [keywordsInput, setKeywordsInput] = useState("");
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [rankLoading, setRankLoading] = useState(false);

  const [consultant, setConsultant] = useState("Nexus360 — Consultoria Digital");
  const [items, setItems] = useState<ProposalItem[]>(DEFAULT_ITEMS);
  const [notes, setNotes] = useState(
    "Proposta válida por 7 dias. Início em até 5 dias úteis após aprovação. Pagamento: 50% na assinatura + 50% na entrega.",
  );

  const search = async () => {
    if (!segment || !city) return toast.error("Informe segmento e cidade");
    setSearching(true);
    try {
      const q = name ? `${name} ${segment}` : segment;
      const { places } = await searchPlaces({ data: { segment: q, city, num: 20 } });
      setResults(places);
      if (!places.length) toast.info("Nenhum perfil encontrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setSearching(false);
    }
  };

  const runAudit = async (place: ProspectPlace) => {
    setSelected(place);
    setReport(null);
    setPhotos([]);
    setLoading(true);
    try {
      const [rep, ph] = await Promise.all([
        analyzeCompetition({
          data: {
            segment,
            address: place.address || city,
            targetName: place.title,
            targetPlaceId: place.placeId,
            radiusKm: radius,
          },
        }),
        fetchPlacePhotos({ data: { name: place.title, city, address: place.address } }),
      ]);
      setReport(rep);
      setPhotos(ph.photos);
      toast.success("Auditoria concluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setLoading(false);
    }
  };

  const total = items.filter((i) => i.selected).reduce((s, i) => s + i.price, 0);

  return (
    <AppShell
      title="Auditoria & Proposta"
      actions={
        report && (
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
        )
      }
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; }
          [data-sidebar], header { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Busca */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-base">1. Importar Perfil Google</CardTitle>
            <CardDescription>Busque o perfil do cliente para gerar auditoria competitiva e proposta.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Clínica Sorriso" />
            </div>
            <div className="space-y-1">
              <Label>Segmento</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="ex.: dentista" />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex.: São José / SC" />
            </div>
            <div className="flex items-end">
              <Button onClick={search} disabled={searching} className="w-full">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" /> Buscar</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {results.length > 0 && (
          <Card className="no-print">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">2. Selecione o perfil para auditar</CardTitle>
                <CardDescription>{results.length} resultados</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Raio</Label>
                <Select value={String(radius)} onValueChange={(v) => setRadius(Number(v) as Radius)}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="15">15 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {results.map((p) => (
                <button
                  key={p.placeId ?? p.title}
                  onClick={() => runAudit(p)}
                  className={cn(
                    "text-left rounded-lg border p-3 hover:border-primary hover:bg-accent transition",
                    selected?.placeId === p.placeId && "border-primary bg-accent",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.address}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {p.rating?.toFixed(1) ?? "–"} <span className="text-muted-foreground">({p.ratingCount ?? 0})</span>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Gerando auditoria...
          </div>
        )}

        {/* Relatório */}
        {report && selected && (
          <>
            {/* Configuração da proposta (não imprime) */}
            <Card className="no-print">
              <CardHeader>
                <CardTitle className="text-base">3. Personalize a Proposta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Consultor / Agência</Label>
                    <Input value={consultant} onChange={(e) => setConsultant(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Condições comerciais</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Serviços incluídos</Label>
                  {items.map((it, idx) => (
                    <div key={it.id} className="flex items-center gap-3 rounded-md border p-2">
                      <Checkbox
                        checked={it.selected}
                        onCheckedChange={(v) =>
                          setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, selected: !!v } : x)))
                        }
                      />
                      <Input
                        value={it.label}
                        onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={it.price}
                        onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))}
                        className="w-28"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* RELATÓRIO IMPRIMÍVEL */}
            <div className="print-area space-y-6 rounded-xl border bg-card p-6 shadow-sm md:p-10">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-bold tracking-tight">Nexus360</div>
                    <div className="text-xs text-muted-foreground">{consultant}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Auditoria Digital & Proposta Comercial</div>
                  <div>{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                </div>
              </div>

              {/* Cliente */}
              <section className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Cliente Auditado</div>
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  {photos[0] && (
                    <img
                      src={photos[0].url}
                      alt={selected.title}
                      className="h-32 w-32 rounded-lg object-cover ring-1 ring-border"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <h2 className="text-2xl font-bold">{selected.title}</h2>
                    {selected.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{selected.address}</div>}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {selected.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.phone}</span>}
                      {selected.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{selected.website}</span>}
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{selected.rating?.toFixed(1) ?? "–"} • {selected.ratingCount ?? 0} avaliações</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Diagnóstico */}
              <section className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Diagnóstico do Perfil</div>
                <div className="grid gap-2 md:grid-cols-4">
                  <MetricBox
                    icon={<Trophy className="h-4 w-4" />}
                    label={`Posição no raio ${report.radiusKm}km`}
                    value={report.stats.targetPosition ? `${report.stats.targetPosition}º de ${report.stats.total}` : "Fora do top"}
                  />
                  <MetricBox icon={<Target className="h-4 w-4" />} label="Percentil" value={report.stats.percentile != null ? `${report.stats.percentile}%` : "–"} />
                  <MetricBox icon={<Star className="h-4 w-4" />} label="Nota média local" value={report.stats.avgRating.toFixed(1)} />
                  <MetricBox icon={<Building2 className="h-4 w-4" />} label="Share de reviews" value={report.stats.reviewsShare != null ? `${report.stats.reviewsShare}%` : "–"} />
                </div>
                <ul className="space-y-1 text-sm">
                  {report.insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {ins}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Mapa da região */}
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Mapa Competitivo — Raio {report.radiusKm}km</div>
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border">
                  <iframe
                    title="mapa"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${segment} perto de ${selected.address || city}`)}&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}&output=embed`}
                    className="h-full w-full border-0"
                    loading="lazy"
                  />
                </div>
              </section>

              {/* Ranking */}
              <section className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ranking de Concorrentes</div>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Empresa</th>
                        <th className="p-2 text-right">Nota</th>
                        <th className="p-2 text-right">Reviews</th>
                        <th className="p-2 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.competitors.slice(0, 10).map((c, i) => (
                        <tr key={c.placeId ?? i} className={cn("border-t", c.isTarget && "bg-primary/10 font-semibold")}>
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2">{c.title}{c.isTarget && <Badge className="ml-2" variant="default">Você</Badge>}</td>
                          <td className="p-2 text-right">{c.rating?.toFixed(1) ?? "–"}</td>
                          <td className="p-2 text-right">{c.ratingCount ?? 0}</td>
                          <td className="p-2 text-right">{c.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Proposta */}
              <section className="space-y-3 border-t pt-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Proposta Comercial</div>
                <h3 className="text-xl font-bold">Plano de Ação Recomendado</h3>
                <p className="text-sm text-muted-foreground">
                  Com base no diagnóstico acima, recomendamos o seguinte plano para elevar a posição de{" "}
                  <strong>{selected.title}</strong> no ranking local e aumentar a captação de clientes via Google.
                </p>
                <div className="space-y-2">
                  {items.filter((i) => i.selected).map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-medium">{it.label}</div>
                          <div className="text-xs text-muted-foreground">{it.desc}</div>
                        </div>
                      </div>
                      <div className="shrink-0 font-semibold">{money(it.price)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary p-4 text-primary-foreground">
                  <div>
                    <div className="text-xs opacity-80">Investimento total</div>
                    <div className="text-2xl font-bold">{money(total)}</div>
                  </div>
                  <div className="text-right text-xs opacity-90 max-w-[60%]">{notes}</div>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-4 text-center text-xs text-muted-foreground">
                Relatório gerado por Nexus360 • {new Date().toLocaleString("pt-BR")}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
