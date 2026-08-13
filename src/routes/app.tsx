import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccessStatus } from "@/lib/acis.functions";
import AppPage from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: AppGate,
});

function AppGate() {
  const fetchStatus = useServerFn(getAccessStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["access-status"],
    queryFn: () => fetchStatus({}),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (data && data.status !== "approved") {
    const declined = data.status === "declined";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          {declined ? (
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
          ) : (
            <Clock className="mx-auto h-10 w-10 text-primary" />
          )}
          <h1 className="mt-4 text-lg font-semibold text-card-foreground font-display">
            {declined ? "Access declined" : "Awaiting owner approval"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {declined
              ? "Your ACIS screening was reviewed and access to Yusuf was not granted."
              : "Your ACIS answers were sent to the owner for identity approval. You will be able to enter as soon as the request is approved."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> {data.email}
          </div>
          <Button
            variant="ghost"
            className="mt-6"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <AppPage />;
}
