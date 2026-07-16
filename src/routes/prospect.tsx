import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Sparkles, Download, Loader2, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchPlaces, enrichLead, type ProspectPlace, type EnrichResult } from "@/lib/prospect.functions";
import { store, useStore } from "@/lib/store";
import { toast } from "sonner";

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
        notes: [
          r.cnpj ? `CNPJ: ${r.cnpj}` : null,
          r.decisor ? `Decisor: ${r.decisor}` : null,
        ].filter(Boolean).join(" • ") || null,
        last_contacted_at: null,
      });
    }
    toast.success(`${selected.length} leads importados`);
    setRows((rs) => rs.map((r) => (r.selected ? { ...r, selected: false } : r)));
  };

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <AppShell title="Prospectar Leads">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar no Google (Serper)</CardTitle>
            <CardDescription>Digite o segmento e a cidade para importar do Google Meu Negócio</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_120px_1fr_auto]">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{rows.length} resultados</CardTitle>
                <CardDescription>{selectedCount} selecionados</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={enrichSelected} disabled={!selectedCount}>
                  <Sparkles className="mr-1 h-3 w-3" /> Enriquecer selecionados
                </Button>
                <Button size="sm" onClick={importSelected} disabled={!selectedCount}>
                  <Download className="mr-1 h-3 w-3" /> Importar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, selected: !!v })))}
                      />
                    </th>
                    <th className="p-2">Empresa</th>
                    <th className="p-2">Telefone</th>
                    <th className="p-2">Categoria</th>
                    <th className="p-2">Rating</th>
                    <th className="p-2">CNPJ</th>
                    <th className="p-2">Decisor</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.placeId ?? i}`} className="border-b align-top">
                      <td className="p-2">
                        <Checkbox
                          checked={r.selected}
                          onCheckedChange={(v) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, selected: !!v } : row))}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.address}</div>
                        {r.website && (
                          <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                            {r.website} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap">{r.phone ?? "—"}</td>
                      <td className="p-2">{r.category ?? "—"}</td>
                      <td className="p-2">{r.rating != null ? <Badge variant="secondary">{r.rating}</Badge> : "—"}</td>
                      <td className="p-2">
                        {r.enrichment?.cnpj_suggestions.length ? (
                          <select
                            className="rounded border bg-background px-1 py-0.5 text-xs"
                            value={r.cnpj ?? ""}
                            onChange={(e) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, cnpj: e.target.value } : row))}
                          >
                            {r.enrichment.cnpj_suggestions.map((s) => (
                              <option key={s.value} value={s.value}>{s.value}</option>
                            ))}
                          </select>
                        ) : r.enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2">
                        {r.enrichment?.decisor_suggestions.length ? (
                          <select
                            className="rounded border bg-background px-1 py-0.5 text-xs max-w-[160px]"
                            value={r.decisor ?? ""}
                            onChange={(e) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, decisor: e.target.value } : row))}
                          >
                            {r.enrichment.decisor_suggestions.map((d) => (
                              <option key={d.url} value={d.name}>{d.name}{d.role ? ` (${d.role})` : ""}</option>
                            ))}
                          </select>
                        ) : r.enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2">
                        {!r.enrichment && !r.enriching && (
                          <Button size="sm" variant="ghost" onClick={() => enrichRow(i)}>
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
