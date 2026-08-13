import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { evaluateAcis, acisPurposeLabel, OWNER_EMAIL, type AcisAnswers } from "@/lib/acis";

const answersSchema = z.object({
  email: z.string().email().max(200),
  purpose: z.enum(["discretion", "legal", "reference"]),
  discretion: z.enum(["considerate", "rude"]),
  legal: z.enum(["selfish", "liberal"]),
  referral: z.enum(["critical", "liberal"]),
});

export const submitAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => answersSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { escapeHtml } = await import("@/lib/acis.server");
    const { sendGmail } = await import("@/lib/gmail.server");

    const email = data.email.trim().toLowerCase();
    const answers: AcisAnswers = {
      purpose: data.purpose,
      discretion: data.discretion,
      legal: data.legal,
      referral: data.referral,
    };
    const verdict = evaluateAcis(answers);

    if (email === OWNER_EMAIL) {
      return { ok: true as const, status: "approved" as const, recommendation: "approve" as const };
    }

    const existing = await supabaseAdmin
      .from("access_requests")
      .select("id, status, decision_token")
      .ilike("email", email)
      .maybeSingle();

    if (existing.data?.status === "approved") {
      return { ok: true as const, status: "approved" as const, recommendation: verdict.recommendation };
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const row = {
      email,
      purpose: answers.purpose,
      discretion_view: answers.discretion,
      legal_view: answers.legal,
      referral_view: answers.referral,
      recommendation: verdict.recommendation,
      status: "pending",
      decision_token: token,
      decided_at: null,
    };

    if (existing.data?.id) {
      const { error } = await supabaseAdmin.from("access_requests").update(row).eq("id", existing.data.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("access_requests").insert(row);
      if (error) throw error;
    }

    const req = getRequest();
    const origin = req ? new URL(req.url).origin : "";
    const approveUrl = `${origin}/api/public/acis/decision?token=${token}&action=approve`;
    const declineUrl = `${origin}/api/public/acis/decision?token=${token}&action=decline`;

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:620px;color:#111">
        <h2 style="margin:0 0 8px">Yusuf — new access request</h2>
        <p style="margin:0 0 12px"><strong>${escapeHtml(email)}</strong> completed the ACIS screening.</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#555">Purpose with Yusuf</td><td><strong>${escapeHtml(acisPurposeLabel(answers.purpose))}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555">Discretion matters</td><td>${escapeHtml(answers.discretion)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555">Legal matters</td><td>${escapeHtml(answers.legal)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555">Referral positions</td><td>${escapeHtml(answers.referral)}</td></tr>
        </table>
        <p style="margin:14px 0 4px"><strong>Yusuf's recommendation:</strong> ${escapeHtml(verdict.recommendation)}</p>
        <p style="margin:0 0 4px;color:#444">${escapeHtml(verdict.rationale)}</p>
        <p style="margin:0 0 18px;color:#444"><em>Handling if approved:</em> ${escapeHtml(verdict.handling)}</p>
        <a href="${approveUrl}" style="background:#1a7f4b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;margin-right:10px">Approve</a>
        <a href="${declineUrl}" style="background:#a11d1d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Decline</a>
      </div>`;

    try {
      await sendGmail({
        to: [OWNER_EMAIL],
        subject: `Yusuf access request — ${email} (${verdict.recommendation})`,
        html,
      });
    } catch (e) {
      console.error("[acis] owner notification failed", e);
    }

    return { ok: true as const, status: "pending" as const, recommendation: verdict.recommendation };
  });

export const getAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    if (!email) return { status: "pending" as const, email };
    if (email === OWNER_EMAIL) return { status: "approved" as const, email };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("access_requests")
      .select("status")
      .ilike("email", email)
      .maybeSingle();

    return { status: (data?.status ?? "pending") as "pending" | "approved" | "declined", email };
  });
