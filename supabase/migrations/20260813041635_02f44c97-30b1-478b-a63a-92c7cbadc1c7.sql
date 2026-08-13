CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  purpose text NOT NULL,
  discretion_view text,
  legal_view text,
  referral_view text,
  recommendation text NOT NULL DEFAULT 'review',
  status text NOT NULL DEFAULT 'pending',
  decision_token text NOT NULL UNIQUE,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX access_requests_email_key ON public.access_requests (lower(email));
GRANT SELECT ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own access request" ON public.access_requests FOR SELECT TO authenticated USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE TRIGGER update_access_requests_updated_at BEFORE UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();