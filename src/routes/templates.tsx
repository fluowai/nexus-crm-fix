import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { store, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Nexus360" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const templates = useStore((s) => s.templates);
  const campaigns = useStore((s) => s.campaigns);
  const [open, setOpen] = useState(false);

  const grouped = templates
    .slice()
    .sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <AppShell title="Templates de mensagem" actions={<NewTemplateDialog open={open} onOpenChange={setOpen} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {grouped.map((t) => {
          const camp = campaigns.find((c) => c.id === t.campaign_id);
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription>{camp?.name ?? "Sem campanha"}</CardDescription>
                  </div>
                  <Badge variant="secondary">#{t.sequence_order}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{t.body}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Delay: {t.delay_days} dias</span>
                  <Button size="icon" variant="ghost" onClick={() => { store.deleteTemplate(t.id); toast.success("Removido"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {templates.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum template ainda. Crie o primeiro para começar sua cadência.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function NewTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const campaigns = useStore((s) => s.campaigns);
  const [form, setForm] = useState({
    name: "", body: "", sequence_order: 1, delay_days: 0, campaign_id: campaigns[0]?.id ?? "",
  });

  const submit = () => {
    if (!form.name || !form.body) return toast.error("Nome e corpo são obrigatórios");
    store.addTemplate({
      name: form.name,
      body: form.body,
      sequence_order: Number(form.sequence_order),
      delay_days: Number(form.delay_days),
      campaign_id: form.campaign_id || null,
    });
    toast.success("Template criado");
    onOpenChange(false);
    setForm({ name: "", body: "", sequence_order: 1, delay_days: 0, campaign_id: campaigns[0]?.id ?? "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo template</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo template</DialogTitle>
          <DialogDescription>Use variáveis como {"{{nome}}"}, {"{{negocio}}"} e {"{{categoria}}"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Corpo da mensagem</Label>
            <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Olá {{nome}}!" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Ordem</Label><Input type="number" min={1} value={form.sequence_order} onChange={(e) => setForm({ ...form, sequence_order: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Delay (dias)</Label><Input type="number" min={0} value={form.delay_days} onChange={(e) => setForm({ ...form, delay_days: Number(e.target.value) })} /></div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
