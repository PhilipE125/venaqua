-- Plan per user; set by the Venaqua team only (no user write access).
CREATE TABLE public.workspace_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'market_access' CHECK (plan IN ('market_access','portfolio','data_api')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspace_plans TO authenticated;
GRANT ALL ON public.workspace_plans TO service_role;
ALTER TABLE public.workspace_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan" ON public.workspace_plans FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.project_limit(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE COALESCE((SELECT plan FROM public.workspace_plans WHERE user_id = _user_id), 'market_access')
    WHEN 'market_access' THEN 10 WHEN 'portfolio' THEN 25 ELSE 100 END
$$;

CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.reuse_projects WHERE user_id = NEW.user_id) >= public.project_limit(NEW.user_id) THEN
    RAISE EXCEPTION 'PROJECT_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reuse_projects_limit BEFORE INSERT ON public.reuse_projects FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();

-- Alerts
CREATE TABLE public.project_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  text text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.project_alerts TO authenticated;
GRANT ALL ON public.project_alerts TO service_role;
ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own alerts" ON public.project_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own alerts" ON public.project_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own alerts" ON public.project_alerts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.project_change_alerts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.project_alerts(user_id, project_id, text) VALUES (NEW.user_id, NEW.id, NEW.name || ' moved to "' || NEW.stage || '"');
  END IF;
  IF jsonb_array_length(COALESCE(NEW.evidence,'[]'::jsonb)) > jsonb_array_length(COALESCE(OLD.evidence,'[]'::jsonb)) THEN
    INSERT INTO public.project_alerts(user_id, project_id, text) VALUES (NEW.user_id, NEW.id, 'New evidence logged on ' || NEW.name);
  END IF;
  IF NEW.owner_name IS DISTINCT FROM OLD.owner_name AND NEW.owner_name <> '' THEN
    INSERT INTO public.project_alerts(user_id, project_id, text) VALUES (NEW.user_id, NEW.id, NEW.name || ' is now owned by ' || NEW.owner_name);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reuse_projects_alerts AFTER UPDATE ON public.reuse_projects FOR EACH ROW EXECUTE FUNCTION public.project_change_alerts();

-- Custom scoring weights
CREATE TABLE public.scoring_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  volume_weight numeric NOT NULL DEFAULT 1 CHECK (volume_weight BETWEEN 0 AND 3),
  stress_weight numeric NOT NULL DEFAULT 1 CHECK (stress_weight BETWEEN 0 AND 3),
  distance_weight numeric NOT NULL DEFAULT 1 CHECK (distance_weight BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scoring_preferences TO authenticated;
GRANT ALL ON public.scoring_preferences TO service_role;
ALTER TABLE public.scoring_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scoring" ON public.scoring_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Private data layers
CREATE TABLE public.private_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('demand','supply')),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  volume_m3_day numeric NOT NULL DEFAULT 0 CHECK (volume_m3_day >= 0),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_sites TO authenticated;
GRANT ALL ON public.private_sites TO service_role;
ALTER TABLE public.private_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sites" ON public.private_sites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- API keys (only a hash is stored)
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own keys" ON public.api_keys FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users revoke own keys" ON public.api_keys FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());