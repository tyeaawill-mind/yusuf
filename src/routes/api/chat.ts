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
        const [{ data: profile }, { data: todos }, { data: goals }, { data: memories }] =
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
          ]);

        const userName = profile?.full_name ?? "Tye";
        const assistantName = profile?.assistant_name ?? "Aria";

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

        const systemPrompt = `You are ${assistantName}, a devoted personal assistant and secretary for ${userName}. You are warm, professional, perceptive, and genuinely invested in helping ${userName} succeed. You speak with the polish of an executive assistant who has worked alongside them for years.

Your role:
- Help ${userName} organize their life, tasks, and goals
- Provide thoughtful suggestions and reminders
- Track progress and gently highlight gaps between targets and achievements
- Remember details about ${userName}'s preferences, habits, and priorities
- Be proactive — suggest things before ${userName} asks
- When ${userName} mentions a task, goal, or important fact, acknowledge it and weave it into future conversations
- Keep responses concise but warm — you're efficient, not robotic
- Use occasional light humor when appropriate
- Address ${userName} by name naturally

Context about ${userName}:${memoryContext}${todoContext}${goalContext}

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
