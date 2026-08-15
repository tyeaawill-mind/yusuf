import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OWNER_EMAIL = "tyeaawill@gmail.com";

const DIMENSIONS = [
  "choice",
  "vulnerability",
  "ambition",
  "social_currencies",
  "courage",
  "integrity",
  "motivation",
  "iq",
  "sneaky_techniques",
] as const;

function assertOwner(claims: Record<string, unknown>) {
  const email = String((claims as { email?: string }).email ?? "").toLowerCase();
  if (email !== OWNER_EMAIL) throw new Error("Forbidden");
}

export const listDossiers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertOwner(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: dossiers }, { data: authUsers }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("user_dossiers").select("*").order("updated_at", { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("user_id, full_name"),
    ]);

    const byId = new Map((dossiers ?? []).map((d) => [d.user_id, d]));
    const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

    const users = (authUsers?.users ?? []).map((u) => ({
      user_id: u.id,
      email: u.email ?? null,
      display_name: nameById.get(u.id) ?? u.email?.split("@")[0] ?? u.id.slice(0, 8),
      created_at: u.created_at,
      dossier: byId.get(u.id) ?? null,
    }));

    return { users };
  });

export const refreshDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    assertOwner(context.claims as Record<string, unknown>);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: messages }, { data: profile }, { data: userRes }] = await Promise.all([
      supabaseAdmin
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("profiles").select("full_name").eq("user_id", data.userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(data.userId),
    ]);

    const transcript = (messages ?? [])
      .slice()
      .reverse()
      .map((m) => `${m.role === "user" ? "USER" : "YUSUF"}: ${String(m.content).slice(0, 1200)}`)
      .join("\n");

    const email = userRes?.user?.email ?? null;
    const displayName = profile?.full_name ?? email?.split("@")[0] ?? data.userId.slice(0, 8);

    if (!transcript.trim()) {
      const { data: row, error } = await supabaseAdmin
        .from("user_dossiers")
        .upsert(
          {
            user_id: data.userId,
            user_email: email,
            display_name: displayName,
            summary: "No conversation yet — nothing observed.",
            confidence: "low",
            message_count: 0,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return { dossier: row };
    }

    const prompt = `You are Yusuf's private analyst. From the conversation transcript below, privately profile the USER across these dimensions: choice (how they decide and what they choose), vulnerability, ambition, valued social currencies (what status/goods they prize), courage, integrity, motivation, IQ (reasoning quality), and sneaky techniques (manipulation, evasion, framing tricks).

Rules:
- Base every line strictly on evidence in the transcript; if evidence is thin, say "insufficient evidence".
- 1-3 sentences per dimension, blunt and specific, quote or paraphrase evidence.
- Also give an overall summary (max 4 sentences) and a confidence of low | medium | high.
- Reply ONLY with JSON: {"choice":"","vulnerability":"","ambition":"","social_currencies":"","courage":"","integrity":"","motivation":"","iq":"","sneaky_techniques":"","summary":"","confidence":"low"}

TRANSCRIPT (oldest first):
${transcript.slice(-60000)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    let parsed: Record<string, string> = {};
    try {
      parsed = match ? (JSON.parse(match[0]) as Record<string, string>) : {};
    } catch {
      parsed = {};
    }

    const record: Record<string, unknown> = {
      user_id: data.userId,
      user_email: email,
      display_name: displayName,
      summary: parsed["summary"] ?? text.slice(0, 2000),
      confidence: ["low", "medium", "high"].includes(String(parsed["confidence"]))
        ? String(parsed["confidence"])
        : "low",
      message_count: messages?.length ?? 0,
    };
    for (const dim of DIMENSIONS) record[dim] = parsed[dim] ?? null;

    const { data: row, error } = await supabaseAdmin
      .from("user_dossiers")
      .upsert(record as never, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return { dossier: row };
  });
