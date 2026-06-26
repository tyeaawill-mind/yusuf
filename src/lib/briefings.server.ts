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
}

interface SearchHit {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: { ogImage?: string; sourceURL?: string; publishedTime?: string };
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
    const u = (h.url || "").replace(/[#?].*$/, "").toLowerCase();
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
}

export async function generateBriefingItems(prefs: Prefs): Promise<{ intro: string; items: BriefingItem[] }> {
  const langInstruction =
    prefs.language === "bn"
      ? "Write headlines and summaries in Bengali (বাংলা script)."
      : prefs.language === "en"
        ? "Write headlines and summaries in English."
        : "Write each headline and summary in the same language as the article (Bengali stays in Bengali, English stays in English).";

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
  topTopics.slice(0, 6).forEach((t, ti) => {
    const chunk = sourceChunks[ti % sourceChunks.length];
    const sitesQuery = chunk.map((s) => `site:${s}`).join(" OR ");
    queries.push(sitesQuery ? `(${sitesQuery}) "${t}"` : `"${t}" Bangladesh`);
  });
  // Also run one "open web" query per top topic to catch informal sources,
  // Facebook posts, YouTube videos, and outlets not in the directory.
  topTopics.slice(0, 2).forEach((t) => {
    queries.push(`"${t}" Bangladesh corruption OR দুর্নীতি`);
  });

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
      return `### Article ${i + 1}\nURL: ${h.url}\nTITLE: ${h.title ?? ""}\n${img}\nCONTENT:\n${md}`;
    })
    .join("\n\n---\n\n");

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-2.5-flash");

  const system = `You are Yusuf, a personal news editor for the user. You are reviewing Bangladeshi news coverage focused on corruption, money laundering, and financial irregularities. Group near-duplicate articles. Keep only stories that are clearly on-topic. Rank by importance/freshness. Cap at ${prefs.max_items} items. ${langInstruction} Each summary must be EXACTLY five sentences. Always include the article URL as the source link. Pick an image_url from the article's IMAGE field when present, otherwise leave it null. Never invent facts not present in the article content. Output STRICT JSON only.`;

  const userMsg = `Articles found today:\n\n${corpus}\n\nReturn JSON of shape:\n{\n  "intro": "1 short sentence framing today's briefing",\n  "items": [\n    { "headline": "...", "summary": "Five. Sentences. Here. Exactly. Five.", "url": "...", "image_url": "..." | null, "source": "domain.com" }\n  ]\n}`;

  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
  });

  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const ItemSchema = z.object({
    headline: z.string(),
    summary: z.string(),
    url: z.string().url(),
    image_url: z.string().url().nullable().optional(),
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

  return {
    intro: parsed.intro,
    items: parsed.items.slice(0, prefs.max_items).map((i) => ({
      headline: i.headline,
      summary: i.summary,
      url: i.url,
      image_url: i.image_url ?? null,
      source: i.source ?? new URL(i.url).hostname.replace(/^www\./, ""),
      published_at: i.published_at ?? null,
    })),
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
