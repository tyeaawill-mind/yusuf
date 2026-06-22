ALTER TABLE public.briefings DROP CONSTRAINT IF EXISTS briefings_slot_check;
ALTER TABLE public.briefings ADD CONSTRAINT briefings_slot_check CHECK (slot IN ('morning','afternoon','daily','manual'));

ALTER TABLE public.briefing_preferences ADD COLUMN IF NOT EXISTS recipient_email text;

ALTER TABLE public.briefing_preferences ALTER COLUMN sources SET DEFAULT ARRAY[
  'prothomalo.com','thedailystar.net','banglatribune.com','jugantor.com','kalerkantho.com',
  'bdnews24.com','dhakatribune.com','newagebd.net','samakal.com','mzamin.com',
  'dailyinqilab.com','dailyjanakantha.com','dailysangram.com','amadershomoy.com','bhorerkagoj.com',
  'deshrupantor.com','bangladesheralo.com','dainikdinkal.net','dainikbangla.com.bd',
  'thedailysharebiz.com','jatioorthoniti.com','followupnews.com.bd','crimecorruption.com.bd',
  'nbrnewsandviews.com','acc.org.bd','nbr.gov.bd','cabinet.gov.bd','mof.gov.bd','cao.gov.bd'
];

ALTER TABLE public.briefing_preferences ALTER COLUMN topics SET DEFAULT ARRAY[
  'corruption','দুর্নীতি','ঘুষ','bribery','money laundering','অর্থ পাচার','hundi',
  'bank loan default','খেলাপি ঋণ','ACC','দুদক','financial irregularities','আর্থিক অনিয়ম',
  'embezzlement','আত্মসাৎ','NBR','জাতীয় রাজস্ব বোর্ড','tax evasion','কর ফাঁকি',
  'Bangladesh Secretariat','সচিবালয়','customs','শুল্ক','VAT','ভ্যাট'
];