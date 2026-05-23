import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site-chrome";
import { Scanner } from "@/components/scanner";
import {
  ShieldAlert, Network, Gauge, ListChecks, ClipboardPaste, Activity, Eye,
  GraduationCap, Briefcase, Camera, Rocket, Wrench, ArrowRight, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberOracle — Detect your digital footprint risk before others do" },
      { name: "description", content: "Paste any text and instantly detect exposed PII, get a risk score, and actionable privacy recommendations. Client-side. Zero servers." },
      { property: "og:title", content: "CyberOracle — Digital footprint risk scanner" },
      { property: "og:description", content: "Paste text. See what's exposed. Get a privacy risk score in seconds." },
    ],
  }),
  component: Landing,
});

const highlights = [
  { icon: ShieldAlert, title: "PII Detection Engine", body: "16+ detectors covering emails, phones, government IDs, cards, addresses, IPs and more — all in regex you can audit." },
  { icon: Network, title: "Correlation Risk Analysis", body: "We flag combinations — name + city + employer — that defeat pseudonymization." },
  { icon: Gauge, title: "Privacy Exposure Scoring", body: "A weighted 0–100 score with category breakdowns so you know where to start." },
  { icon: ListChecks, title: "Actionable Recommendations", body: "Concrete next steps prioritized by what would actually reduce your exposure." },
];

const steps = [
  { icon: ClipboardPaste, title: "Paste text", body: "Resume, JSON, an email thread — anything." },
  { icon: Activity, title: "Get a risk score", body: "Weighted across four categories of exposure." },
  { icon: Eye, title: "See what's exposed", body: "Masked findings, positions, and how to fix it." },
];

const useCases = [
  { icon: GraduationCap, label: "Students", desc: "Scrub LinkedIn, resumes, and class projects." },
  { icon: Briefcase, label: "Job seekers", desc: "Catch leaked details before recruiters do." },
  { icon: Camera, label: "Creators", desc: "Screenshot safely. Mask before you ship." },
  { icon: Rocket, label: "Founders", desc: "Vet pitch decks and customer docs." },
  { icon: Wrench, label: "Freelancers", desc: "Sanitize portfolios and case studies." },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-bg pointer-events-none" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
                Client-side scanner — your text never leaves your browser
              </div>
              <h1 className="font-display mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
                Detect your <span className="text-gradient-teal">digital footprint risk</span> before others do.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                Paste any text — a resume, an email thread, raw JSON. CyberOracle finds exposed personal information,
                scores your privacy risk, and tells you exactly what to fix.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#scanner"
                  className="inline-flex items-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all glow-teal"
                >
                  Try the Scanner <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/scanner"
                  className="inline-flex items-center gap-2 min-h-12 px-6 rounded-xl bg-surface border border-border hover:border-neon/40 font-medium"
                >
                  View Demo
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
                <div><span className="text-foreground font-semibold">16+</span> detectors</div>
                <div><span className="text-foreground font-semibold">0</span> servers touched</div>
                <div><span className="text-foreground font-semibold">4</span> risk categories</div>
              </div>
            </div>

            <a href="#highlights" aria-label="Scroll to content" className="hidden md:inline-flex absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-5 w-5 animate-bounce" />
            </a>
          </div>
        </section>

        {/* HIGHLIGHTS */}
        <section id="highlights" className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-neon">What it does</div>
            <h2 className="font-display mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              A real privacy audit, in seconds.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h) => (
              <div key={h.title} className="group rounded-2xl bg-card border border-border p-6 hover:border-neon/40 transition-colors">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30 group-hover:ring-neon/40 transition">
                  <h.icon className="h-5 w-5 text-neon" />
                </span>
                <h3 className="mt-5 font-medium">{h.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
          <div className="text-xs uppercase tracking-widest text-neon">How it works</div>
          <h2 className="font-display mt-2 text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
            Three steps. No accounts. No uploads.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl bg-card border border-border p-6">
                <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
                <span className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <s.icon className="h-5 w-5 text-neon" />
                </span>
                <h3 className="mt-5 font-medium text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASES */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
          <div className="text-xs uppercase tracking-widest text-neon">Who it's for</div>
          <h2 className="font-display mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Built for anyone who ships text into the world.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {useCases.map((u) => (
              <div key={u.label} className="rounded-2xl bg-card border border-border p-5 hover:border-neon/40 transition-colors">
                <u.icon className="h-5 w-5 text-neon" />
                <div className="mt-4 font-medium">{u.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{u.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* INLINE SCANNER */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
          <Scanner />
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-24">
          <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-10 sm:p-14 text-center">
            <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
                Know what you're <span className="text-gradient-teal">leaking</span>.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Run a scan now. It takes less time than it took to read this page.
              </p>
              <Link
                to="/scanner"
                className="mt-8 inline-flex items-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 glow-teal"
              >
                Open the Scanner <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
