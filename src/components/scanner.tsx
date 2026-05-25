import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeIdentity,
  DEMO_INPUT,
  CATEGORY_META,
  PRIORITY_META,
  scoreColor,
  generateExternalAttackPaths,
  type ScanResult,
  type Finding,
  type Category,
  type IdentityInput,
  type Priority,
} from "@/lib/scanner";
import {
  Mail, Phone, MapPin, Network, KeyRound, User, Building2, Copy,
  EyeOff, Loader2, ShieldAlert, ShieldCheck, Sparkles, Eraser,
  FlaskConical, Activity, Info, Download, Trash2, FileText, Lightbulb,
  AtSign, GraduationCap, Globe, Target, GitBranch, Wrench, ChevronRight,
  Fingerprint, FileJson, FileCode,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { saveScan } from "@/lib/scans-api";
import { toast } from "sonner";
import {
  DomainReconCard, BreachCard, UsernamePresenceCard,
  ModuleStatusGrid, ModuleStatusPills, type ModuleStatuses,
} from "@/components/osint-results";
import { runOsintScan, saveOsintResults, type OsintModuleResults } from "@/lib/osint-api";
import { generateMarkdownReport, downloadFile } from "@/lib/report-generator";

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  direct: Fingerprint, indirect: MapPin, correlation: Network, social: KeyRound,
};

const FIELD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  name: User, username: AtSign, email: Mail, phone: Phone,
  city: MapPin, college: GraduationCap, employer: Building2, domain: Globe,
};

const PATH_TONE: Record<"low" | "medium" | "high", string> = {
  low: "from-success/20 to-success/5 ring-success/30 text-success",
  medium: "from-warning/20 to-warning/5 ring-warning/30 text-warning",
  high: "from-danger/20 to-danger/5 ring-danger/30 text-danger",
};

const PRIORITY_RING: Record<Priority, string> = {
  fix_now: "ring-danger/40 bg-danger/5",
  fix_soon: "ring-warning/40 bg-warning/5",
  monitor: "ring-border bg-surface/40",
};

const PRIORITY_DOT: Record<Priority, string> = {
  fix_now: "bg-danger", fix_soon: "bg-warning", monitor: "bg-muted-foreground",
};

const BIO_MAX = 8000;

function useCountUp(value: number, duration = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

function Tip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-md bg-foreground text-background px-2 py-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg max-w-[240px] w-max whitespace-normal text-center">
        {label}
      </span>
    </span>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  const tone =
    value >= 80 ? "bg-success/10 text-success ring-success/30"
    : value >= 60 ? "bg-primary/10 text-neon ring-primary/30"
    : "bg-muted/40 text-muted-foreground ring-border";
  const label = value >= 80 ? "High confidence" : value >= 60 ? "Validated" : "Low confidence";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} · {value}%
    </span>
  );
}

function SeverityChip({ value }: { value: number }) {
  const tone =
    value >= 80 ? "bg-danger/10 text-danger ring-danger/30"
    : value >= 55 ? "bg-warning/10 text-warning ring-warning/30"
    : "bg-success/10 text-success ring-success/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${tone}`}>
      Severity {value}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const animated = useCountUp(score);
  const color = scoreColor(score);
  const stroke = color === "success" ? "var(--color-success)" : color === "warning" ? "var(--color-warning)" : "var(--color-danger)";
  const r = 56, c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-4xl font-bold" style={{ color: stroke }}>{animated}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, suffix }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; suffix?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="rounded-2xl bg-card border border-border p-5 card-hover">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Icon className="h-4 w-4 text-neon" />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="font-display text-4xl font-bold">{animated}</div>
        {suffix && <div className="text-muted-foreground mb-2 text-sm">{suffix}</div>}
      </div>
    </div>
  );
}

function CategoryCard({ category, count }: { category: Category; count: number }) {
  const Icon = CATEGORY_ICON[category];
  const meta = CATEGORY_META[category];
  return (
    <div className="rounded-2xl bg-card border border-border p-5 card-hover">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Icon className="h-4 w-4 text-neon" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-1.5">
            {meta.label}
            <Tip label={meta.description}><Info className="h-3 w-3 text-muted-foreground" /></Tip>
          </div>
          <div className="text-xs text-muted-foreground">{count} signal{count === 1 ? "" : "s"}</div>
        </div>
        <div className="font-display text-2xl font-bold">{count}</div>
      </div>
    </div>
  );
}

