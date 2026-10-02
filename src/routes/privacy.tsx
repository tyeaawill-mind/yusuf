import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy — Yusuf" },
    { name: "description", content: "How Yusuf handles account, conversation, file, and preference data." },
    { property: "og:title", content: "Privacy — Yusuf" },
    { property: "og:description", content: "How Yusuf handles account, conversation, file, and preference data." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <main className="min-h-screen bg-background px-5 py-10 sm:py-16"><article className="mx-auto max-w-3xl"><Link to="/login" className="text-sm font-medium text-primary">Back to Yusuf</Link><h1 className="mt-8 text-4xl font-semibold text-foreground sm:text-5xl">Privacy</h1><p className="mt-3 text-sm text-muted-foreground">Last updated 2 October 2026</p><div className="mt-10 space-y-9">
    <Section title="Information Yusuf uses">Yusuf processes your account details, chosen name, conversations, tasks, goals, uploaded files, saved preferences, and security settings so the service can respond and remember context.</Section>
    <Section title="How information is used">Information is used to operate your account, generate requested research and assistance, protect the service, and improve continuity across your own sessions.</Section>
    <Section title="Private workspaces">User records are separated by account access rules. Some authorised administrative functions may be available to the service owner for safety and operation.</Section>
    <Section title="Connected services">When you request email, file, or external-search functions, relevant data may be sent to the connected provider needed to complete that request. Those providers apply their own terms and privacy practices.</Section>
    <Section title="Your choices">You may ask for a copy of your data, correction of inaccurate profile information, or deletion guidance. To request account-data deletion, contact the service owner from the email address linked to your account.</Section>
    <Section title="Safety">No online service can promise absolute security. Use two-factor authentication, avoid unnecessary sensitive information in chat, and immediately report suspected account misuse.</Section>
  </div></article></main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2><p className="text-base leading-8 text-muted-foreground">{children}</p></section>;
}