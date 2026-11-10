import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { updateBriefingPreferencesSchema } from "@/lib/briefing-preferences.schema";

export const getBriefingPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("briefing_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return { prefs: data };
    // Lazily create defaults
    const { data: created, error: insErr } = await supabase
      .from("briefing_preferences")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insErr) throw insErr;
    return { prefs: created };
  });

export const updateBriefingPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateBriefingPreferencesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("briefing_preferences")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return { prefs: row };
  });

export const listBriefings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("briefings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return { briefings: data ?? [] };
  });

export const deleteBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("briefings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

export const generateBriefingNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prefs, error: pErr } = await supabase
      .from("briefing_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw pErr;

    const effective = prefs ?? {
      sources: [],
      topics: [],
      language: "auto" as const,
      max_items: 10,
      timezone: "Asia/Dhaka",
    };

    const { generateBriefingItems, localDateInTZ } = await import("@/lib/briefings.server");
    let result;
    try {
      result = await generateBriefingItems({
        sources: effective.sources,
        topics: effective.topics,
        language: effective.language as "en" | "bn" | "auto",
        max_items: effective.max_items,
      });
    } catch (e: any) {
      const errMsg = e?.message ?? String(e);
      const { data: row } = await supabase
        .from("briefings")
        .insert({ user_id: userId, slot: "manual", local_date: localDateInTZ(effective.timezone), items: [], error: errMsg })
        .select()
        .single();
      return { briefing: row, error: errMsg };
    }

    const local_date = localDateInTZ(effective.timezone);
    const { data: row, error: insErr } = await supabase
      .from("briefings")
      .insert({
        user_id: userId,
        slot: "manual",
        local_date,
        items: result.items as any,
        intro: result.intro,
      })
      .select()
      .single();
    if (insErr) throw insErr;
    return { briefing: row };
  });
