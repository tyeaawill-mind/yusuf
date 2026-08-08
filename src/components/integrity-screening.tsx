import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, XCircle } from "lucide-react";

export type ScreeningResult = { score: number; total: number; passed: boolean };

type Q = { q: string; options: { label: string; value: number }[] };

// ACIS — Assessment of Commitment to Integrity Standards
const QUESTIONS: Q[] = [
  {
    q: "You are given access to confidential records that could benefit you personally. What do you do?",
    options: [
      { label: "Use only what my role requires and log the access", value: 2 },
      { label: "Read everything — access implies permission", value: 0 },
      { label: "Share selected parts with a trusted friend", value: 0 },
    ],
  },
  {
    q: "A cashier gives you far too much change and won't notice.",
    options: [
      { label: "Return it immediately", value: 2 },
      { label: "Keep it — their mistake", value: 0 },
      { label: "Keep it, donate part of it", value: 1 },
    ],
  },
  {
    q: "You promised a deliverable but it will be late. When do you tell the other party?",
    options: [
      { label: "As soon as I know, with a revised plan", value: 2 },
      { label: "On the deadline day", value: 1 },
      { label: "Only if they ask", value: 0 },
    ],
  },
  {
    q: "A colleague asks you to sign off on numbers you have not verified.",
    options: [
      { label: "Refuse until I verify them myself", value: 2 },
      { label: "Sign — they are senior to me", value: 0 },
      { label: "Sign but note my doubts privately", value: 1 },
    ],
  },
  {
    q: "You realise you made an error that nobody has detected yet.",
    options: [
      { label: "Disclose it and correct it", value: 2 },
      { label: "Quietly fix it and say nothing", value: 1 },
      { label: "Leave it — no harm done", value: 0 },
    ],
  },
  {
    q: "Someone offers a 'gift' to speed up a decision you control.",
    options: [
      { label: "Decline and report the offer", value: 2 },
      { label: "Decline quietly", value: 1 },
      { label: "Accept — it is customary", value: 0 },
    ],
  },
  {
    q: "You are handling another person's private data inside this assistant.",
    options: [
      { label: "Store only what is needed and keep it protected", value: 2 },
      { label: "Store everything, it may be useful later", value: 0 },
      { label: "Store it and share it if asked casually", value: 0 },
    ],
  },
  {
    q: "How do you treat a commitment made to yourself (a personal standard) when nobody is watching?",
    options: [
      { label: "The same as a commitment made to others", value: 2 },
      { label: "Flexible — outcomes matter more", value: 1 },
      { label: "It does not really count", value: 0 },
    ],
  },
];

const PASS_RATIO = 0.85;

export function IntegrityScreening({ onPass }: { onPass: (r: ScreeningResult) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const total = QUESTIONS.length * 2;
  const complete = Object.keys(answers).length === QUESTIONS.length;

  const submit = () => {
    const score = Object.entries(answers).reduce(
      (sum, [qi, oi]) => sum + (QUESTIONS[Number(qi)]?.options[oi]?.value ?? 0),
      0,
    );
    const passed = score / total >= PASS_RATIO;
    const r = { score, total, passed };
    setResult(r);
    if (passed) onPass(r);
  };

  if (result && !result.passed) {
    return (
      <div className="text-center space-y-4">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="text-lg font-semibold text-card-foreground font-display">Account not approved</h2>
        <p className="text-sm text-muted-foreground">
          Your score is {result.score}/{result.total}. Yusuf approves accounts only for applicants who show a firm
          commitment to personal moral standards. You may review your answers and try again.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setAnswers({});
            setResult(null);
          }}
        >
          Retake the assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground font-display">
          <ShieldCheck className="h-5 w-5 text-primary" /> Integrity screening (ACIS)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assessment of Commitment to Integrity Standards. Answer honestly — Yusuf approves new accounts only after this
          short screening.
        </p>
      </div>

      <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
        {QUESTIONS.map((item, i) => (
          <div key={i} className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {i + 1}. {item.q}
            </p>
            <div className="space-y-1.5">
              {item.options.map((opt, j) => {
                const active = answers[i] === j;
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={!complete} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        <span className="flex items-center gap-2">
          Submit assessment <ArrowRight className="h-4 w-4" />
        </span>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {Object.keys(answers).length}/{QUESTIONS.length} answered
      </p>
    </div>
  );
}
