import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar, Footer } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listScans } from "@/lib/scans-api";
import { scoreColor } from "@/lib/scanner";
import { ShieldAlert, Plus, Activity, Gauge, Clock, FileSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
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

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Realtime: refresh when new scan is inserted
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
  const avg = total > 0 ? Math.round((rows!.reduce((s, r) => s + Number(r.risk_score), 0) / total)) : 0;
  const recent = rows?.[0] ?? null;

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
            [0,1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)
          ) : (
            <>
              <KpiCard icon={Activity} label="Total scans" value={String(total)} />
              <KpiCard icon={Gauge} label="Avg risk score" value={String(avg)} accent={scoreColorClass(avg)} />
              <KpiCard icon={Clock} label="Last scan" value={recent ? new Date(recent.created_at).toLocaleDateString() : "—"} />
            </>
          )}
        </div>

        {/* Scan list */}
        <div className="mt-10">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Recent scans</h2>
          {rows === null ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-card border border-border p-10 text-center">
              <FileSearch className="h-8 w-8 mx-auto text-neon" />
              <h3 className="mt-3 font-medium">No scans yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Run your first scan to start tracking your exposure.</p>
              <Link to="/scanner" className="mt-5 inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 glow-teal">
                <Plus className="h-4 w-4" /> Run a scan
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  to="/scans/$scanId"
                  params={{ scanId: r.id }}
                  className="group rounded-2xl bg-card border border-border p-5 hover:border-neon/40 transition-colors flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="font-medium">{r.scan_summaries?.total_findings ?? 0} findings</span>
                      <span className="text-muted-foreground">· {r.input_char_count.toLocaleString()} chars</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {(["direct","indirect","correlation","social"] as const).map(k => {
                        const v = r.scan_summaries?.[`${k}_count` as const] ?? 0;
                        return <span key={k} className="px-2 py-0.5 rounded-md bg-surface ring-1 ring-border">{k}: {v}</span>;
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

function KpiCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{className?: string}>; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 ring-neon">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-neon" />
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
