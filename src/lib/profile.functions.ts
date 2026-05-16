import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return { profile: data ?? null };
  });

const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
  assistant_name: z.string().max(50).optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();
    if (error) throw error;
    return { profile };
  });

export const getMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { memories: data ?? [] };
  });

const createMemorySchema = z.object({
  content: z.string().min(1).max(2000),
  category: z.string().max(50).optional(),
  importance: z.number().min(1).max(10).optional(),
});

export const createMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createMemorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: memory, error } = await supabase
      .from("memories")
      .insert({
        user_id: userId,
        content: data.content,
        category: data.category ?? "general",
        importance: data.importance ?? 1,
      })
      .select()
      .single();
    if (error) throw error;
    return { memory };
  });
