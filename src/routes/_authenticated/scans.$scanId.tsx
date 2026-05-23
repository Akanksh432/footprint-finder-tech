import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar, Footer } from "@/components/site-chrome";
import { getScanDetail, deleteScan } from "@/lib/scans-api";
import { scoreColor, CATEGORY_META, type Category } from "@/lib/scanner";
import { ArrowLeft, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scans/$scanId")({
  component: ScanDetail,
});

interface Data {
  scan: { id: string; created_at: string; risk_score: number; input_char_count: number; input_text: string };
  findings: { id: string; type: string; category: string; masked_value: string; risk_level: string; position_start: number | null; position_end: number | null }[];
  recommendations: { id: string; title: string; description: string; priority: string }[];
  summary: { direct_count: number; indirect_count: number; correlation_count: number; social_count: number; total_findings: number } | null;
}

function ScanDetail() {
  const { scanId } = useParams({ from: "/_authenticated/scans/$scanId" });
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getScanDetail(scanId).then((d) => setData(d as unknown as Data)).catch((e) => setError(e.message));
  }, [scanId]);

  const onDelete = async () => {
    if (!confirm("Delete this scan permanently?")) return;
    setDeleting(true);
    try {
      await deleteScan(scanId);
      toast.success("Scan deleted");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-5 sm:px-8 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {error && <div className="mt-6 rounded-lg bg-danger/10 text-danger ring-1 ring-danger/30 px-3 py-2 text-sm">{error}</div>}

        {!data ? (
          <div className="mt-6 space-y-4">
            <div className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
            <div className="h-64 rounded-2xl bg-card border border-border animate-pulse" />
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl bg-card border border-border p-6 ring-neon flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-neon">Scan</div>
                <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
                  {new Date(data.scan.created_at).toLocaleString()}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-md bg-surface ring-1 ring-border">{data.scan.input_char_count.toLocaleString()} chars</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface ring-1 ring-border">{data.summary?.total_findings ?? data.findings.length} findings</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`font-display text-5xl font-bold ${scoreClass(Number(data.scan.risk_score))}`}>
                  {Math.round(Number(data.scan.risk_score))}<span className="text-sm text-muted-foreground font-sans"> /100</span>
                </div>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-danger/40 hover:text-danger text-sm disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>

            {/* Category counts */}
            {data.summary && (
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {(["direct","indirect","correlation","social"] as Category[]).map((k) => (
                  <div key={k} className="rounded-2xl bg-card border border-border p-4">
                    <div className="text-xs text-muted-foreground">{CATEGORY_META[k].label}</div>
                    <div className="font-display mt-2 text-3xl font-bold">{data.summary![`${k}_count` as const]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Findings table */}
            <div className="mt-8 rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border font-medium">Findings ({data.findings.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-surface/50">
                    <tr>
                      <th className="text-left px-5 py-3">Type</th>
                      <th className="text-left px-5 py-3">Value (masked)</th>
                      <th className="text-left px-5 py-3">Category</th>
                      <th className="text-left px-5 py-3">Risk</th>
                      <th className="text-left px-5 py-3">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.findings.map(f => (
                      <tr key={f.id} className="border-t border-border">
                        <td className="px-5 py-3 font-medium">{f.type}</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.masked_value}</td>
                        <td className="px-5 py-3 text-xs">{f.category}</td>
                        <td className="px-5 py-3"><span className={`text-xs ${riskClass(f.risk_level)}`}>{f.risk_level}</span></td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.position_start}–{f.position_end}</td>
                      </tr>
                    ))}
                    {data.findings.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-success" />Clean scan — no findings.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 rounded-2xl bg-card border border-border p-6">
              <h3 className="font-medium mb-4">Recommendations</h3>
              <ul className="space-y-3">
                {data.recommendations.map(r => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${r.priority === "high" ? "bg-danger" : "bg-warning"}`} />
                    <span className="text-muted-foreground">{r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function scoreClass(s: number) {
  const c = scoreColor(s);
  return c === "success" ? "text-success" : c === "warning" ? "text-warning" : "text-danger";
}
function riskClass(l: string) {
  return l === "high" ? "text-danger" : l === "medium" ? "text-warning" : "text-success";
}
