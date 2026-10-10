// Server-only helpers for generating news briefings. Never import from client code.
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export interface BriefingItem {
  headline: string;
  summary: string;
  url: string;
  image_url?: string | null;
  source?: string | null;
  published_at?: string | null;
  topic_key?: string | null;
}

interface SearchHit {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: { ogImage?: string; sourceURL?: string; publishedTime?: string };
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

export function isExactlyFiveBengaliSentences(summary: string): boolean {
  const text = summary.trim();
  // Must end with a sentence terminator, no Latin full stops used as sentence breaks.
  if (!/[।!?]$/u.test(text)) return false;
  const sentences = text
    .split(/[।!?]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length !== 5) return false;
  return sentences.every((sentence) => {
    const bn = (sentence.match(/[\u0980-\u09FF]/gu) ?? []).length;
    const latin = (sentence.match(/[A-Za-z]/g) ?? []).length;
    // Mostly Bengali script (names/acronyms in Latin allowed) and not a fragment.
    return bn >= 12 && bn > latin * 2;
  });
}

function tokens(s: string): Set<string> {
  const stop = new Set(["ও","এবং","এর","করে","হয়","থেকে","জন্য","একটি","বলে","তার","নিয়ে","the","of","and","in","to","a"]);
  return new Set(
    s.toLocaleLowerCase("bn-BD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stop.has(t)),
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

function isHttpUrl(v: string | undefined | null): v is string {
  if (!v) return false;
  try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
}

// Headline subject = text before the em dash (person + designation).
function subjectOf(headline: string): string {
  return headline.split(/\s[—–-]\s/)[0] ?? headline;
}

export function isDuplicateTopic(
  item: { topic_key: string; headline: string },
  kept: { topic_key?: string | null; headline: string }[],
): boolean {
  const k = tokens(item.topic_key);
  const h = tokens(item.headline);
  const subj = tokens(subjectOf(item.headline));
  return kept.some((o) => {
    const ok = tokens(o.topic_key ?? "");
    if (similarity(k, ok) >= 0.6) return true;
    if (similarity(h, tokens(o.headline)) >= 0.55) return true;
    // Same named person + overlapping allegation keys => same event.
    return similarity(subj, tokens(subjectOf(o.headline))) >= 0.8 && similarity(k, ok) >= 0.35;
  });
}

async function firecrawlSearch(query: string, limit: number): Promise<SearchHit[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch(`${FIRECRAWL_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      limit,
      tbs: "qdr:d", // last 24h
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Firecrawl search failed [${res.status}]: ${t.slice(0, 200)}`);
  }
  const j: any = await res.json();
  const web = j?.data?.web ?? j?.data ?? [];
  return Array.isArray(web) ? web : [];
}

function dedupe(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const u = canonicalUrl(h.url || "");
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(h);
  }
  return out;
}

export interface Prefs {
  sources: string[];
  topics: string[];
  language: "en" | "bn" | "auto";
  max_items: number;
  /** Items already sent in recent briefings; repeats of these are dropped. */
  recent?: { topic_key?: string | null; headline: string }[];
}

export async function generateBriefingItems(prefs: Prefs): Promise<{ intro: string; items: BriefingItem[] }> {
  // Build queries that fan out across ALL configured sources by chunking them,
  // so a comprehensive directory of Bangladeshi outlets actually gets scanned.
  const CHUNK = 15;
  const sourceChunks: string[][] = [];
  for (let i = 0; i < prefs.sources.length; i += CHUNK) {
    sourceChunks.push(prefs.sources.slice(i, i + CHUNK));
  }
  if (sourceChunks.length === 0) sourceChunks.push([]);
  const topTopics = prefs.topics.slice(0, 8);
  const queries: string[] = [];
  // Concrete-fact wording: we want stories with a named person AND at least one
  // hard detail (amount embezzled, inquiry/case status, illegal wealth, assets).
  const factWordsEn =
    "(embezzled OR bribe OR laundering OR \"illegal wealth\" OR \"undisclosed assets\" OR \"wealth statement\" OR inquiry OR chargesheet OR FIR OR arrested OR remand OR \"case filed\" OR seized OR frozen OR crore OR lakh OR Tk)";
  const factWordsBn =
    "(আত্মসাৎ OR ঘুষ OR \"অবৈধ সম্পদ\" OR \"অপ্রদর্শিত সম্পদ\" OR অনুসন্ধান OR মামলা OR অভিযোগপত্র OR গ্রেপ্তার OR রিমান্ড OR জব্দ OR ক্রোক OR কোটি OR লাখ OR টাকা)";
  // Site-scoped queries across the configured directory, demanding a named
  // person plus concrete corruption facts.
  topTopics.slice(0, 6).forEach((t, ti) => {
    const chunk = sourceChunks[ti % sourceChunks.length];
    const sitesQuery = chunk.map((s) => `site:${s}`).join(" OR ");
    queries.push(
      sitesQuery
        ? `(${sitesQuery}) "${t}" (অভিযুক্ত OR accused OR named) ${factWordsEn} OR ${factWordsBn}`
        : `"${t}" Bangladesh accused individual ${factWordsEn}`,
    );
  });
  // Open-web queries specifically targeting tabloid / informal / unverified
  // outlets, social posts, and YouTube reels covering named individuals
  // with concrete corruption details.
  const tabloidScopes = [
    "site:facebook.com",
    "site:youtube.com",
    "site:t.me",
    "site:medium.com",
    "site:wordpress.com",
    "site:blogspot.com",
  ].join(" OR ");
  const mainstreamExclusions =
    "-site:prothomalo.com -site:thedailystar.net -site:bdnews24.com -site:dhakatribune.com -site:newagebd.net -site:tbsnews.net";
  topTopics.slice(0, 4).forEach((t) => {
    queries.push(
      `(${tabloidScopes}) "${t}" Bangladesh (অভিযুক্ত OR named OR accused) ${factWordsEn} ${mainstreamExclusions}`,
    );
  });
  // Always-on hard-fact sweeps regardless of topic list: ACC/NBR inquiry,
  // chargesheets, asset seizures, named officials with amounts.
  const hardSweeps = [
    `("দুদক" OR "Anti-Corruption Commission" OR ACC) (অনুসন্ধান OR মামলা OR চার্জশিট OR "chargesheet" OR "case filed") (কোটি OR লাখ OR crore OR lakh)`,
    `("NBR" OR "জাতীয় রাজস্ব বোর্ড") (কর্মকর্তা OR official) (ঘুষ OR bribe OR "অবৈধ সম্পদ" OR "illegal wealth" OR অভিযুক্ত OR accused)`,
    `Bangladesh (DC OR UNO OR OC OR secretary OR কর্মকর্তা) (অভিযুক্ত OR accused) (কোটি টাকা OR crore taka OR "illegal wealth" OR "অবৈধ সম্পদ")`,
    `("সচিবালয়" OR "Bangladesh Secretariat") (অভিযুক্ত OR ঘুষ OR দুর্নীতি OR কেলেঙ্কারি) (কোটি OR লাখ OR crore)`,
  ];
  for (const q of hardSweeps) queries.push(q);


  const allHits: SearchHit[] = [];
  for (const q of queries) {
    try {
      const hits = await firecrawlSearch(q, 6);
      allHits.push(...hits);
    } catch (e) {
      console.error("Firecrawl query failed", q, e);
    }
  }
  const hits = dedupe(allHits).slice(0, 24);

  if (hits.length === 0) {
    return {
      intro: "No matching coverage found in the last 24 hours.",
      items: [],
    };
  }

  const corpus = hits
    .map((h, i) => {
      const md = (h.markdown || h.description || "").slice(0, 1800);
      const img = h.metadata?.ogImage ? `IMAGE: ${h.metadata.ogImage}` : "";
      const published = h.metadata?.publishedTime ? `PUBLISHED: ${h.metadata.publishedTime}` : "";
      return `### Article ${i + 1}\nURL: ${h.url}\nTITLE: ${h.title ?? ""}\n${published}\n${img}\nCONTENT:\n${md}`;
    })
    .join("\n\n---\n\n");

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-2.5-flash");

  const system = `You are Yusuf, a personal investigative news editor for the user. You are reviewing Bangladeshi coverage focused on INDIVIDUALS and their alleged corruption / illegal activities — who did what, how much, with whom, where the inquiry stands.

STRICT EDITORIAL RULES — violating any of these means DROP the item, do not soften it:
1. Every item MUST name a specific individual (full name, or name + role/designation). No "an official", "a businessman", "sources say". If the article doesn't name a person, drop it.
2. Every item MUST contain at least TWO of these concrete facts, drawn from the article (never invented):
   - Amount of money involved (Tk / crore / lakh / USD).
   - Specific allegation (embezzlement, bribe, laundering, tender rigging, tax evasion, smuggling, illegal wealth, undisclosed assets, plot/flat/land/vehicle).
   - Agency / case status (ACC inquiry opened, chargesheet filed, FIR no., arrested, remand, bail, asset seized/frozen, wealth statement notice).
   - Workplace / institution / location tied to the act (NBR wing, customs house, ministry, district, bank).
   If fewer than two concrete facts are present, drop the item — do NOT fill with generic policy commentary.
3. Every summary MUST contain EXACTLY FIVE complete Bengali sentences in বাংলা script, separated with the Bengali full stop "।". Each five-sentence summary MUST follow this structure, in order:
   (a) Person — full name, designation, organisation.
   (b) Allegation — exactly what they are accused of doing.
   (c) Numbers — money amount, assets, time period.
   (d) Inquiry / case status — agency, case/inquiry number if given, current stage.
   (e) Source attribution and any rebuttal/denial noted in the article.
4. PREFER less-popular, tabloid-style, informal and unverified outlets, Facebook pages, Telegram channels, YouTube/reels, blogs. Mainstream wire copy is OK only when it adds a new hard fact about the individual.
5. SEMANTIC DEDUPLICATION IS MANDATORY: first cluster all articles that rationally describe the same underlying event, allegation, case, investigation, person-action, or material update — even when headlines, wording, outlet, platform, URL, language, or publication time differ. Return exactly ONE item for each cluster, using the freshest original report with the strongest concrete detail and an available relevant article image. A second source does not make the topic new. A later report is new only when it contains a material development such as a new arrest, charge, judgment, official finding, quantified asset, or formal case stage.
6. ORDER: latest news FIRST by published_at, strict reverse-chronological. Never re-rank by importance.
7. Cap at ${prefs.max_items} items. Write every headline, the intro, and all five summary sentences in Bengali. Headline format: "পূর্ণ নাম (পদবি) — নির্দিষ্ট অভিযোগ + অর্থের পরিমাণ".
8. If after filtering you have ZERO qualifying items, return an empty items array and say so in intro. Do NOT pad with weak items.
9. Always include the exact original article URL. Every returned item MUST have a relevant image from that same article's IMAGE field; if no appropriate article image is available, drop the item. Never invent or substitute an image, fact, number, URL, or case status.
10. Give each returned topic a topic_key: a short lowercase Bengali semantic fingerprint combining the central person, underlying incident/allegation, location or institution, and material case stage. Articles in the same semantic cluster MUST have the same topic_key and only one may be returned.
Output STRICT JSON only.`;

  const userMsg = `Articles found today:\n\n${corpus}\n\nReturn JSON of shape:\n{\n  "intro": "আজকের ব্রিফিং সম্পর্কে ১টি সংক্ষিপ্ত বাংলা বাক্য",\n  "items": [\n    { "topic_key": "ব্যক্তি ঘটনা প্রতিষ্ঠান মামলার-ধাপ", "headline": "পূর্ণ নাম (পদবি) — অভিযোগ + অর্থের পরিমাণ", "summary": "ঠিক পাঁচটি বাংলা বাক্য, প্রতিটি বাংলা দাঁড়ি দিয়ে শেষ।", "url": "মূল কনটেন্টের সঠিক URL", "image_url": "একই নিবন্ধের IMAGE URL", "source": "domain.com", "published_at": "ISO-8601 if known, else null" }\n  ]\n}\nBefore writing, cluster the entire corpus by underlying topic and select only one article from each semantic cluster. Order the surviving unique topics by published_at DESC. Drop any article that lacks a named person, two concrete facts, an appropriate original article image, or enough verified content for exactly five Bengali sentences. Better to return fewer items than repeat or weaken a topic.`;


  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
  });

  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const ItemSchema = z.object({
    topic_key: z.string().min(3),
    headline: z.string(),
    summary: z.string(),
    url: z.string().url(),
    image_url: z.string().url(),
    source: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
  });
  const Schema = z.object({ intro: z.string().default(""), items: z.array(ItemSchema).default([]) });

