import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Phone, MapPin, Star, MessageSquare, Trash2, LayoutGrid, List } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES, store, useStore, type LeadStage } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Nexus360" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const leads = useStore((s) => s.leads);
  const campaigns = useStore((s) => s.campaigns);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");
  const [campaign, setCampaign] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (campaign !== "all" && l.campaign_id !== campaign) return false;
      if (q && !`${l.name} ${l.category} ${l.address}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [leads, q, campaign]);

  return (
    <AppShell
      title="Leads"
      actions={
        <>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <NewLeadDialog open={open} onOpenChange={setOpen} />
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, categoria ou endereço..." className="pl-9" />
        </div>
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} leads</Badge>
      </div>

      {view === "kanban" ? <KanbanView leads={filtered} /> : <ListView leads={filtered} />}
    </AppShell>
  );
}

function KanbanView({ leads }: { leads: ReturnType<typeof useStore<any>> }) {
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage) => {
        const items = leads.filter((l: any) => l.stage === stage.id);
        return (
          <div
            key={stage.id}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging) {
                store.updateLead(dragging, { stage: stage.id });
                toast.success(`Movido para ${stage.label}`);
                setDragging(null);
              }
            }}
          >
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                <span className="text-sm font-medium">{stage.label}</span>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {items.map((l: any) => (
                <Card
                  key={l.id}
                  draggable
                  onDragStart={() => setDragging(l.id)}
                  className="cursor-grab p-3 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.category}</div>
                    </div>
                    {l.has_whatsapp && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                        <MessageSquare className="mr-1 h-3 w-3" /> WA
                      </Badge>
                    )}
                  </div>
                  {l.rating != null && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {l.rating}
                    </div>
                  )}
                  {l.address && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{l.address}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ leads }: { leads: any[] }) {
  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-3">Nome</div>
        <div className="col-span-2">Telefone</div>
        <div className="col-span-3">Endereço</div>
        <div className="col-span-2">Estágio</div>
        <div className="col-span-1">WA</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>
      {leads.map((l) => (
        <div key={l.id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30">
          <div className="col-span-3">
            <div className="font-medium">{l.name}</div>
            <div className="text-xs text-muted-foreground">{l.category}</div>
          </div>
          <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {l.phone_raw ?? "—"}
          </div>
          <div className="col-span-3 truncate text-xs text-muted-foreground">{l.address}</div>
          <div className="col-span-2">
            <Select value={l.stage} onValueChange={(v) => store.updateLead(l.id, { stage: v as LeadStage })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            {l.has_whatsapp ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
          </div>
          <div className="col-span-1 text-right">
            <Button size="icon" variant="ghost" onClick={() => { store.deleteLead(l.id); toast.success("Lead removido"); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {leads.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</div>}
    </div>
  );
}

function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const campaigns = useStore((s) => s.campaigns);
  const [form, setForm] = useState({
    name: "", phone_raw: "", category: "", address: "", campaign_id: campaigns[0]?.id ?? "",
  });

  const submit = () => {
    if (!form.name) return toast.error("Nome é obrigatório");
    store.addLead({
      name: form.name,
      phone_raw: form.phone_raw || null,
      phone_e164: form.phone_raw ? form.phone_raw.replace(/\D/g, "") : null,
      category: form.category || null,
      address: form.address || null,
      campaign_id: form.campaign_id || null,
      website: null, rating: null, has_whatsapp: null, place_id: null,
      stage: "novo", notes: null, last_contacted_at: null,
    });
    toast.success("Lead criado");
    onOpenChange(false);
    setForm({ name: "", phone_raw: "", category: "", address: "", campaign_id: campaigns[0]?.id ?? "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Adicione um lead manualmente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone_raw} onChange={(e) => setForm({ ...form, phone_raw: e.target.value })} placeholder="(11) 99999-0000" /></div>
            <div className="space-y-1"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Campanha</Label>
            <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
