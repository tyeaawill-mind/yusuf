import { createFileRoute } from "@tanstack/react-router";

function page(title: string, body: string, ok: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0d0f1a;color:#e8e9f2;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
       <div style="text-align:center;max-width:420px;padding:32px;border:1px solid #26294a;border-radius:16px;background:#141733">
         <h1 style="font-size:20px;margin:0 0 8px;color:${ok ? "#54d18a" : "#f08a8a"}">${title}</h1>
         <p style="color:#a9adc9;font-size:14px;margin:0">${body}</p>
       </div>
     </body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/acis/decision")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const action = url.searchParams.get("action") ?? "";

        if (!/^[a-f0-9]{64}$/.test(token) || (action !== "approve" && action !== "decline")) {
          return page("Invalid link", "This approval link is malformed or incomplete.", false);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("access_requests")
          .update({
            status: action === "approve" ? "approved" : "declined",
            decided_at: new Date().toISOString(),
          })
          .eq("decision_token", token)
          .select("email, status")
          .maybeSingle();

        if (error) return page("Something went wrong", "The decision could not be saved.", false);
        if (!data) return page("Link not found", "This request no longer exists.", false);

        return page(
          data.status === "approved" ? "Access approved" : "Access declined",
          `${data.email} has been ${data.status}.`,
          true,
        );
      },
    },
  },
});
