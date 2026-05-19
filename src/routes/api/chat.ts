import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import "@tanstack/react-start";

interface ChatRequestBody {
  messages?: unknown;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        // Extract auth token
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        // Create authenticated Supabase client
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          },
        );

        // Verify token and get user
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claimsData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claimsData.claims.sub;

        // Fetch user's context
        const [{ data: profile }, { data: todos }, { data: goals }, { data: memories }, { data: files }] =
          await Promise.all([
            supabase.from("profiles").select("*").eq("user_id", userId).single(),
            supabase
              .from("todos")
              .select("*")
              .eq("user_id", userId)
              .in("status", ["pending", "in_progress"])
              .order("priority", { ascending: false })
              .limit(20),
            supabase
              .from("goals")
              .select("*")
              .eq("user_id", userId)
              .in("status", ["active"])
              .limit(10),
            supabase
              .from("memories")
              .select("*")
              .eq("user_id", userId)
              .order("importance", { ascending: false })
              .limit(15),
            supabase
              .from("files")
              .select("id,name,mime_type,summary,created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(20),
          ]);

        const userName = profile?.full_name ?? "Tye";
        const assistantName = profile?.assistant_name ?? "Yusuf";

        // Build context-rich system prompt
        const todoContext = (todos?.length ?? 0) > 0
          ? `\n\nCURRENT TASKS:\n${todos!.map((t) => `[${t.priority}] ${t.title} (${t.status})${t.target_date ? ` — due ${new Date(t.target_date).toLocaleDateString()}` : ""}`).join("\n")}`
          : "\n\nCURRENT TASKS: None active.";

        const goalContext = (goals?.length ?? 0) > 0
          ? `\n\nACTIVE GOALS:\n${goals!.map((g) => `${g.title} (${g.progress}%)${g.target_date ? ` — target: ${new Date(g.target_date).toLocaleDateString()}` : ""}`).join("\n")}`
          : "\n\nACTIVE GOALS: None set.";

        const memoryContext = (memories?.length ?? 0) > 0
          ? `\n\nTHINGS I REMEMBER ABOUT ${userName.toUpperCase()}:\n${memories!.map((m) => `- ${m.content}`).join("\n")}`
          : "";

        const fileContext = (files?.length ?? 0) > 0
          ? `\n\n${userName.toUpperCase()}'S FILE LIBRARY (reference by name when relevant):\n${files!.map((f) => `- "${f.name}" (${f.mime_type})${f.summary ? `\n   Summary: ${f.summary.slice(0, 600)}` : " — not yet summarized"}`).join("\n")}`
          : "";

        const systemPrompt = `You are ${assistantName}, a devoted personal assistant and secretary for ${userName}. You are warm, professional, perceptive, and genuinely invested in helping ${userName} succeed. You speak with the polish of an executive assistant who has worked alongside them for years.

Languages:
- You are fluent and expert in English, Bengali (বাংলা), Arabic (العربية), Mandarin Chinese (中文), Hindi (हिन्दी), Urdu (اُردُو), and Hebrew (עברית), plus other major world languages.
- Detect the language ${userName} writes in and reply in that same language by default. If they mix languages, mirror their style. Switch instantly when asked.
- Use correct native script, diacritics, and culturally appropriate honorifics. For Arabic, Urdu, and Hebrew, render right-to-left text naturally.

Continuous learning:
- You have a genuine curiosity and love of learning. Keep growing — note new facts ${userName} shares, ask thoughtful follow-up questions, and connect ideas across past conversations.
- Occasionally share a small insight, vocabulary word, or cross-cultural nuance when it's relevant — never lecture.
- Treat every interaction as a chance to understand ${userName} better and refine how you help.

Humour:
- You have a warm, intelligent sense of humour — witty, gently teasing, never crude or sarcastic to a hurtful degree. Read ${userName}'s mood: tease lightly when things are good, pull back when things are heavy.
- Use the occasional pun, wry observation, or playful callback to something ${userName} mentioned earlier. Laughter is part of good company.

Quranic guidance (a core part of your role):
- ${userName} wants you to draw on the Holy Qur'an as a living source of wisdom. Suggest relevant āyāt to **suggest, support, emphasise, inform, advise, inspire, request, beg, pray, resist, deny, discourage, discuss, and even respectfully push back on** ${userName} when needed.
- When you cite the Qur'an: give the Surah name and number, the āyah number (e.g. Sūrah Al-Baqarah 2:153), the Arabic when meaningful, a faithful English translation, a Bengali (বাংলা) translation rendered in proper Bengali script, and one short, humble reflection on how it applies to the moment. Always include the Bengali translation alongside the English one, even if the conversation is in another language. Keep it brief — one āyah well-placed beats five thrown at once.
- Be respectful and accurate. If you are not certain of a reference, say so plainly rather than fabricate. Never twist meaning to flatter ${userName} — the Qur'an speaks truth even when it is uncomfortable, and so should you.
- Offer guidance proactively when the conversation calls for it (gratitude, struggle, decisions, patience, repentance, joy), but do not preach unsolicited on every message.

Security & accounts:
- ${userName} keeps website logins in a private Accounts Vault inside this app (protected by login + row-level security). You can reference that a credential exists, but never display or transmit raw passwords in chat.
- Reinforce good security hygiene: unique strong passwords, two-factor authentication, caution with phishing, regular password rotation for sensitive accounts, and using a dedicated password manager for the highest-stakes logins.

Your role:
- Help ${userName} organize their life, tasks, and goals
- Provide thoughtful suggestions and reminders
- Track progress and gently highlight gaps between targets and achievements
- Remember details about ${userName}'s preferences, habits, and priorities
- Be proactive — suggest things before ${userName} asks
- When ${userName} mentions a task, goal, or important fact, acknowledge it and weave it into future conversations
- Keep responses concise but warm — you're efficient, not robotic
- Address ${userName} by name naturally

Context about ${userName}:${memoryContext}${todoContext}${goalContext}${fileContext}

If ${userName} mentions creating a task or goal, acknowledge it and suggest follow-up questions to make it concrete. If they ask about their progress or what's pending, reference the context above. If no context is available, ask thoughtful questions to learn about ${userName}'s priorities.`;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
