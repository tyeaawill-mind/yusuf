import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, UserSearch, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listDossiers, refreshDossier } from "@/lib/dossiers.functions";

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "choice", label: "Choice" },
  { key: "vulnerability", label: "Vulnerability" },
  { key: "ambition", label: "Ambition" },
  { key: "social_currencies", label: "Valued social currencies" },
  { key: "courage", label: "Courage" },
  { key: "integrity", label: "Integrity" },
  { key: "motivation", label: "Motivation" },
  { key: "iq", label: "IQ" },
  { key: "sneaky_techniques", label: "Sneaky techniques" },
];

export function DossiersView() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dossiers"],
    queryFn: useServerFn(listDossiers),
  });
  const refreshFn = useServerFn(refreshDossier);
  const refresh = useMutation({
    mutationFn: (userId: string) => refreshFn({ data: { userId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dossiers"] }),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading user profiles…</div>;
  if (error) return <div className="p-6 text-sm text-destructive">This section is restricted to the owner account.</div>;

  const users = data?.users ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">User Profiles</h2>
        <p className="text-sm text-muted-foreground">
          Yusuf's private read of every user, built from their conversations. Visible to you only.
        </p>
      </div>

      {users.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}

      <div className="space-y-3">
        {users.map((u) => {
          const d = u.dossier as Record<string, string | number | null> | null;
          const expanded = open === u.user_id;
          return (
            <div key={u.user_id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setOpen(expanded ? null : u.user_id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <UserSearch className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email ?? u.user_id}</p>
                  </div>
                </button>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {d ? `${d["confidence"]} confidence · ${d["message_count"]} msgs` : "not profiled"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={refresh.isPending}
                  onClick={() => refresh.mutate(u.user_id)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
                  <span className="ml-1.5 hidden sm:inline">Analyse</span>
                </Button>
              </div>

              {expanded && (
                <div className="space-y-3 border-t border-border p-4 text-sm">
                  {!d && <p className="text-muted-foreground">No profile yet — run Analyse.</p>}
                  {d && (
                    <>
                      {d["summary"] && <p className="text-foreground/90">{String(d["summary"])}</p>}
                      <dl className="grid gap-3 sm:grid-cols-2">
                        {DIMENSIONS.map((dim) => (
                          <div key={dim.key} className="rounded-lg bg-muted/40 p-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {dim.label}
                            </dt>
                            <dd className="mt-1 text-foreground/90">
                              {d[dim.key] ? String(d[dim.key]) : "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
