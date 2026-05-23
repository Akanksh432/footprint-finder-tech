import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CyberOracle" },
      { name: "description", content: "Terms governing your use of CyberOracle's privacy scanner." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl w-full px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-xs uppercase tracking-widest text-neon">Legal</div>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg">1. Use of service</h2>
            <p>CyberOracle is provided "as is" for personal privacy auditing. You agree not to misuse the service, abuse rate limits, or attempt to bypass authentication.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">2. No warranty</h2>
            <p>The PII scanner uses pattern matching that may produce false positives or miss certain types of data. Do not rely on it as the sole control for sensitive workflows.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">3. Your content</h2>
            <p>You retain ownership of any text you scan or save. We do not claim rights to your content.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg">4. Termination</h2>
            <p>You may stop using the service at any time. We may suspend accounts that violate these terms.</p>
          </section>
          <p className="text-xs">This is a placeholder terms document for an MVP. Consult counsel before relying on it for production use.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
