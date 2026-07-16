import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Send, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { store, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Mensagens — Nexus360" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const leads = useStore((s) => s.leads);
  const messages = useStore((s) => s.messages);
  const [selected, setSelected] = useState<string | null>(leads[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [body, setBody] = useState("");

  const leadsWithMessages = useMemo(() => {
    return leads
      .filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
      .map((l) => {
        const msgs = messages.filter((m) => m.lead_id === l.id);
        const last = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return { lead: l, last, count: msgs.length };
      })
      .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
  }, [leads, messages, q]);

  const thread = messages
    .filter((m) => m.lead_id === selected)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const currentLead = leads.find((l) => l.id === selected);

  const send = () => {
    if (!body.trim() || !selected) return;
    store.addMessage({
      lead_id: selected, template_id: null, direction: "outbound", body, status: "sent",
      scheduled_for: null, sent_at: new Date().toISOString(),
    });
    setBody("");
    toast.success("Mensagem enviada");
  };

  return (
    <AppShell title="Mensagens">
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa..." className="pl-9" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {leadsWithMessages.map(({ lead, last, count }) => (
              <button
                key={lead.id}
                onClick={() => setSelected(lead.id)}
                className={`flex w-full gap-3 border-b p-3 text-left transition-colors hover:bg-muted/50 ${
                  selected === lead.id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{lead.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{lead.name}</span>
                    {count > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{count}</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{last?.body ?? "Sem mensagens"}</div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {currentLead ? (
            <>
              <div className="flex items-center gap-3 border-b p-3">
                <Avatar><AvatarFallback>{currentLead.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <div className="text-sm font-semibold">{currentLead.name}</div>
                  <div className="text-xs text-muted-foreground">{currentLead.phone_raw ?? "sem telefone"}</div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {thread.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className={`mt-1 text-[10px] ${m.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.sent_at ?? m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {thread.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>}
                </div>
              </ScrollArea>
              <div className="flex gap-2 border-t p-3">
                <Textarea
                  rows={1}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  className="min-h-[40px] resize-none"
                />
                <Button onClick={send}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
