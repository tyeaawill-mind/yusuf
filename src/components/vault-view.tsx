import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Eye, EyeOff, Copy, Lock, ExternalLink, ShieldAlert, KeyRound } from "lucide-react";
import { encryptSecret, decryptSecret, isEncrypted, safeExternalUrl } from "@/lib/vault-crypto";

type VaultEntry = {
  id: string;
  site_name: string;
  site_url: string | null;
  username: string | null;
  password: string;
  notes: string | null;
  category: string | null;
};

const PASSPHRASE_KEY = "vault_master_passphrase";

export function VaultView() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [passInput, setPassInput] = useState("");
  const [form, setForm] = useState({ site_name: "", site_url: "", username: "", password: "", notes: "", category: "" });

  useEffect(() => {
    setPassphrase(sessionStorage.getItem(PASSPHRASE_KEY));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("account_vault").select("*").order("site_name");
    setEntries((data as VaultEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput.length < 8) { setError("Master passphrase must be at least 8 characters."); return; }
    sessionStorage.setItem(PASSPHRASE_KEY, passInput);
    setPassphrase(passInput);
    setPassInput("");
    setError(null);
  };

  const lock = () => {
    sessionStorage.removeItem(PASSPHRASE_KEY);
    setPassphrase(null);
    setRevealed({});
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.site_name.trim() || !form.password || !passphrase) return;

    const url = form.site_url.trim();
    if (url && !safeExternalUrl(url)) {
      setError("URL must be a valid http:// or https:// address.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cipher = await encryptSecret(form.password, passphrase);
    await supabase.from("account_vault").insert({
      site_name: form.site_name.trim(),
      site_url: url ? safeExternalUrl(url) : null,
      username: form.username.trim() || null,
      password: cipher,
      notes: form.notes.trim() || null,
      category: form.category.trim() || null,
      user_id: user.id,
    });
    setForm({ site_name: "", site_url: "", username: "", password: "", notes: "", category: "" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry permanently?")) return;
    await supabase.from("account_vault").delete().eq("id", id);
    load();
  };

  const reveal = async (entry: VaultEntry) => {
    if (revealed[entry.id]) {
      const next = { ...revealed };
      delete next[entry.id];
      setRevealed(next);
      return;
    }
    const plain = await getPlain(entry);
    if (plain !== null) setRevealed({ ...revealed, [entry.id]: plain });
  };

  const getPlain = async (entry: VaultEntry): Promise<string | null> => {
    if (!isEncrypted(entry.password)) return entry.password;
    if (!passphrase) return null;
    try {
      setError(null);
      return await decryptSecret(entry.password, passphrase);
    } catch {
      setError("Wrong master passphrase for this entry.");
      return null;
    }
  };

  const copyPassword = async (entry: VaultEntry) => {
    const plain = await getPlain(entry);
    if (plain !== null) navigator.clipboard.writeText(plain);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Accounts Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{entries.length} saved {entries.length === 1 ? "account" : "accounts"}</p>
        </div>
        <div className="flex gap-2">
          {passphrase && <Button variant="ghost" onClick={lock}>Lock</Button>}
          <Button onClick={() => setShowForm(!showForm)} disabled={!passphrase} className="bg-primary"><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Passwords are encrypted in your browser with your master passphrase before they are saved — the server never sees them. If you lose the passphrase, saved passwords cannot be recovered. For banking and critical accounts, still prefer a dedicated password manager and enable 2FA.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!passphrase ? (
        <form onSubmit={unlock} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-foreground"><KeyRound className="h-4 w-4 text-primary" /> Enter your master passphrase to unlock the vault</div>
          <Input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder="Master passphrase (min 8 characters)" />
          <Button type="submit" className="bg-primary">Unlock</Button>
        </form>
      ) : (
        <>
          {showForm && (
            <form onSubmit={handleAdd} className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
              <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} placeholder="Site name *" required />
              <Input value={form.site_url} onChange={(e) => setForm({ ...form, site_url: e.target.value })} placeholder="URL (https://...)" />
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / Email" />
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password *" required />
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. Email, Banking, Social)" />
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (recovery codes, security questions, etc.)" rows={2} />
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary">Save</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {loading ? <p className="text-center py-12 text-muted-foreground">Loading vault...</p>
              : entries.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No accounts saved yet.</p>
                </div>
              ) : entries.map((e) => {
                const href = safeExternalUrl(e.site_url);
                return (
                  <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{e.site_name}</h3>
                          {e.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{e.category}</span>}
                        </div>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                            {href} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : e.site_url ? (
                          <span className="text-xs text-muted-foreground mt-0.5 block truncate">{e.site_url} (unsupported link)</span>
                        ) : null}
                      </div>
                      <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {e.username && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-20 text-xs uppercase tracking-wide">User</span>
                          <span className="font-mono text-foreground flex-1 truncate">{e.username}</span>
                          <button onClick={() => copy(e.username!)} className="hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="w-20 text-xs uppercase tracking-wide">Pass</span>
                        <span className="font-mono text-foreground flex-1 truncate">{revealed[e.id] ?? "••••••••••••"}</span>
                        <button onClick={() => reveal(e)} className="hover:text-primary">
                          {revealed[e.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => copyPassword(e)} className="hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                      {e.notes && <p className="text-xs text-muted-foreground pt-1 whitespace-pre-wrap">{e.notes}</p>}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
