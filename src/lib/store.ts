// Simple client-side store with localStorage persistence.
// Frontend-only mock — later swap for real Supabase / API calls.
import { useSyncExternalStore } from "react";

export type LeadStage =
  | "novo"
  | "validado"
  | "contatado"
  | "respondeu"
  | "qualificado"
  | "fechado"
  | "perdido";

export const STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: "novo", label: "Novo", color: "bg-slate-500" },
  { id: "validado", label: "Validado", color: "bg-blue-500" },
  { id: "contatado", label: "Contatado", color: "bg-indigo-500" },
  { id: "respondeu", label: "Respondeu", color: "bg-violet-500" },
  { id: "qualificado", label: "Qualificado", color: "bg-amber-500" },
  { id: "fechado", label: "Fechado", color: "bg-emerald-500" },
  { id: "perdido", label: "Perdido", color: "bg-rose-500" },
];

export type CampaignStatus = "draft" | "active" | "paused" | "archived";

export interface Campaign {
  id: string;
  name: string;
  city: string | null;
  google_query: string | null;
  daily_send_limit: number;
  send_window_start: string;
  send_window_end: string;
  status: CampaignStatus;
  created_at: string;
}

export interface Lead {
  id: string;
  campaign_id: string | null;
  name: string;
  phone_e164: string | null;
  phone_raw: string | null;
  address: string | null;
  category: string | null;
  website: string | null;
  rating: number | null;
  has_whatsapp: boolean | null;
  place_id: string | null;
  stage: LeadStage;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  campaign_id: string | null;
  name: string;
  body: string;
  sequence_order: number;
  delay_days: number;
  created_at: string;
}

export interface Message {
  id: string;
  lead_id: string;
  template_id: string | null;
  direction: "outbound" | "inbound";
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Session {
  email: string;
  name: string;
}

interface State {
  session: Session | null;
  wpp_connected: boolean;
  campaigns: Campaign[];
  leads: Lead[];
  templates: Template[];
  messages: Message[];
}

const KEY = "nexus360:v1";

const seed: State = {
  session: null,
  wpp_connected: false,
  campaigns: [
    {
      id: "c1",
      name: "Restaurantes SP",
      city: "São Paulo",
      google_query: "restaurantes em São Paulo",
      daily_send_limit: 80,
      send_window_start: "09:00",
      send_window_end: "18:00",
      status: "active",
      created_at: new Date().toISOString(),
    },
    {
      id: "c2",
      name: "Clínicas Odonto RJ",
      city: "Rio de Janeiro",
      google_query: "clínica odontológica Rio de Janeiro",
      daily_send_limit: 50,
      send_window_start: "10:00",
      send_window_end: "17:00",
      status: "draft",
      created_at: new Date().toISOString(),
    },
  ],
  leads: [
    { id: "l1", campaign_id: "c1", name: "Cantina Bella Napoli", phone_e164: "+5511999990001", phone_raw: "(11) 99999-0001", address: "R. Augusta, 100 - São Paulo", category: "Restaurante italiano", website: "bellanapoli.com.br", rating: 4.6, has_whatsapp: true, place_id: "p1", stage: "validado", notes: null, last_contacted_at: null, created_at: new Date().toISOString() },
    { id: "l2", campaign_id: "c1", name: "Sushi Yamada", phone_e164: "+5511999990002", phone_raw: "(11) 99999-0002", address: "Al. Santos, 500 - São Paulo", category: "Restaurante japonês", website: null, rating: 4.8, has_whatsapp: true, place_id: "p2", stage: "contatado", notes: "Interessado, retornar terça", last_contacted_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "l3", campaign_id: "c1", name: "Boteco do Zé", phone_e164: "+5511999990003", phone_raw: "(11) 99999-0003", address: "R. Aspicuelta, 30 - São Paulo", category: "Bar", website: null, rating: 4.2, has_whatsapp: false, place_id: "p3", stage: "novo", notes: null, last_contacted_at: null, created_at: new Date().toISOString() },
    { id: "l4", campaign_id: "c1", name: "Pizzaria Braz", phone_e164: "+5511999990004", phone_raw: "(11) 99999-0004", address: "R. Grauna, 125 - São Paulo", category: "Pizzaria", website: "braz.com.br", rating: 4.7, has_whatsapp: true, place_id: "p4", stage: "respondeu", notes: "Pediu proposta", last_contacted_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "l5", campaign_id: "c1", name: "Padaria Bella Paulista", phone_e164: "+5511999990005", phone_raw: "(11) 99999-0005", address: "R. Haddock Lobo, 354 - São Paulo", category: "Padaria", website: null, rating: 4.5, has_whatsapp: true, place_id: "p5", stage: "qualificado", notes: null, last_contacted_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "l6", campaign_id: "c1", name: "Churrascaria Fogo", phone_e164: "+5511999990006", phone_raw: "(11) 99999-0006", address: "Av. Paulista, 2000 - São Paulo", category: "Churrascaria", website: "fogo.com.br", rating: 4.9, has_whatsapp: true, place_id: "p6", stage: "fechado", notes: "Contrato assinado", last_contacted_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: "l7", campaign_id: "c1", name: "Café Girondino", phone_e164: "+5511999990007", phone_raw: "(11) 99999-0007", address: "R. Boa Vista, 365 - São Paulo", category: "Café", website: null, rating: 4.3, has_whatsapp: true, place_id: "p7", stage: "perdido", notes: "Sem interesse", last_contacted_at: new Date().toISOString(), created_at: new Date().toISOString() },
  ],
  templates: [
    { id: "t1", campaign_id: "c1", name: "Abertura", body: "Olá {{nome}}! Vi o {{negocio}} no Google e queria falar rapidinho sobre como podemos ajudar a trazer mais clientes. Posso mandar mais detalhes?", sequence_order: 1, delay_days: 0, created_at: new Date().toISOString() },
    { id: "t2", campaign_id: "c1", name: "Follow-up 1", body: "Oi {{nome}}, tudo bem? Só passando pra saber se conseguiu ver minha mensagem sobre o {{negocio}}!", sequence_order: 2, delay_days: 3, created_at: new Date().toISOString() },
    { id: "t3", campaign_id: "c1", name: "Follow-up 2", body: "Última mensagem por aqui — caso queira, posso te enviar um case de sucesso de outro {{categoria}} que atendemos.", sequence_order: 3, delay_days: 7, created_at: new Date().toISOString() },
  ],
  messages: [
    { id: "m1", lead_id: "l2", template_id: "t1", direction: "outbound", body: "Olá Sushi Yamada! ...", status: "delivered", scheduled_for: null, sent_at: new Date(Date.now() - 3600e3).toISOString(), created_at: new Date().toISOString() },
    { id: "m2", lead_id: "l2", template_id: null, direction: "inbound", body: "Oi! Pode mandar mais detalhes.", status: "delivered", scheduled_for: null, sent_at: new Date(Date.now() - 1800e3).toISOString(), created_at: new Date().toISOString() },
    { id: "m3", lead_id: "l4", template_id: "t1", direction: "outbound", body: "Olá Pizzaria Braz! ...", status: "read", scheduled_for: null, sent_at: new Date(Date.now() - 7200e3).toISOString(), created_at: new Date().toISOString() },
    { id: "m4", lead_id: "l6", template_id: "t1", direction: "outbound", body: "Olá Churrascaria Fogo! ...", status: "read", scheduled_for: null, sent_at: new Date(Date.now() - 86400e3).toISOString(), created_at: new Date().toISOString() },
  ],
};

function load(): State {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed;
    return { ...seed, ...JSON.parse(raw) };
  } catch {
    return seed;
  }
}

let state: State = seed;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  persist();
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  init: () => {
    state = load();
    listeners.forEach((l) => l());
  },
  signIn: (email: string) => set({ session: { email, name: email.split("@")[0] } }),
  signOut: () => set({ session: null }),
  connectWpp: (v: boolean) => set({ wpp_connected: v }),
  addCampaign: (c: Omit<Campaign, "id" | "created_at">) =>
    set((s) => ({ campaigns: [...s.campaigns, { ...c, id: crypto.randomUUID(), created_at: new Date().toISOString() }] })),
  updateCampaign: (id: string, patch: Partial<Campaign>) =>
    set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  deleteCampaign: (id: string) => set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),
  addLead: (l: Omit<Lead, "id" | "created_at">) =>
    set((s) => ({ leads: [...s.leads, { ...l, id: crypto.randomUUID(), created_at: new Date().toISOString() }] })),
  updateLead: (id: string, patch: Partial<Lead>) =>
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
  deleteLead: (id: string) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),
  addTemplate: (t: Omit<Template, "id" | "created_at">) =>
    set((s) => ({ templates: [...s.templates, { ...t, id: crypto.randomUUID(), created_at: new Date().toISOString() }] })),
  updateTemplate: (id: string, patch: Partial<Template>) =>
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  deleteTemplate: (id: string) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
  addMessage: (m: Omit<Message, "id" | "created_at">) =>
    set((s) => ({ messages: [...s.messages, { ...m, id: crypto.randomUUID(), created_at: new Date().toISOString() }] })),
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(seed),
  );
}
