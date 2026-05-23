import { useEffect, useMemo, useRef, useState } from "react";
import {
  scanText,
  DEMO_TEXT,
  CATEGORY_META,
  RISK_COLOR,
  scoreColor,
  getRecommendations,
  type ScanResult,
  type Finding,
  type Category,
} from "@/lib/scanner";
import {
  Mail, Phone, CreditCard, Fingerprint, MapPin, Calendar, Network,
  KeyRound, HelpCircle, Hash, User, Building2, Copy, EyeOff, Loader2,
  ShieldAlert, ShieldCheck, Sparkles, Eraser, FlaskConical, Activity,
} from "lucide-react";

const ICON_BY_TYPE: Record<string, React.ComponentType<{ className?: string }>> = {
  Email: Mail,
  "Phone (India)": Phone,
  "Phone (US)": Phone,
  Aadhaar: Fingerprint,
  PAN: Fingerprint,
  Passport: Fingerprint,
  "Credit Card": CreditCard,
  SSN: Fingerprint,
  "Date of Birth": Calendar,
  Address: MapPin,
  "IP Address": Network,
  "Password Keyword": KeyRound,
  "Security Question": HelpCircle,
  "Account Number": Hash,
  "Full Name": User,
  "City + Role": MapPin,
  "Company + Title": Building2,
};

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  direct: Fingerprint,
  indirect: MapPin,
  correlation: Network,
  social: KeyRound,
};

const MAX = 10000;

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

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-success/10 text-success ring-success/30",
    medium: "bg-warning/10 text-warning ring-warning/30",
    high: "bg-danger/10 text-danger ring-danger/30",
  }[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
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
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-4xl font-bold" style={{ color: stroke }}>{animated}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix, accent }: { label: string; value: number; suffix?: string; accent?: string }) {
  const animated = useCountUp(value);
  return (
    <div className="rounded-2xl bg-card border border-border p-6 ring-neon">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <div className={`font-display text-5xl font-bold ${accent ?? ""}`}>{animated}</div>
        {suffix && <div className="text-muted-foreground mb-2">{suffix}</div>}
      </div>
    </div>
  );
}

function CategoryCard({ category, count, max }: { category: Category; count: number; max: number }) {
  const Icon = CATEGORY_ICON[category];
  const meta = CATEGORY_META[category];
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const level = count === 0 ? "low" : count >= 3 ? "high" : "medium";
  return (
    <div className="rounded-2xl bg-card border border-border p-5 hover:border-neon/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Icon className="h-4 w-4 text-neon" />
          </span>
          <div>
            <div className="font-medium">{meta.label}</div>
            <div className="text-xs text-muted-foreground">{count} finding{count === 1 ? "" : "s"}</div>
          </div>
        </div>
        <RiskBadge level={level as "low" | "medium" | "high"} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{meta.description}</p>
      <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: count === 0 ? "var(--color-border)" :
              level === "high" ? "var(--color-danger)" :
              "var(--color-warning)",
          }}
        />
      </div>
    </div>
  );
}

