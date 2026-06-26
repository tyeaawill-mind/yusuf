import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateBriefingItems, localDateInTZ, type BriefingItem } from "@/lib/briefings.server";

const BodySchema = z.object({
  slot: z.enum(["morning", "afternoon", "daily"]),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildEmailHtml(intro: string, items: BriefingItem[], localDate: string): string {
  const list = items
    .map(
      (it) => `
        <li style="margin:0 0 18px 0;padding:0;">
          <a href="${escapeHtml(it.url)}" style="color:#0b66c2;text-decoration:none;font-weight:600;font-size:16px;">${escapeHtml(it.headline)}</a>
          <div style="color:#666;font-size:12px;margin:2px 0 6px;">${escapeHtml(it.source ?? "")}</div>
          <div style="color:#222;font-size:14px;line-height:1.5;">${escapeHtml(it.summary)}</div>
          <div style="margin-top:6px;font-size:12px;"><a href="${escapeHtml(it.url)}" style="color:#0b66c2;">Source: ${escapeHtml(it.url)}</a></div>
        </li>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#111;">
    <h2 style="margin:0 0 4px 0;">Daily briefing — ${escapeHtml(localDate)}</h2>
    <p style="color:#444;margin:0 0 16px 0;">${escapeHtml(intro)}</p>
    <ol style="padding-left:18px;margin:0;">${list}</ol>
    <p style="color:#999;font-size:12px;margin-top:24px;">Prepared by Yusuf for Tye.</p>
  </body></html>`;
}

function buildEmailText(intro: string, items: BriefingItem[], localDate: string): string {
  const lines = items.map((it, i) => `${i + 1}. ${it.headline}\n   ${it.source ?? ""}\n   ${it.summary}\n   Source: ${it.url}`).join("\n\n");
  return `Daily briefing — ${localDate}\n\n${intro}\n\n${lines}\n\n— Yusuf`;
}

function utf8Bin(s: string): string {
  const enc = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
  return bin;
}

function base64UrlFromBin(bin: string): string {
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64Wrap(s: string): string {
  return btoa(s).replace(/(.{76})/g, "$1\r\n");
}

function encodeSubject(s: string): string {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(s)))}?=`;
}

async function sendBriefingEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) throw new Error("Gmail connector not configured");

  const boundary = `----yusuf_${Date.now().toString(36)}`;
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Wrap(utf8Bin(text)),
  ].join("\r\n");

  const htmlPart = [
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Wrap(utf8Bin(html)),
  ].join("\r\n");

  const mime = headers + "\r\n\r\n" + textPart + "\r\n" + htmlPart + `\r\n--${boundary}--\r\n`;
  const raw = base64UrlFromBin(utf8Bin(mime));

  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${t.slice(0, 300)}`);
  }
}

export const Route = createFileRoute("/api/public/hooks/generate-briefings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return new Response("Invalid body", { status: 400 });
        const { slot } = parsed.data;

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: prefsList, error: pErr } = await supabase
          .from("briefing_preferences")
          .select("*")
          .eq("enabled", true);
        if (pErr) return Response.json({ ok: false, error: pErr.message }, { status: 500 });

        const results: { user_id: string; ok: boolean; error?: string; items?: number; emailed?: boolean }[] = [];
        for (const prefs of prefsList ?? []) {
          const local_date = localDateInTZ(prefs.timezone || "Asia/Dhaka");
          try {
            const result = await generateBriefingItems({
              sources: prefs.sources,
              topics: prefs.topics,
              language: prefs.language as "en" | "bn" | "auto",
              max_items: prefs.max_items,
            });
            const { error: insErr } = await supabase
              .from("briefings")
              .upsert(
                { user_id: prefs.user_id, slot, local_date, items: result.items, intro: result.intro, error: null },
                { onConflict: "user_id,slot,local_date" },
              );
            if (insErr) throw insErr;

            let emailed = false;
            const recipient = (prefs as any).recipient_email as string | null;
            if (prefs.email_delivery && recipient && result.items.length > 0) {
              const html = buildEmailHtml(result.intro, result.items, local_date);
              const text = buildEmailText(result.intro, result.items, local_date);
              await sendBriefingEmail(recipient, `Daily briefing — ${local_date}`, html, text);
              emailed = true;
            }
            results.push({ user_id: prefs.user_id, ok: true, items: result.items.length, emailed });
          } catch (e: any) {
            const errMsg = e?.message ?? String(e);
            await supabase
              .from("briefings")
              .upsert(
                { user_id: prefs.user_id, slot, local_date, items: [], error: errMsg },
                { onConflict: "user_id,slot,local_date" },
              );
            results.push({ user_id: prefs.user_id, ok: false, error: errMsg });
          }
        }

        return Response.json({ ok: true, slot, processed: results.length, results });
      },
    },
  },
});