  let parsed;
  try {
    parsed = Schema.parse(JSON.parse(cleaned));
  } catch (e) {
    // Fallback: try to extract a JSON object substring
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return valid JSON");
    parsed = Schema.parse(JSON.parse(m[0]));
  }

  const sourceByUrl = new Map(hits.map((hit) => [canonicalUrl(hit.url), hit]));
  const validatedItems: BriefingItem[] = [];
  const recent = prefs.recent ?? [];
  const rejected: Record<string, number> = {};
  const reject = (r: string) => { rejected[r] = (rejected[r] ?? 0) + 1; };

  for (const item of parsed.items) {
    const sourceHit = sourceByUrl.get(canonicalUrl(item.url));
    const topicKey = item.topic_key.trim().toLocaleLowerCase("bn-BD").replace(/\s+/g, " ");
    const originalImage = sourceHit?.metadata?.ogImage;

    if (!sourceHit) { reject("unknown_url"); continue; }
    if (!isHttpUrl(originalImage)) { reject("no_image"); continue; }
    if (!isExactlyFiveBengaliSentences(item.summary)) { reject("not_five_bn"); continue; }
    const candidate = { topic_key: topicKey, headline: item.headline };
    if (isDuplicateTopic(candidate, validatedItems as any)) { reject("dup_in_run"); continue; }
    if (isDuplicateTopic(candidate, recent)) { reject("dup_recent"); continue; }

    validatedItems.push({
      topic_key: topicKey,
      headline: item.headline,
      summary: item.summary,
      url: sourceHit.url,
      image_url: originalImage,
      source: item.source ?? new URL(sourceHit.url).hostname.replace(/^www\./, ""),
      published_at: sourceHit.metadata?.publishedTime ?? item.published_at ?? null,
    });
  }

  validatedItems.sort((a, b) => {
    const aTime = a.published_at ? Date.parse(a.published_at) : 0;
    const bTime = b.published_at ? Date.parse(b.published_at) : 0;
    return bTime - aTime;
  });

  console.log("briefing validation", { kept: validatedItems.length, rejected });
  return {
    intro: parsed.intro,
    items: validatedItems.slice(0, prefs.max_items),
  };
}

export function localDateInTZ(tz: string, d: Date = new Date()): string {
  // Returns YYYY-MM-DD in target timezone
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}
