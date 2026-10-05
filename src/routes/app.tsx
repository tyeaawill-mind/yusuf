import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import AppPage from "@/components/app-page";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [
    { title: "Workspace — Yusuf" },
    { name: "description", content: "Your Yusuf workspace for concise research, decisions and personal organisation." },
    { property: "og:title", content: "Workspace — Yusuf" },
    { property: "og:description", content: "Read research briefs and organise your work with Yusuf." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: AppPage,
});
