
CREATE TABLE public.investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_summary text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investigations_user_id_idx ON public.investigations(user_id, created_at DESC);
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own investigations" ON public.investigations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own investigations" ON public.investigations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own investigations" ON public.investigations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own investigations" ON public.investigations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.investigation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  note_type text DEFAULT 'manual',
  source_scan_id uuid REFERENCES public.scans(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inv_notes_investigation_id_idx ON public.investigation_notes(investigation_id);
ALTER TABLE public.investigation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notes" ON public.investigation_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.investigation_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.investigation_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.investigation_notes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.osint_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module text NOT NULL,
  status text NOT NULL,
  result_json jsonb,
  finding_count integer DEFAULT 0,
  severity_max text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX osint_results_scan_id_idx ON public.osint_results(scan_id);
ALTER TABLE public.osint_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own osint results" ON public.osint_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own osint results" ON public.osint_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own osint results" ON public.osint_results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own osint results" ON public.osint_results FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_user_id_idx ON public.audit_events(user_id, created_at DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own audit events" ON public.audit_events FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.scan_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  scan_count_today integer NOT NULL DEFAULT 0,
  last_scan_at timestamptz,
  reset_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
ALTER TABLE public.scan_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rate limit" ON public.scan_rate_limits FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_investigation_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_investigations_touch
BEFORE UPDATE ON public.investigations
FOR EACH ROW EXECUTE FUNCTION public.touch_investigation_updated_at();
