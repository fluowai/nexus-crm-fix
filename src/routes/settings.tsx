import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QrCode, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { store, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — Nexus360" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const session = useStore((s) => s.session);
  const connected = useStore((s) => s.wpp_connected);
  const [gmapsKey, setGmapsKey] = useState("");
  const [wppUrl, setWppUrl] = useState("http://nexus-wpp:8080");

  return (
    <AppShell title="Configurações">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
            <CardDescription>Informações da conta</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label>Nome</Label><Input defaultValue={session?.name ?? ""} /></div>
            <div className="space-y-1"><Label>Email</Label><Input defaultValue={session?.email ?? ""} disabled /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Conexão WhatsApp</CardTitle>
                <CardDescription>Bridge Whatsmeow (nexus-wpp)</CardDescription>
              </div>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                {connected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>URL do serviço</Label>
              <Input value={wppUrl} onChange={(e) => setWppUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Endereço interno do container Go que roda Whatsmeow.</p>
            </div>
            {!connected ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <div className="flex h-40 w-40 items-center justify-center rounded-md border-2 border-dashed bg-muted/50">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Escaneie o QR Code no WhatsApp para conectar.</p>
                <Button onClick={() => { store.connectWpp(true); toast.success("WhatsApp conectado"); }}>
                  Simular conexão
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border bg-emerald-500/5 p-3">
                <div>
                  <div className="text-sm font-medium">WhatsApp ativo</div>
                  <div className="text-xs text-muted-foreground">Pronto para enviar mensagens</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { store.connectWpp(false); toast.success("Desconectado"); }}>
                  Desconectar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google Places API</CardTitle>
            <CardDescription>Usada para importar leads do Google Maps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input type="password" value={gmapsKey} onChange={(e) => setGmapsKey(e.target.value)} placeholder="AIza..." />
            </div>
            <Button variant="outline" onClick={() => toast.success("Chave salva")}>Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Limpar dados locais</div>
                <div className="text-xs text-muted-foreground">Remove leads, campanhas, templates e mensagens deste dispositivo.</div>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  localStorage.removeItem("nexus360:v1");
                  location.reload();
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
