CREATE TABLE public.user_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  user_email text,
  display_name text,
  choice text,
  vulnerability text,
  ambition text,
  social_currencies text,
  courage text,
  integrity text,
  motivation text,
  iq text,
  sneaky_techniques text,
  summary text,
  confidence text NOT NULL DEFAULT 'low',
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_dossiers TO authenticated;
GRANT ALL ON public.user_dossiers TO service_role;

ALTER TABLE public.user_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views all dossiers"
ON public.user_dossiers
FOR SELECT
TO authenticated
USING (lower(COALESCE(auth.jwt() ->> 'email', '')) = 'tyeaawill@gmail.com');

CREATE TRIGGER update_user_dossiers_updated_at
BEFORE UPDATE ON public.user_dossiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();