import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Zap, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { store } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Entrar — Nexus360 CRM" },
      { name: "description", content: "Acesse sua conta Nexus360." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@nexus360.app");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    store.init();
    if (store.get().session) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      store.signIn(email);
      toast.success("Bem-vindo!");
      navigate({ to: "/dashboard" });
    }, 400);
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/60 p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/10">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Nexus360</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Prospecção autônoma no WhatsApp, do lead ao fechamento.
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/80">
            Puxe leads do Google Maps, valide se têm WhatsApp e dispare cadências inteligentes — tudo em um só lugar.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>• Coleta automática via Google Places</li>
            <li>• Validação de WhatsApp em massa</li>
            <li>• Agente autônomo com janelas de envio</li>
            <li>• Kanban de leads e templates personalizáveis</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">© 2026 Nexus360 CRM</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Use qualquer email para acessar a demo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo frontend — dados salvos localmente.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
