import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Yusuf — Personal Research Assistant" },
    { name: "description", content: "Examine questions, evidence and decisions with Yusuf, your personal research assistant." },
    { property: "og:title", content: "Yusuf — Personal Research Assistant" },
    { property: "og:description", content: "Examine questions, evidence and decisions with Yusuf." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
