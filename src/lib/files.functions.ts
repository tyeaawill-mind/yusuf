import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const BUCKET = "user-files";

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { files: data ?? [] };
  });

export const createFileRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(255),
        mime_type: z.string().min(1).max(150),
        size_bytes: z.number().int().min(0).max(20 * 1024 * 1024),
        storage_path: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.storage_path.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path");
    }
    const { data: row, error } = await supabase
      .from("files")
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return { file: row };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: file, error: getErr } = await supabase
      .from("files").select("storage_path").eq("id", data.id).eq("user_id", userId).single();
    if (getErr) throw getErr;
    if (file?.storage_path) {
      await supabase.storage.from(BUCKET).remove([file.storage_path]);
    }
    const { error } = await supabase.from("files").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

export const getFileSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: file, error } = await supabase
      .from("files").select("storage_path").eq("id", data.id).eq("user_id", userId).single();
    if (error) throw error;
    const { data: signed, error: sErr } = await supabase.storage
      .from(BUCKET).createSignedUrl(file.storage_path, 60 * 10);
    if (sErr) throw sErr;
    return { url: signed.signedUrl };
  });

export const summarizeFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: file, error } = await supabase
      .from("files").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (error) throw error;

    const { data: blob, error: dErr } = await supabase.storage.from(BUCKET).download(file.storage_path);
    if (dErr) throw dErr;
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    const mime = file.mime_type || "application/octet-stream";
    const instruction = `Summarize this file ("${file.name}") for the user. Provide:\n1. A 2-3 sentence overview.\n2. Key points or topics (bullets).\n3. Any action items, names, dates, or numbers worth remembering.\nKeep it concise and useful.`;

    let content: any;
    if (mime.startsWith("text/") || mime === "application/json" || file.name.match(/\.(txt|md|csv|log|json|yml|yaml)$/i)) {
      const text = new TextDecoder().decode(bytes).slice(0, 200_000);
      content = [{ type: "text", text: `${instruction}\n\n--- FILE CONTENT ---\n${text}` }];
    } else if (mime.startsWith("image/")) {
      content = [
        { type: "text", text: instruction },
        { type: "image", image: bytes, mediaType: mime },
      ];
    } else if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      content = [
        { type: "text", text: instruction },
        { type: "file", data: bytes, mediaType: "application/pdf" },
      ];
    } else {
      // DOCX and other binary formats — attempt as generic file; fall back to a friendly note
      try {
        content = [
          { type: "text", text: instruction },
          { type: "file", data: bytes, mediaType: mime },
        ];
      } catch {
        const note = `I can't directly read ${mime} files yet. Convert to PDF or text and re-upload.`;
        await supabase.from("files").update({ summary: note }).eq("id", file.id);
        return { summary: note };
      }
    }

    const { text } = await generateText({
      model,
      messages: [{ role: "user", content }],
    });

    await supabase.from("files").update({ summary: text }).eq("id", file.id);
    return { summary: text };
  });
