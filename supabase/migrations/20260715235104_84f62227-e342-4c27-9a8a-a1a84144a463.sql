
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.lead_stage AS ENUM (
  'novo', 'validado', 'contatado', 'respondeu', 'qualificado', 'fechado', 'perdido'
);

CREATE TYPE public.message_direction AS ENUM ('outbound', 'inbound');

CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');

CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'archived');

-- =========================
-- HELPER: updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- campaigns
-- =========================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  google_query TEXT,
  city TEXT,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  daily_send_limit INT NOT NULL DEFAULT 30,
  send_window_start TIME NOT NULL DEFAULT '09:00',
  send_window_end TIME NOT NULL DEFAULT '18:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_owner_idx ON public.campaigns(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_all_own" ON public.campaigns
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- leads
-- =========================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  place_id TEXT,
  name TEXT NOT NULL,
  phone_raw TEXT,
  phone_e164 TEXT,
  address TEXT,
  category TEXT,
  website TEXT,
  rating NUMERIC(2,1),
  has_whatsapp BOOLEAN,
  whatsapp_checked_at TIMESTAMPTZ,
  stage public.lead_stage NOT NULL DEFAULT 'novo',
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, place_id)
);

CREATE INDEX leads_owner_stage_idx ON public.leads(owner_id, stage);
CREATE INDEX leads_campaign_idx ON public.leads(campaign_id);
CREATE INDEX leads_next_action_idx ON public.leads(next_action_at) WHERE next_action_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_all_own" ON public.leads
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- message_templates
-- =========================
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  sequence_order INT NOT NULL DEFAULT 0,
  delay_days INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX message_templates_owner_idx ON public.message_templates(owner_id);
CREATE INDEX message_templates_campaign_idx ON public.message_templates(campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_all_own" ON public.message_templates
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER message_templates_set_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- messages
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  direction public.message_direction NOT NULL,
  body TEXT NOT NULL,
  status public.message_status NOT NULL DEFAULT 'queued',
  wpp_message_id TEXT,
  error TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_lead_idx ON public.messages(lead_id, created_at DESC);
CREATE INDEX messages_owner_idx ON public.messages(owner_id, created_at DESC);
CREATE INDEX messages_scheduled_idx ON public.messages(scheduled_for) WHERE scheduled_for IS NOT NULL AND status = 'queued';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_all_own" ON public.messages
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
