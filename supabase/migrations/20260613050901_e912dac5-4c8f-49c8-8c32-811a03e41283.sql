
-- Preferences
CREATE TABLE public.briefing_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sources text[] NOT NULL DEFAULT ARRAY[
    'prothomalo.com','thedailystar.net','banglatribune.com','jugantor.com','kalerkantho.com',
    'bdnews24.com','dhakatribune.com','newagebd.net','samakal.com','mzamin.com',
    'dailyinqilab.com','dailyjanakantha.com','dailysangram.com','amadershomoy.com','bhorerkagoj.com'
  ],
  topics text[] NOT NULL DEFAULT ARRAY[
    'corruption','দুর্নীতি','ঘুষ','bribery','money laundering','অর্থ পাচার','hundi',
    'bank loan default','খেলাপি ঋণ','ACC','দুদক','financial irregularities','আর্থিক অনিয়ম','embezzlement','আত্মসাৎ'
  ],
  language text NOT NULL DEFAULT 'auto' CHECK (language IN ('en','bn','auto')),
  timezone text NOT NULL DEFAULT 'Asia/Dhaka',
  max_items integer NOT NULL DEFAULT 10 CHECK (max_items BETWEEN 1 AND 25),
  email_delivery boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_preferences TO authenticated;
GRANT ALL ON public.briefing_preferences TO service_role;
ALTER TABLE public.briefing_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs select" ON public.briefing_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.briefing_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.briefing_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs delete" ON public.briefing_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_briefing_preferences_updated_at
  BEFORE UPDATE ON public.briefing_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Briefings
CREATE TABLE public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('morning','afternoon','manual')),
  local_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  intro text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot, local_date)
);
CREATE INDEX briefings_user_created_idx ON public.briefings (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own briefings select" ON public.briefings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own briefings insert" ON public.briefings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own briefings update" ON public.briefings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own briefings delete" ON public.briefings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_briefings_updated_at
  BEFORE UPDATE ON public.briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