function EvidenceCard({ f, onHide }: { f: Finding; onHide: (id: string) => void }) {
  const Icon = CATEGORY_ICON[f.category];
  return (
    <div className="rounded-2xl bg-card border border-border p-5 card-hover">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30 flex-shrink-0">
            <Icon className="h-4 w-4 text-neon" />
          </span>
          <div className="min-w-0">
            <div className="font-medium flex items-center gap-2 flex-wrap">
              {f.type}
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface ring-1 ring-border text-muted-foreground">
                {CATEGORY_META[f.category].label}
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground break-all">{f.maskedValue}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ConfidenceChip value={f.confidence} />
          <SeverityChip value={f.severity} />
          <button
            title="Copy masked value"
            onClick={() => { navigator.clipboard?.writeText(f.maskedValue); toast.success("Copied"); }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
          ><Copy className="h-3.5 w-3.5" /></button>
          <button
            title="Hide"
            onClick={() => onHide(f.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
          ><EyeOff className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-surface/60 border border-border p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Evidence</div>
        <div className="font-mono text-xs leading-relaxed">{f.evidence}</div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Why it matters</div>
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.why}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neon">Recommended fix</div>
          <div className="mt-1 text-xs leading-relaxed">{f.fix}</div>
        </div>
      </div>
    </div>
  );
}

function AttackPathCard({ p }: { p: ScanResult["attackPaths"][number] }) {
  const tone = PATH_TONE[p.severity];
  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br ${tone} ring-1 p-5 card-hover`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/40 ring-1 ring-current flex-shrink-0">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest opacity-80">Attack Path</div>
            <div className="font-display text-lg font-semibold mt-0.5 text-foreground">{p.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 bg-background/40 ring-current">
            Severity {p.severity}
          </span>
          <ConfidenceChip value={p.confidence} />
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{p.description}</p>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1.5">Built from</div>
        <div className="flex flex-wrap gap-1.5">
          {p.componentLabels.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-background/60 ring-1 ring-border text-foreground">
              <GitBranch className="h-3 w-3 opacity-60" /> {l}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-foreground/90">
        <Wrench className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>{p.fix}</span>
      </div>
    </div>
  );
}

function MitigationGroup({ priority, actions }: { priority: Priority; actions: ScanResult["actions"] }) {
  const meta = PRIORITY_META[priority];
  if (actions.length === 0) return null;
  return (
    <div className={`rounded-2xl border ring-1 p-5 ${PRIORITY_RING[priority]}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[priority]}`} />
          <h4 className="font-medium">{meta.label}</h4>
          <span className="text-xs text-muted-foreground">({actions.length})</span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">{meta.description}</span>
      </div>
      <ul className="space-y-3">
        {actions.map((a) => (
          <li key={a.id} className="flex items-start gap-3">
            <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse-soft">
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-card border border-border" />)}
      </div>
      <div className="h-64 rounded-2xl bg-card border border-border" />
      <div className="h-48 rounded-2xl bg-card border border-border" />
    </div>
  );
}

function formatReport(input: IdentityInput, result: ScanResult): string {
  const L: string[] = [];
  L.push("CYBERORACLE — EXPOSURE INTELLIGENCE REPORT");
  L.push("==========================================");
  L.push(`Generated: ${new Date().toLocaleString()}`);
  L.push(`Exposure Score: ${result.score}/100`);
  L.push(`Validated findings: ${result.validatedFindings} / ${result.totalFound}`);
  L.push(`Attack paths: ${result.attackPaths.length}`);
  L.push("");
  L.push("ATTACK PATHS");
  if (result.attackPaths.length === 0) L.push("  (none detected)");
  result.attackPaths.forEach((p, i) => {
    L.push(`  ${i + 1}. [${p.severity.toUpperCase()}] ${p.name} — confidence ${p.confidence}%`);
    L.push(`     ${p.description}`);
    L.push(`     Built from: ${p.componentLabels.join(", ")}`);
    L.push(`     Fix: ${p.fix}`);
  });
  L.push("");
  L.push("FINDINGS");
  result.findings.forEach((f, i) => {
    L.push(`  ${i + 1}. [${f.riskLevel.toUpperCase()}] ${f.type} → ${f.maskedValue}`);
    L.push(`     Confidence ${f.confidence}% · Severity ${f.severity}`);
    L.push(`     Evidence: ${f.evidence}`);
    L.push(`     Fix: ${f.fix}`);
  });
  L.push("");
  L.push("MITIGATION PLAN");
  (["fix_now", "fix_soon", "monitor"] as Priority[]).forEach((p) => {
    const items = result.actions.filter((a) => a.priority === p);
    if (items.length === 0) return;
    L.push(`  ${PRIORITY_META[p].label}:`);
    items.forEach((a, i) => L.push(`    ${i + 1}. ${a.title} — ${a.description}`));
  });
  return L.join("\n");
}

const FIELDS: { key: keyof IdentityInput; label: string; placeholder: string; type?: string }[] = [
  { key: "name", label: "Full name", placeholder: "John Smith" },
  { key: "username", label: "Username / handle", placeholder: "johnsmith123" },
  { key: "email", label: "Email", placeholder: "john@example.com", type: "email" },
  { key: "phone", label: "Phone", placeholder: "+1 415 555 0142" },
  { key: "city", label: "City", placeholder: "Hyderabad" },
  { key: "college", label: "College", placeholder: "IIIT Hyderabad" },
  { key: "employer", label: "Employer", placeholder: "TechCorp" },
  { key: "domain", label: "Personal domain", placeholder: "yourname.dev" },
];

export function Scanner({ autoFocus = false, simple = false }: { autoFocus?: boolean; simple?: boolean }) {
  const [input, setInput] = useState<IdentityInput>({});
  const [result, setResult] = useState<ScanResult | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  useEffect(() => { if (autoFocus) taRef.current?.focus(); }, [autoFocus]);

  const setField = (k: keyof IdentityInput, v: string) =>
    setInput((s) => ({ ...s, [k]: v }));

  const hasInput = useMemo(
    () => Object.values(input).some((v) => (v ?? "").trim().length > 0),
    [input]
  );

  const loadDemo = () => setInput(DEMO_INPUT);
  const clearAll = () => {
    setInput({}); setResult(null); setHidden(new Set()); setSavedScanId(null);
  };

  const handleScan = async () => {
    if (!hasInput) return;
    setScanning(true);
    setResult(null);
    setHidden(new Set());
    setSavedScanId(null);
    await new Promise((r) => setTimeout(r, 700));
    const r = analyzeIdentity(input);
    setResult(r);
    setScanning(false);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    if (user) {
      try {
        // Persist using the existing schema. Bio (or a synthesized summary)
        // is stored as input_text so the saved scan stays meaningful.
        const persistText = input.bio?.trim() || FIELDS
          .filter((f) => (input[f.key] ?? "").trim())
          .map((f) => `${f.label}: ${input[f.key]}`).join("\n");
        const scan = await saveScan(user.id, persistText, r);
        setSavedScanId(scan.id);
        toast.success("Scan saved to your dashboard");
      } catch (err) {
        toast.error("Could not save scan", { description: (err as Error).message });
      }
    }
  };

  const visibleFindings = useMemo(
    () => (result?.findings ?? []).filter((f) => !hidden.has(f.id)),
    [result, hidden]
  );

  const copyFindings = () => {
    const lines = visibleFindings.map((f) =>
      `${f.type}: ${f.maskedValue} [conf ${f.confidence}% · sev ${f.severity}]`
    ).join("\n");
    navigator.clipboard?.writeText(lines || "No findings");
    toast.success("Findings copied");
  };

  const exportReport = () => {
    if (!result) return;
    navigator.clipboard?.writeText(formatReport(input, result));
    toast.success("Report copied to clipboard");
  };

  const scoreLevel = result
    ? result.score < 30 ? "Low exposure" : result.score < 60 ? "Moderate exposure" : "High exposure"
    : "";

  const fixNow = result?.actions.filter((a) => a.priority === "fix_now") ?? [];
  const fixSoon = result?.actions.filter((a) => a.priority === "fix_soon") ?? [];
  const monitor = result?.actions.filter((a) => a.priority === "monitor") ?? [];

  return (
    <div id="scanner" className="space-y-8">
      {/* Input panel */}
      <div className="rounded-3xl bg-card border border-border p-5 sm:p-6 ring-neon">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-4 w-4 text-neon" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Identity Exposure Review</h2>
              <p className="text-xs text-muted-foreground">
                Enter the clues you'd share publicly. We detect, correlate, and explain — locally in your browser.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadDemo}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-sm"
            >
              <FlaskConical className="h-3.5 w-3.5" /> Load demo identity
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-sm"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        {!simple && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f) => {
              const Icon = FIELD_ICON[f.key as string] ?? User;
              return (
                <label key={f.key} className="block">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{f.label}</div>
                  <div className="flex items-center gap-2 rounded-lg bg-input border border-border focus-within:border-neon/50 transition-colors px-3">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      type={f.type ?? "text"}
                      value={input[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Bio / profile / post text {simple && "(paste anything)"}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {(input.bio ?? "").length.toLocaleString()} / {BIO_MAX.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-input border border-border focus-within:border-neon/50 transition-colors">
            <textarea
              ref={taRef}
              value={input.bio ?? ""}
              onChange={(e) => setField("bio", e.target.value.slice(0, BIO_MAX))}
              placeholder={
                simple
                  ? "Paste any text — bio, post, resume, JSON. We'll detect exposed identifiers and correlate them."
                  : "Paste a bio, social post, or profile snippet. We'll detect identifiers in context."
              }
              className="w-full min-h-40 sm:min-h-48 bg-transparent p-4 font-mono text-sm resize-y outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Defensive tool. Your input stays in this browser.
          </div>
          <button
            onClick={handleScan}
            disabled={!hasInput || scanning}
            className={`relative inline-flex items-center gap-2 min-h-12 px-7 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-teal overflow-hidden ${scanning ? "scan-sweep" : ""}`}
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            {scanning ? "Analyzing…" : "Run Exposure Intelligence Scan"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div id="results">
        {scanning && <Skeleton />}
        {result && !scanning && (
          <div className="space-y-8 animate-fade-up">
            {/* Result toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs uppercase tracking-widest text-neon">Intelligence Report</div>
              <div className="flex items-center gap-2 flex-wrap">
                {savedScanId && (
                  <a
                    href={`/scans/${savedScanId}`}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" /> View saved scan
                  </a>
                )}
                <button onClick={copyFindings} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-xs">
                  <Copy className="h-3.5 w-3.5" /> Copy findings
                </button>
                <button onClick={exportReport} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-xs">
                  <Download className="h-3.5 w-3.5" /> Export report
                </button>
                <button onClick={clearAll} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-danger/40 hover:text-danger text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </button>
              </div>
            </div>

            {/* Score + KPI strip */}
            <div className="grid gap-4 lg:grid-cols-[1.2fr,2fr]">
              <div className="rounded-3xl bg-card border border-border p-6 ring-neon flex items-center gap-6">
                <ScoreRing score={result.score} />
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Exposure Score</div>
                  <div className="font-display text-2xl font-semibold mt-1">{scoreLevel}</div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {result.score >= 60
                      ? "Several validated signals combine into real attack paths. Start with Fix-Now actions."
                      : result.score >= 30
                        ? "Material exposure. Address the highest-severity items before publishing further."
                        : "Minimal exposure detected. Re-scan whenever you publish new identity-adjacent content."}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <KpiCard label="Validated findings" value={result.validatedFindings} icon={ShieldAlert} suffix={`/ ${result.totalFound}`} />
                <KpiCard label="Attack paths" value={result.attackPaths.length} icon={Target} />
                <KpiCard label="Fix-now actions" value={fixNow.length} icon={Wrench} />
                <KpiCard label="Categories affected" value={result.categoriesAffected} icon={Network} suffix="/ 4" />
              </div>
            </div>

            {/* Attack paths */}
            {result.attackPaths.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-neon" />
                  <h3 className="font-display text-xl font-semibold">Correlated attack paths</h3>
                  <span className="text-xs text-muted-foreground">({result.attackPaths.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.attackPaths.map((p) => <AttackPathCard key={p.id} p={p} />)}
                </div>
              </section>
            )}

            {/* Category breakdown */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-neon" />
                <h3 className="font-display text-xl font-semibold">Signals by category</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(["direct", "indirect", "correlation", "social"] as Category[]).map((c) => (
                  <CategoryCard key={c} category={c} count={result.counts[c]} />
                ))}
              </div>
            </section>

            {/* Mitigation planner */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-neon" />
                <h3 className="font-display text-xl font-semibold">Mitigation plan</h3>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <MitigationGroup priority="fix_now" actions={fixNow} />
                <MitigationGroup priority="fix_soon" actions={fixSoon} />
                <MitigationGroup priority="monitor" actions={monitor} />
              </div>
            </section>

            {/* Evidence panel */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-neon" />
                <h3 className="font-display text-xl font-semibold">Evidence</h3>
                <span className="text-xs text-muted-foreground">({visibleFindings.length})</span>
              </div>
              {visibleFindings.length === 0 ? (
                <div className="rounded-2xl bg-card border border-border p-10 text-center text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-3 text-success" />
                  <div className="font-medium text-foreground">No signals to display</div>
                  <div className="text-xs mt-1">This input doesn't expose meaningful identifiers.</div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {visibleFindings.map((f) => (
                    <EvidenceCard key={f.id} f={f} onHide={(id) => setHidden((s) => new Set(s).add(id))} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
