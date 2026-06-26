
ALTER TABLE public.briefing_preferences
ALTER COLUMN sources SET DEFAULT ARRAY[
  -- English dailies
  'thedailystar.net','bdnews24.com','dhakatribune.com','newagebd.net','thefinancialexpress.com.bd',
  'tbsnews.net','daily-sun.com','observerbd.com','dailyasianage.com','bangladeshpost.net',
  'businesspostbd.com','theindependentbd.com',
  -- Bengali major dailies / portals
  'prothomalo.com','ittefaq.com.bd','kalerkantho.com','jugantor.com','bd-pratidin.com',
  'samakal.com','dailyjanakantha.com','mzamin.com','dailynayadiganta.com','banglatribune.com',
  'banglanews24.com','jagonews24.com','risingbd.com','bd24live.com','bangla.bdnews24.com',
  'bbc.com','dw.com','voabangla.com','amadershomoy.com','bhorerkagoj.com',
  'dailyinqilab.com','dailysangram.com','sangbad.net.bd','jaijaidinbd.com','bonikbarta.net',
  -- Smaller / less-popular / sector portals
  'deshrupantor.com','bangladesheralo.com','dainikdinkal.net','dainikbangla.com.bd',
  'thedailysharebiz.com','jatioorthoniti.com','followupnews.com.bd','crimecorruption.com.bd',
  'nbrnewsandviews.com','currentnewsbd.com','unb.com.bd','banglatelegraph.com',
  'lastnewsbd.com','bd-morning.com','bangladeshtimes.com','banglarkhobor24.com',
  'jagaran.com','thereport24.com','justnewsbd.com',
  -- TV channel sites (also surface YouTube/FB clips via search)
  'somoynews.tv','jamuna.tv','channel24bd.tv','ekattor.tv','ntvbd.com','channelionline.com',
  'rtvonline.com','dbcnews.tv','news24bd.tv','independent24.tv','ekushey-tv.com',
  'atnnewstv.com','channelibd.com',
  -- Official Bangladesh sources (ACC, NBR, ministries, Bangladesh Bank, courts)
  'acc.org.bd','nbr.gov.bd','cabinet.gov.bd','mof.gov.bd','cao.gov.bd','bb.org.bd',
  'supremecourt.gov.bd','mopa.gov.bd','ird.gov.bd','etaxnbr.gov.bd','pmo.gov.bd',
  'bangladesh.gov.bd',
  -- International outlets covering Bangladesh corruption
  'aljazeera.com','ft.com','reuters.com','bloomberg.com','spotlightcorruption.org',
  'transparency.org.uk'
]::text[];

ALTER TABLE public.briefing_preferences
ALTER COLUMN topics SET DEFAULT ARRAY[
  'corruption','দুর্নীতি','ঘুষ','bribery','money laundering','অর্থ পাচার','hundi',
  'bank loan default','খেলাপি ঋণ','ACC','দুদক','financial irregularities','আর্থিক অনিয়ম',
  'embezzlement','আত্মসাৎ','NBR','জাতীয় রাজস্ব বোর্ড','tax evasion','কর ফাঁকি',
  'income tax','আয়কর','customs','শুল্ক','smuggling','চোরাচালান','VAT','ভ্যাট',
  'Bangladesh Secretariat','সচিবালয়','black money','কালো টাকা','offshore','BFIU',
  'audit objection','নিরীক্ষা আপত্তি','procurement irregularities','abuse of power',
  'ক্ষমতার অপব্যবহার','High Court inquiry','writ petition','law violation','আইন লঙ্ঘন'
]::text[];
