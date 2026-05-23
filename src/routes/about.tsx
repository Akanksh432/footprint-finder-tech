import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";
import { Lock, Cpu, Eye, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CyberOracle" },
      { name: "description", content: "Why CyberOracle exists: a transparent, client-side privacy scanner built for the people who actually ship the documents." },
      { property: "og:title", content: "About CyberOracle" },
      { property: "og:description", content: "A transparent, client-side privacy scanner. No accounts. No uploads." },
    ],
  }),
  component: About,
});

const principles = [
  { icon: Lock, title: "Privacy by architecture", body: "Detection runs in your browser. There is no server endpoint to leak from because there is no server." },
  { icon: Cpu, title: "Auditable logic", body: "Every detector is a regex you can inspect and challenge. No black-box ML deciding what's sensitive." },
  { icon: Eye, title: "Correlation-first", body: "Single fields are easy. Real exposure comes from combinations — that's what we score." },
  { icon: Zap, title: "Fast feedback loop", body: "A scan returns in milliseconds. Use it as a pre-flight check before every paste." },
];

function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-4xl w-full px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-xs uppercase tracking-widest text-neon">About</div>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
          Built for people who treat data like it <span className="text-gradient-teal">matters</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          CyberOracle is a privacy audit tool that runs entirely in your browser.
          Paste text. See what's exposed. Get specific recommendations.
          We don't store, transmit, or log anything you scan.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {principles.map((p) => (
            <div key={p.title} className="rounded-2xl bg-card border border-border p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <p.icon className="h-5 w-5 text-neon" />
              </span>
              <h3 className="mt-5 font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-card border border-border p-8">
          <h2 className="font-display text-2xl font-semibold">How scoring works</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Each finding belongs to one of four categories. Categories are weighted by how dangerous they are when exposed:
          </p>
          <ul className="mt-4 grid gap-2 text-sm font-mono">
            <li><span className="text-neon">direct</span> × 3 — emails, phones, government IDs, cards</li>
            <li><span className="text-neon">correlation</span> × 2.5 — combinations that re-identify you</li>
            <li><span className="text-neon">indirect</span> × 2 — DOB, address, IP</li>
            <li><span className="text-neon">social</span> × 1 — password hints, security answers</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground font-mono">
            score = min(100, (Σ count × weight) / 5 × 10)
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/scanner"
            className="inline-flex items-center min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 glow-teal"
          >
            Run a scan
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