function FindingsTable({ findings, onHide }: { findings: Finding[]; onHide: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: keyof Finding; dir: "asc" | "desc" }>({ key: "start", dir: "asc" });
  const sorted = useMemo(() => {
    const s = [...findings].sort((a, b) => {
      const av = a[sort.key] as never, bv = b[sort.key] as never;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return s;
  }, [findings, sort]);

  const toggle = (key: keyof Finding) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const headers: { key: keyof Finding; label: string }[] = [
    { key: "type", label: "Type" },
    { key: "maskedValue", label: "Value (masked)" },
    { key: "category", label: "Category" },
    { key: "riskLevel", label: "Risk" },
    { key: "start", label: "Position" },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neon" />
          <h3 className="font-medium">Findings</h3>
          <span className="text-xs text-muted-foreground">({findings.length})</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-surface/50">
            <tr>
              {headers.map((h) => (
                <th key={h.key} className="text-left px-5 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggle(h.key)}>
                  <span className="inline-flex items-center gap-1 hover:text-foreground">
                    {h.label}
                    {sort.key === h.key && <span>{sort.dir === "asc" ? "↑" : "↓"}</span>}
                  </span>
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => {
              const Icon = ICON_BY_TYPE[f.type] ?? ShieldAlert;
              return (
                <tr key={f.id} className="border-t border-border hover:bg-surface/40 transition-colors">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{f.type}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.maskedValue}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-surface ring-1 ring-border">
                      {CATEGORY_META[f.category].label}
                    </span>
                  </td>
                  <td className="px-5 py-3"><RiskBadge level={f.riskLevel} /></td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.start}–{f.end}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Copy masked value"
                        onClick={() => navigator.clipboard?.writeText(f.maskedValue)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Hide"
                        onClick={() => onHide(f.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-success" />
                No findings. Looking clean.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse-soft">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-card border border-border" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-card border border-border" />)}
      </div>
      <div className="h-64 rounded-2xl bg-card border border-border" />
    </div>
  );
}

export function Scanner({ autoFocus = false }: { autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  useEffect(() => { if (autoFocus) taRef.current?.focus(); }, [autoFocus]);

  const handleScan = async () => {
    if (!text.trim()) return;
    setScanning(true);
    setResult(null);
    setHidden(new Set());
    setSaved(null);
    await new Promise((r) => setTimeout(r, 600));
    const r = scanText(text);
    setResult(r);
    setScanning(false);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    if (user) {
      setSaving(true);
      try {
        const scan = await saveScan(user.id, text, r);
        setSaved(scan.id);
        toast.success("Scan saved to your dashboard");
      } catch (err) {
        toast.error("Could not save scan", { description: (err as Error).message });
      } finally {
        setSaving(false);
      }
    }
  };

  const visibleFindings = useMemo(
    () => (result?.findings ?? []).filter((f) => !hidden.has(f.id)),
    [result, hidden]
  );

  const maxCount = result ? Math.max(1, ...(Object.values(result.counts) as number[])) : 1;
  const recommendations = result ? getRecommendations(result) : [];

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
              <h2 className="font-display text-lg font-semibold">PII Scanner</h2>
              <p className="text-xs text-muted-foreground">Runs in your browser. Nothing leaves this page.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setText(DEMO_TEXT)}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-sm"
            >
              <FlaskConical className="h-3.5 w-3.5" /> Load Demo Data
            </button>
            <button
              onClick={() => { setText(""); setResult(null); }}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-sm"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-input border border-border focus-within:border-neon/50 transition-colors">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Paste your resume, JSON data, email thread, or any text containing personal information..."
            className="w-full min-h-56 sm:min-h-72 bg-transparent p-4 font-mono text-sm resize-y outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground font-mono">
            {text.length.toLocaleString()} / {MAX.toLocaleString()} characters
          </div>
          <button
            onClick={handleScan}
            disabled={!text.trim() || scanning}
            className="inline-flex items-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-teal"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Scan Now"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div id="results">
        {scanning && <Skeleton />}
        {result && !scanning && (
          <div className="space-y-6 animate-fade-up">
            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Total PII Found" value={result.totalFound} accent="text-neon" />
              <div className="rounded-2xl bg-card border border-border p-6 flex items-center justify-between ring-neon">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk Score</div>
                  <div className="mt-3 text-sm text-muted-foreground max-w-[14ch]">
                    {result.score < 30 ? "Low exposure" : result.score < 60 ? "Moderate exposure" : "High exposure"}
                  </div>
                </div>
                <ScoreRing score={result.score} />
              </div>
              <KpiCard label="Categories Affected" value={result.categoriesAffected} suffix="/ 4" />
            </div>

            {/* Category Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {(["direct", "indirect", "correlation", "social"] as Category[]).map((c) => (
                <CategoryCard key={c} category={c} count={result.counts[c]} max={maxCount} />
              ))}
            </div>

            {/* Findings */}
            <FindingsTable
              findings={visibleFindings}
              onHide={(id) => setHidden((s) => new Set(s).add(id))}
            />

            {/* Recommendations */}
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-neon" />
                <h3 className="font-medium">Recommendations</h3>
              </div>
              <ul className="space-y-3">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neon flex-shrink-0" />
                    <span className="text-muted-foreground">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
