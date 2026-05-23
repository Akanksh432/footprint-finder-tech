import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";
import { Scanner } from "@/components/scanner";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — CyberOracle" },
      { name: "description", content: "Paste any text to detect exposed PII and get a privacy risk score. Runs entirely in your browser." },
      { property: "og:title", content: "CyberOracle Scanner" },
      { property: "og:description", content: "Paste text. Get a risk score. Fix what's exposed." },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-5 sm:px-8 py-12 sm:py-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-neon">Scanner</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
            Paste it. See what's <span className="text-gradient-teal">exposed</span>.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Drop in a resume, an email, raw JSON — anything text. We run 16+ detectors locally
            and give you a weighted privacy risk score with category breakdowns.
          </p>
        </div>
        <div className="mt-10">
          <Scanner autoFocus />
        </div>
      </main>
      <Footer />
    </div>
  );
}
