import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";
import { Scanner } from "@/components/scanner";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Exposure Analyzer — CyberOracle" },
      { name: "description", content: "Submit identity clues and see how they correlate into real attack paths. Confidence-scored findings, explainable risk, and a prioritized fix plan." },
      { property: "og:title", content: "CyberOracle Exposure Analyzer" },
      { property: "og:description", content: "Detect, correlate, explain, and fix your digital exposure." },
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
          <div className="text-xs uppercase tracking-widest text-neon">Exposure Analyzer</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
            From raw exposure to <span className="text-gradient-teal">explainable defense</span>.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Drop in the identity clues you might share publicly — name, handle, email, phone, city,
            employer, bio. We detect signals, score confidence, correlate them into attack paths,
            and rank the actions that actually reduce your exposure.
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
