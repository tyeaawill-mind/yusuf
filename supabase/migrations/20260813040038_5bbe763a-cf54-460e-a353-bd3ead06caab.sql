DROP POLICY IF EXISTS "Users view own vault" ON public.account_vault;
DROP POLICY IF EXISTS "Users insert own vault" ON public.account_vault;
DROP POLICY IF EXISTS "Users update own vault" ON public.account_vault;
DROP POLICY IF EXISTS "Users delete own vault" ON public.account_vault;

REVOKE ALL ON public.account_vault FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_vault TO authenticated;
GRANT ALL ON public.account_vault TO service_role;

CREATE POLICY "Users view own vault" ON public.account_vault FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vault" ON public.account_vault FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vault" ON public.account_vault FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vault" ON public.account_vault FOR DELETE TO authenticated USING (auth.uid() = user_id);