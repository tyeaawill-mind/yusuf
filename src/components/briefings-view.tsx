import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBriefingPreferences,
  updateBriefingPreferences,
  listBriefings,
  generateBriefingNow,
  deleteBriefing,
} from "@/lib/briefings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Newspaper, RefreshCw, Settings as SettingsIcon, Trash2, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

type BriefingItem = {
  headline: string;
  summary: string;
  url: string;
  image_url?: string | null;
  source?: string | null;
  published_at?: string | null;
};

export function BriefingsView() {
  const qc = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  const prefsQ = useQuery({ queryKey: ["briefing-prefs"], queryFn: useServerFn(getBriefingPreferences) });
  const listQ = useQuery({ queryKey: ["briefings"], queryFn: useServerFn(listBriefings) });

  const genFn = useServerFn(generateBriefingNow);
  const delFn = useServerFn(deleteBriefing);

  const genMut = useMutation({
    mutationFn: () => genFn({ data: {} as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["briefings"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["briefings"] }),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-display">Briefings</h2>
            <p className="text-xs text-muted-foreground">
              Yusuf reads Bangladeshi news for you at 8:00 AM & 3:00 PM (Asia/Dhaka).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => genMut.mutate()} disabled={genMut.isPending}>
            {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Run briefing now</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
            <SettingsIcon className="h-4 w-4" />
            <span className="ml-2">Settings</span>
          </Button>
        </div>
      </div>

      {showSettings && prefsQ.data?.prefs && (
        <SettingsPanel
          prefs={prefsQ.data.prefs}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["briefing-prefs"] });
            setShowSettings(false);
          }}
        />
      )}

      {listQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {listQ.data?.briefings?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No briefings yet. The next ones will arrive at 8:00 AM and 3:00 PM Dhaka time, or click <span className="font-medium">Run briefing now</span>.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {listQ.data?.briefings?.map((b: any) => (
          <article key={b.id} className="rounded-xl border border-border bg-card p-4">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {b.slot} · {b.local_date}
                </div>
                {b.intro && <p className="mt-1 text-sm text-foreground">{b.intro}</p>}
              </div>
              <button
                onClick={() => delMut.mutate(b.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </header>

            {b.error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{b.error}</span>
              </div>
            )}

            <ul className="space-y-4">
              {(b.items as BriefingItem[]).map((it, idx) => (
                <li key={idx} className="flex gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                  {it.image_url && (
                    <img
                      src={it.image_url}
                      alt=""
                      loading="lazy"
                      className="h-20 w-28 shrink-0 rounded-lg object-cover sm:h-24 sm:w-36"
                      onError={(e) => ((e.currentTarget.style.display = "none"))}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-1 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {it.headline}
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
                    </a>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.summary}</p>
                    {it.source && (
                      <p className="mt-1 text-xs text-muted-foreground/70">{it.source}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ prefs, onSaved }: { prefs: any; onSaved: () => void }) {
  const [enabled, setEnabled] = useState<boolean>(prefs.enabled);
  const [language, setLanguage] = useState<string>(prefs.language);
  const [maxItems, setMaxItems] = useState<number>(prefs.max_items);
  const [sources, setSources] = useState<string>((prefs.sources ?? []).join("\n"));
  const [topics, setTopics] = useState<string>((prefs.topics ?? []).join("\n"));
  const [emailDelivery, setEmailDelivery] = useState<boolean>(prefs.email_delivery);
  const [recipientEmail, setRecipientEmail] = useState<string>(prefs.recipient_email ?? "");

  const updFn = useServerFn(updateBriefingPreferences);
  const saveMut = useMutation({
    mutationFn: () =>
      updFn({
        data: {
          enabled,
          language: language as "en" | "bn" | "auto",
          max_items: maxItems,
          sources: sources.split("\n").map((s) => s.trim()).filter(Boolean),
          topics: topics.split("\n").map((s) => s.trim()).filter(Boolean),
          email_delivery: emailDelivery,
          recipient_email: recipientEmail.trim() ? recipientEmail.trim() : null,
        },
      }),
    onSuccess: () => onSaved(),
  });

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="mb-3 text-sm font-semibold">Briefing settings</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <span className="text-sm">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <span className="text-sm">Email delivery</span>
          <Switch checked={emailDelivery} onCheckedChange={setEmailDelivery} />
        </label>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Summary language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (match article)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="bn">বাংলা</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Max items per briefing</label>
          <Input
            type="number"
            min={1}
            max={25}
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Recipient email (for daily 8am delivery)</label>
          <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Sources (one domain per line)</label>
          <Textarea rows={6} value={sources} onChange={(e) => setSources(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Topic keywords (one per line, Bangla or English)</label>
          <Textarea rows={6} value={topics} onChange={(e) => setTopics(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
