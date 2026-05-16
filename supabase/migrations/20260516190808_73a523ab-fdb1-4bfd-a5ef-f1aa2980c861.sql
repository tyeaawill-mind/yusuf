CREATE TABLE public.account_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_name TEXT NOT NULL,
  site_url TEXT,
  username TEXT,
  password TEXT NOT NULL,
  notes TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault" ON public.account_vault FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vault" ON public.account_vault FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vault" ON public.account_vault FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own vault" ON public.account_vault FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_account_vault_updated_at
  BEFORE UPDATE ON public.account_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_account_vault_user ON public.account_vault(user_id);