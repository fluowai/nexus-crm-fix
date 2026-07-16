import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, MessageSquare, TrendingUp, CheckCircle2, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STAGES, useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexus360" }] }),
  component: Dashboard,
});

function Dashboard() {
  const leads = useStore((s) => s.leads);
  const messages = useStore((s) => s.messages);
  const campaigns = useStore((s) => s.campaigns);

  const totalLeads = leads.length;
  const withWpp = leads.filter((l) => l.has_whatsapp).length;
  const contacted = leads.filter((l) => ["contatado", "respondeu", "qualificado", "fechado"].includes(l.stage)).length;
  const won = leads.filter((l) => l.stage === "fechado").length;
  const outbound = messages.filter((m) => m.direction === "outbound").length;
  const responses = messages.filter((m) => m.direction === "inbound").length;
  const responseRate = outbound ? Math.round((responses / outbound) * 100) : 0;

  const stats = [
    { label: "Leads totais", value: totalLeads, icon: Users, hint: `${withWpp} com WhatsApp` },
    { label: "Mensagens enviadas", value: outbound, icon: MessageSquare, hint: `${responses} respostas` },
    { label: "Taxa de resposta", value: `${responseRate}%`, icon: TrendingUp, hint: `${contacted} contatados` },
    { label: "Negócios fechados", value: won, icon: CheckCircle2, hint: `${campaigns.filter((c) => c.status === "active").length} campanhas ativas` },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{s.label}</CardDescription>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Funil de leads</CardTitle>
              <CardDescription>Distribuição por estágio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {STAGES.map((s) => {
                const count = leads.filter((l) => l.stage === s.id).length;
                const pct = totalLeads ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${s.color}`} />
                        <span>{s.label}</span>
                      </div>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Campanhas</CardTitle>
                <CardDescription>Status atual</CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/campaigns">
                  Ver <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.city ?? "—"}</div>
                  </div>
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {messages
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
              .map((m) => {
                const lead = leads.find((l) => l.id === m.lead_id);
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">{lead?.name ?? "Lead"}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{m.body}</div>
                    </div>
                    <Badge variant={m.direction === "inbound" ? "default" : "secondary"}>
                      {m.direction === "inbound" ? "Recebida" : m.status}
                    </Badge>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
