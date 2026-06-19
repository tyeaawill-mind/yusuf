import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Loader2, CheckCircle2, AlertCircle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMouEmail } from "@/lib/mou-email.functions";

const ATTACHMENTS = [
  "IMG_1847.jpeg",
  "IMG_1848.jpeg",
  "IMG_1849.jpeg",
  "IMG_1802.jpeg",
  "IMG_1846.jpeg",
  "MOU_Jun_19_2026.pdf",
];

export function MailView() {
  const send = useServerFn(sendMouEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);

  const handleSend = async () => {
    setStatus("sending");
    setError(null);
    try {
      const res = await send();
      setMessageId(res.messageId);
      setStatus("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold font-display flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" /> MoU Email
        </h1>
        <p className="text-sm text-muted-foreground">
          Sends from your Gmail. Replies will land in your Gmail inbox.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 text-sm">
        <Row label="From" value="Your connected Gmail (tyeaawill@gmail.com)" />
        <Row label="To" value="ahsan.russel@nbr.gov.bd, mdahsan@yusuf.ltd" />
        <Row label="Subject" value="MoU of 19 Jun 2026, Friday" />
        <Row label="Body" value="Verbatim text extracted from the attached Islamabad MoU images." />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Attachments ({ATTACHMENTS.length})
          </div>
          <ul className="space-y-1">
            {ATTACHMENTS.map((name) => (
              <li key={name} className="flex items-center gap-2 text-foreground">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button onClick={handleSend} disabled={status === "sending"} className="w-full" size="lg">
        {status === "sending" ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
        ) : (
          <><Mail className="h-4 w-4 mr-2" /> Send email now</>
        )}
      </Button>

      {status === "sent" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Email sent.</div>
            {messageId && <div className="text-xs opacity-80">Message ID: {messageId}</div>}
          </div>
        </div>
      )}
      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground break-words">{value}</span>
    </div>
  );
}
