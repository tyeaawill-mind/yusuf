import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateBriefingItems, localDateInTZ } from "@/lib/briefings.server";

const BodySchema = z.object({
  slot: z.enum(["morning", "afternoon"]),
});

export const Route = createFileRoute("/api/public/hooks/generate-briefings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require Supabase anon key in apikey header (matches pg_cron pattern)
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
        if (!parsed.success) {
          return new Response("Invalid body", { status: 400 });
        }
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
        if (pErr) {
          return Response.json({ ok: false, error: pErr.message }, { status: 500 });
        }

        const results: { user_id: string; ok: boolean; error?: string; items?: number }[] = [];
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
                {
                  user_id: prefs.user_id,
                  slot,
                  local_date,
                  items: result.items,
                  intro: result.intro,
                  error: null,
                },
                { onConflict: "user_id,slot,local_date" },
              );
            if (insErr) throw insErr;
            results.push({ user_id: prefs.user_id, ok: true, items: result.items.length });
          } catch (e: any) {
            const errMsg = e?.message ?? String(e);
            await supabase
              .from("briefings")
              .upsert(
                {
                  user_id: prefs.user_id,
                  slot,
                  local_date,
                  items: [],
                  error: errMsg,
                },
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
