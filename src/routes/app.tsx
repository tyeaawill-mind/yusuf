import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: AppPage,
});

import AppPage from "@/components/app-page";

function AppPageWrapper() {
  return <AppPage />;
}
