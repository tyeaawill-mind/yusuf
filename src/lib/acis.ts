// ACIS — Assessment of Commitment to Integrity Standards (shared, browser-safe)

export const OWNER_EMAIL = "tyeaawill@gmail.com";

export type AcisAnswers = {
  purpose: "discretion" | "legal" | "reference";
  discretion: "considerate" | "rude";
  legal: "selfish" | "liberal";
  referral: "critical" | "liberal";
};

export type AcisVerdict = {
  recommendation: "approve" | "review" | "decline";
  rationale: string;
  handling: string;
};

const PURPOSE_LABEL: Record<AcisAnswers["purpose"], string> = {
  discretion: "Discretion",
  legal: "Legal",
  reference: "Reference",
};

export function acisPurposeLabel(p: AcisAnswers["purpose"]): string {
  return PURPOSE_LABEL[p];
}

// What Yusuf does with the responses: purpose selects the governing axis,
// the matching stance decides the recommendation, and all four answers set
// the handling style Yusuf uses with that user once approved.
export function evaluateAcis(a: AcisAnswers): AcisVerdict {
  let recommendation: AcisVerdict["recommendation"] = "review";
  let rationale = "";

  if (a.purpose === "discretion") {
    recommendation = a.discretion === "considerate" ? "approve" : "decline";
    rationale =
      a.discretion === "considerate"
        ? "Seeks discretion and holds a considerate stance on discretionary matters — trustworthy with confidential handling."
        : "Seeks discretion but holds a rude stance on discretionary matters — high risk of misuse of confidences.";
  } else if (a.purpose === "legal") {
    recommendation = a.legal === "liberal" ? "approve" : "review";
    rationale =
      a.legal === "liberal"
        ? "Seeks legal support with a liberal stance — open to lawful, balanced counsel."
        : "Seeks legal support with a selfish stance — needs owner judgement before access to legal reasoning.";
  } else {
    recommendation = a.referral === "critical" ? "approve" : "review";
    rationale =
      a.referral === "critical"
        ? "Seeks references and applies critical judgement to referral positions — unlikely to abuse endorsements."
        : "Seeks references with a liberal stance on referrals — risk of casual or unearned endorsements.";
  }

  const handling = [
    a.discretion === "considerate" ? "confidential detail allowed" : "confidential detail withheld",
    a.legal === "liberal" ? "broad legal discussion" : "legal answers kept narrow and cautious",
    a.referral === "critical" ? "references given with critique" : "references given sparingly",
  ].join("; ");

  return { recommendation, rationale, handling };
}
