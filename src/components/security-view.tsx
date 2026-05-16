import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldAlert, KeyRound, Trash2, Copy } from "lucide-react";

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string };

export function SecurityView() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEnroll = async () => {
    setError("");
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolling) return;
    setError("");
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (chErr || !ch) { setError(chErr?.message ?? "Challenge failed"); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setBusy(false);
    if (vErr) { setError(vErr.message); return; }
    setEnrolling(null);
    setCode("");
    load();
  };

  const cancelEnroll = async () => {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    setError("");
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    await supabase.auth.mfa.unenroll({ factorId: id });
    load();
  };

  const verified = factors.filter((f) => f.status === "verified");
  const hasMFA = verified.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> Security
      </h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Protect your account and Vault with two-factor authentication.</p>

      <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${hasMFA ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        {hasMFA ? <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" /> : <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />}
        <div className="text-sm">
          <p className="font-medium text-foreground">{hasMFA ? "Two-factor authentication is ON" : "Two-factor authentication is OFF"}</p>
          <p className="text-muted-foreground mt-0.5">
            {hasMFA
              ? "You'll be asked for a 6-digit code from your authenticator app at every sign-in."
              : "Add an authenticator app (Google Authenticator, Authy, 1Password, etc.) to require a second code at sign-in."}
          </p>
        </div>
      </div>

      {!enrolling && (
        <div className="space-y-2 mb-6">
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p>
            : verified.length === 0 ? (
              <Button onClick={startEnroll} disabled={busy} className="bg-primary">
                <KeyRound className="h-4 w-4 mr-2" /> Set up authenticator app
              </Button>
            ) : verified.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.friendly_name ?? "Authenticator"}</p>
                    <p className="text-xs text-muted-foreground">TOTP · verified</p>
                  </div>
                </div>
                <button onClick={() => removeFactor(f.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      )}

      {enrolling && (
        <form onSubmit={verifyEnroll} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">Scan this QR code</h3>
            <p className="text-xs text-muted-foreground mt-1">Open your authenticator app, scan the code, then enter the 6-digit code it shows.</p>
          </div>
          <div className="flex justify-center bg-white p-4 rounded-lg">
            <img src={enrolling.qr} alt="2FA QR code" className="h-48 w-48" />
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">Can't scan? Enter this secret manually:</p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-2 font-mono break-all">
              <span className="flex-1">{enrolling.secret}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(enrolling.secret)} className="hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" inputMode="numeric" maxLength={6} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || code.length !== 6} className="bg-primary">Verify & enable</Button>
            <Button type="button" variant="ghost" onClick={cancelEnroll}>Cancel</Button>
          </div>
        </form>
      )}

      {!enrolling && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
