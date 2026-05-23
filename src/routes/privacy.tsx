import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CyberOracle" },
      { name: "description", content: "How CyberOracle handles your data: scanning runs client-side, saved scans are scoped to your account." },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl w-full px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-xs uppercase tracking-widest text-neon">Legal</div>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg">1. Scanner data</h2>
            <p>The PII scanner runs entirely in your browser. Text you paste is never transmitted to our servers unless you explicitly save a scan to your account.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">2. Saved scans</h2>
            <p>If you create an account and save a scan, the input text, findings, and risk score are stored in our database, scoped to your user ID with row-level security. Only you can read or delete them.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">3. Account data</h2>
            <p>We store your email address and the full name you provide at sign-up. We do not share account data with third parties.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">4. Cookies</h2>
            <p>We use a session cookie to keep you signed in. No analytics or advertising cookies.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">5. Deletion</h2>
            <p>You can delete any saved scan at any time from your dashboard. Account deletion is available on request.</p>
          </section>
          <p className="text-xs">This is a placeholder policy for an MVP. Consult counsel before relying on it for production use.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
