import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import type { AcisAnswers } from "@/lib/acis";
import { evaluateAcis } from "@/lib/acis";

export type ScreeningResult = { answers: AcisAnswers; recommendation: string };

type Key = keyof AcisAnswers;

const QUESTIONS: { key: Key; q: string; options: { label: string; value: string }[] }[] = [
  {
    key: "purpose",
    q: "What is your purpose with Yusuf?",
    options: [
      { label: "Discretion", value: "discretion" },
      { label: "Legal", value: "legal" },
      { label: "Reference", value: "reference" },
    ],
  },
  {
    key: "discretion",
    q: "What is your view with discretion matters?",
    options: [
      { label: "Considerate", value: "considerate" },
      { label: "Rude", value: "rude" },
    ],
  },
  {
    key: "legal",
    q: "What is your view with legal matters?",
    options: [
      { label: "Selfish", value: "selfish" },
      { label: "Liberal", value: "liberal" },
    ],
  },
  {
    key: "referral",
    q: "What is your view in referral positions?",
    options: [
      { label: "Critical", value: "critical" },
      { label: "Liberal", value: "liberal" },
    ],
  },
];

export function IntegrityScreening({ onComplete }: { onComplete: (r: ScreeningResult) => void }) {
  const [answers, setAnswers] = useState<Partial<Record<Key, string>>>({});

  const complete = QUESTIONS.every((q) => answers[q.key]);

  const submit = () => {
    const a = answers as AcisAnswers;
    onComplete({ answers: a, recommendation: evaluateAcis(a).recommendation });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground font-display">
          <ShieldCheck className="h-5 w-5 text-primary" /> Integrity screening (ACIS)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Four questions. Yusuf uses your answers to set how he handles you, and sends them to the owner for approval
          before your account is activated.
        </p>
      </div>

      <div className="space-y-5">
        {QUESTIONS.map((item, i) => (
          <div key={item.key} className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {i + 1}. {item.q}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.options.map((opt) => {
                const active = answers[item.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [item.key]: opt.value }))}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
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
          Continue <ArrowRight className="h-4 w-4" />
        </span>
      </Button>
    </div>
  );
}
