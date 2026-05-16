import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getTodos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { todos: data ?? [] };
  });

export const createTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        target_date: z.string().datetime().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: todo, error } = await supabase
      .from("todos")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        category: data.category ?? "general",
        priority: data.priority ?? "medium",
        target_date: data.target_date,
      })
      .select()
      .single();
    if (error) throw error;
    return { todo };
  });

export const updateTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        target_date: z.string().datetime().optional().nullable(),
        completed_at: z.string().datetime().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...updates } = data;
    const { data: todo, error } = await supabase
      .from("todos")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return { todo };
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });
