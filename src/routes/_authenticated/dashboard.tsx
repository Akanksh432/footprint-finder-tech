import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar, Footer } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listScans } from "@/lib/scans-api";
import { scoreColor } from "@/lib/scanner";
import { ShieldAlert, Plus, Activity, Gauge, AlertTriangle, FileSearch, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CyberOracle" }] }),
  component: Dashboard,
});

interface Row {
  id: string;
  created_at: string;
  risk_score: number;
  input_char_count: number;
  scan_summaries: {
    direct_count: number; indirect_count: number;
    correlation_count: number; social_count: number;
    total_findings: number;
  } | null;
}

type Filter = "all" | "high" | "medium" | "low";

function bucketOf(score: number): Filter {
  const c = scoreColor(score);
  return c === "danger" ? "high" : c === "warning" ? "medium" : "low";
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    try {
      const data = await listScans(user.id);
      setRows(data as unknown as Row[]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("scans-dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scans", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "scans", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const total = rows?.length ?? 0;
  const highRiskCount = rows?.filter((r) => bucketOf(Number(r.risk_score)) === "high").length ?? 0;
  const avg = total > 0 ? Math.round((rows!.reduce((s, r) => s + Number(r.risk_score), 0) / total)) : 0;

  const filtered = useMemo(() => {
    if (!rows) return null;
    return rows.filter((r) => {
      const bucket = bucketOf(Number(r.risk_score));
      const matchesFilter = filter === "all" || bucket === filter;
      const matchesSearch = !search.trim() || new Date(r.created_at).toLocaleString().toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [rows, filter, search]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All Scans" },
    { key: "high", label: "High Risk" },
    { key: "medium", label: "Medium Risk" },
    { key: "low", label: "Low Risk" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-5 sm:px-8 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-neon">Dashboard</div>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">Your scans</h1>
            <p className="mt-2 text-muted-foreground text-sm">Every scan you save lives here, scoped to your account.</p>
          </div>
          <button
            onClick={() => navigate({ to: "/scanner" })}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 glow-teal"
          >
            <Plus className="h-4 w-4" /> New scan
          </button>
        </div>

        {error && <div className="mt-6 rounded-lg bg-danger/10 text-danger ring-1 ring-danger/30 px-3 py-2 text-sm">{error}</div>}

        {/* KPI cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {rows === null ? (
            [0,1,2].map((i) => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)
          ) : (
            <>
              <KpiCard icon={Activity} label="Total scans" value={String(total)} />
              <KpiCard icon={AlertTriangle} label="High-risk scans" value={String(highRiskCount)} accent={highRiskCount > 0 ? "text-danger" : ""} />
              <KpiCard icon={Gauge} label="Avg risk score" value={String(avg)} accent={scoreColorClass(avg)} />
            </>
          )}
        </div>

        {/* Filter + search */}
        {rows !== null && rows.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`min-h-11 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-neon/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scans by date…"
                className="w-full min-h-11 pl-9 pr-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Scan list */}
        <div className="mt-6">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Recent scans</h2>
          {rows === null ? (
            <div className="space-y-3">
              {[0,1,2].map((i) => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : filtered && filtered.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-10 text-center text-sm text-muted-foreground">
              No scans match these filters.
            </div>
          ) : (
            <div className="grid gap-3">
              {(filtered ?? []).map((r) => (
                <Link
                  key={r.id}
                  to="/scans/$scanId"
                  params={{ scanId: r.id }}
                  className="group rounded-2xl bg-card border border-border p-5 card-hover flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="font-medium">{r.scan_summaries?.total_findings ?? 0} findings</span>
                      <span className="text-muted-foreground">· {r.input_char_count.toLocaleString()} chars</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      {(["direct","indirect","correlation","social"] as const).map((k) => {
                        const v = r.scan_summaries?.[`${k}_count` as const] ?? 0;
                        const active = v > 0;
                        return (
                          <span
                            key={k}
                            className={`px-2 py-0.5 rounded-md ring-1 ${active ? "bg-primary/15 ring-primary/30 text-foreground" : "bg-surface ring-border text-muted-foreground"}`}
                          >
                            {k} {v}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreChip score={Number(r.risk_score)} />
                    <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-neon transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-12 text-center">
      <div className="absolute inset-0 hero-mesh pointer-events-none opacity-60" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-30" />
      <div className="relative">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 animate-float">
          <FileSearch className="h-9 w-9 text-neon" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold">No scans yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Run your first scan and we'll keep a private history here. Only you can see them.
        </p>
        <Link to="/scanner" className="mt-6 inline-flex items-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 glow-teal">
          <Plus className="h-4 w-4" /> Run a scan
        </Link>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{className?: string}>; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 ring-neon card-hover">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Icon className="h-4 w-4 text-neon" />
        </span>
      </div>
      <div className={`font-display mt-3 text-4xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function scoreColorClass(score: number) {
  const c = scoreColor(score);
  return c === "success" ? "text-success" : c === "warning" ? "text-warning" : "text-danger";
}

function ScoreChip({ score }: { score: number }) {
  const cls = scoreColorClass(score);
  return (
    <div className={`font-display text-2xl font-bold ${cls}`}>{Math.round(score)}<span className="text-xs text-muted-foreground font-sans"> /100</span></div>
  );
}
