import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { IntegrityScreening, type ScreeningResult } from "@/components/integrity-screening";
import { useServerFn } from "@tanstack/react-start";
import { submitAccessRequest } from "@/lib/acis.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [screening, setScreening] = useState<ScreeningResult | null>(null);
  const submitAccess = useServerFn(submitAccessRequest);

  const checkMfaAndContinue = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.find((f) => f.status === "verified");
      if (factor) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (chErr || !ch) { setError(chErr?.message ?? "Could not start 2FA challenge"); return; }
        setMfa({ factorId: factor.id, challengeId: ch.id });
        return;
      }
    }
    navigate({ to: "/app" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        if (!screening) {
          setError("Please complete the integrity screening first.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { acis: screening.answers, acis_recommendation: screening.recommendation },
          },
        });
        if (error) throw error;
        const res = await submitAccess({ data: { email, ...screening.answers } });
        setError(
          res.status === "approved"
            ? "Check your email to confirm your account."
            : "Check your email to confirm your account. Your access is pending owner approval.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await checkMfaAndContinue();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: mfa.challengeId,
      code: mfaCode.trim(),
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Yusuf
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your devoted personal assistant
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
          {mfa ? (
            <>
              <h2 className="text-lg font-semibold text-card-foreground font-display">Two-factor verification</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
              <form onSubmit={handleMfaVerify} className="mt-6 space-y-4">
                <Input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  className="bg-background/50 text-center text-lg tracking-[0.5em] font-mono"
                  required
                />
                {error && (
                  <div className="rounded-lg px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">{error}</div>
                )}
                <Button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? "Verifying..." : "Verify & continue"}
                </Button>
                <button
                  type="button"
                  onClick={async () => { await supabase.auth.signOut(); setMfa(null); setMfaCode(""); setError(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel and sign out
                </button>
              </form>
            </>
          ) : isSignUp && !screening?.passed ? (
            <>
              <IntegrityScreening onPass={(r) => { setScreening(r); setError(""); }} />
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(""); setScreening(null); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>

          ) : (
            <>
          {isSignUp && screening?.passed && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Integrity screening passed ({screening.score}/{screening.total}). You may create your account.
            </div>
          )}
          <h2 className="text-lg font-semibold text-card-foreground font-display">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp
              ? "This is your private space. Only you can access it."
              : "Sign in to continue with Yusuf."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-input"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  error.includes("Check your email")
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Create account" : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setScreening(null);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </button>
          </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private by design. Your data belongs to you alone.
        </p>
      </div>
    </div>
  );
}
