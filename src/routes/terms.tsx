import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Use — Yusuf" },
    { name: "description", content: "Terms governing access to and use of the Yusuf personal research assistant." },
    { property: "og:title", content: "Terms of Use — Yusuf" },
    { property: "og:description", content: "Terms governing access to and use of the Yusuf personal research assistant." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage title="Terms of use" updated="2 October 2026">
    <Section title="Purpose">Yusuf is an AI-assisted research and personal organisation service. It can help analyse information, organise tasks, and prepare drafts, but it does not replace a qualified lawyer, doctor, accountant, financial adviser, or other licensed professional.</Section>
    <Section title="Your responsibility">You remain responsible for decisions, instructions, account activity, and verifying important facts before acting. Do not use Yusuf for unlawful activity, deception, harm, or unauthorised access to another person’s account.</Section>
    <Section title="Accounts and security">Keep your sign-in details and second factor secure. You are responsible for activity under your account. Report suspected unauthorised access promptly and avoid placing highly sensitive credentials in ordinary chat.</Section>
    <Section title="AI output">AI output may be incomplete, outdated, or incorrect. Citations and legal, religious, financial, or factual claims should be checked against authoritative sources. No response creates a professional-client relationship.</Section>
    <Section title="Availability and content">The service may change or be interrupted. You retain rights in content you provide, while granting the limited permission needed to process it and provide the service.</Section>
    <Section title="Acceptable use">You must respect applicable law, privacy, intellectual property, and the rights of others. Access may be restricted where necessary to protect users, the service, or legal compliance.</Section>
  </LegalPage>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2><p className="text-base leading-8 text-muted-foreground">{children}</p></section>;
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-background px-5 py-10 sm:py-16"><article className="mx-auto max-w-3xl"><Link to="/login" className="text-sm font-medium text-primary">Back to Yusuf</Link><h1 className="mt-8 text-4xl font-semibold text-foreground sm:text-5xl">{title}</h1><p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p><div className="mt-10 space-y-9">{children}</div></article></main>;
}