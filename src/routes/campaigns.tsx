import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Play, Pause, Archive, Trash2, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { store, useStore, type CampaignStatus } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campanhas — Nexus360" }] }),
  component: CampaignsPage,
});

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: "bg-slate-500",
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  archived: "bg-zinc-500",
};

function CampaignsPage() {
  const campaigns = useStore((s) => s.campaigns);
  const leads = useStore((s) => s.leads);
  const [open, setOpen] = useState(false);

  return (
    <AppShell title="Campanhas" actions={<NewCampaignDialog open={open} onOpenChange={setOpen} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => {
          const count = leads.filter((l) => l.campaign_id === c.id).length;
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {c.city && <><MapPin className="h-3 w-3" /> {c.city}</>}
                    </CardDescription>
                  </div>
                  <Badge>
                    <span className={`mr-1 h-2 w-2 rounded-full ${STATUS_COLOR[c.status]}`} />
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.google_query && (
                  <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2 text-xs">
                    <Search className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{c.google_query}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Leads" value={count} />
                  <Stat label="Limite/dia" value={c.daily_send_limit} />
                  <Stat label="Janela" value={`${c.send_window_start}–${c.send_window_end}`} />
                </div>
                <div className="flex gap-2">
                  {c.status !== "active" ? (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { store.updateCampaign(c.id, { status: "active" }); toast.success("Campanha ativada"); }}>
                      <Play className="mr-1 h-3 w-3" /> Ativar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { store.updateCampaign(c.id, { status: "paused" }); toast.success("Campanha pausada"); }}>
                      <Pause className="mr-1 h-3 w-3" /> Pausar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => store.updateCampaign(c.id, { status: "archived" })}>
                    <Archive className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { store.deleteCampaign(c.id); toast.success("Excluída"); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function NewCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({
    name: "", city: "", google_query: "", daily_send_limit: 50,
    send_window_start: "09:00", send_window_end: "18:00",
  });

  const submit = () => {
    if (!form.name) return toast.error("Nome é obrigatório");
    store.addCampaign({
      name: form.name,
      city: form.city || null,
      google_query: form.google_query || null,
      daily_send_limit: Number(form.daily_send_limit),
      send_window_start: form.send_window_start,
      send_window_end: form.send_window_end,
      status: "draft",
    });
    toast.success("Campanha criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova campanha</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>Configure uma busca no Google e limites de envio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Query Google Places</Label>
            <Input value={form.google_query} onChange={(e) => setForm({ ...form, google_query: e.target.value })} placeholder="ex.: restaurantes em São Paulo" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Limite/dia</Label><Input type="number" value={form.daily_send_limit} onChange={(e) => setForm({ ...form, daily_send_limit: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Início</Label><Input type="time" value={form.send_window_start} onChange={(e) => setForm({ ...form, send_window_start: e.target.value })} /></div>
            <div className="space-y-1"><Label>Fim</Label><Input type="time" value={form.send_window_end} onChange={(e) => setForm({ ...form, send_window_end: e.target.value })} /></div>
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
