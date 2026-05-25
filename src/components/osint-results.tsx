import { Globe, Mail, Users, ExternalLink, ShieldAlert, ShieldCheck, AlertCircle, Server, Calendar } from "lucide-react";
import type { DomainReconResult, BreachResult, UsernamePresenceResult } from "@/lib/osint-api";

function Pill({ tone, children }: { tone: "neon" | "danger" | "warning" | "success" | "muted"; children: React.ReactNode }) {
  const cls = {
    neon: "bg-primary/15 ring-primary/30 text-neon",
    danger: "bg-danger/10 ring-danger/30 text-danger",
    warning: "bg-warning/10 ring-warning/30 text-warning",
    success: "bg-success/10 ring-success/30 text-success",
    muted: "bg-surface ring-border text-muted-foreground",
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${cls}`}>{children}</span>;
}

export function DomainReconCard({ data }: { data: DomainReconResult }) {
  if (data.error) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 animate-fade-up">
        <div className="flex items-center gap-2 text-warning text-sm">
          <AlertCircle className="h-4 w-4" /> Domain recon failed: {data.error}
        </div>
      </div>
    );
  }
  const surfaceHigh = data.subdomain_count > 5;
  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 card-hover animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Globe className="h-5 w-5 text-neon" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neon">Domain Reconnaissance</div>
            <div className="font-display text-lg font-semibold">{data.domain}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={data.certificate_found ? "success" : "muted"}>
            {data.certificate_found ? "Cert found" : "No cert data"}
          </Pill>
          {data.has_mail_server && <Pill tone="warning">Mail server exposed</Pill>}
          {surfaceHigh && <Pill tone="danger">Subdomain surface: HIGH</Pill>}
        </div>
      </div>

      {data.subdomains.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Subdomains ({data.subdomains.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.subdomains.slice(0, 10).map((s) => (
              <span key={s} className="font-mono text-xs px-2 py-0.5 rounded-md bg-surface ring-1 ring-border">{s}</span>
            ))}
            {data.subdomains.length > 10 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">+ {data.subdomains.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {(["A", "MX", "NS", "TXT"] as const).map((t) => (
          <div key={t} className="rounded-lg bg-surface/40 ring-1 ring-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-neon mb-1 flex items-center gap-1">
              <Server className="h-3 w-3" /> {t} records ({data.dns[t].length})
            </div>
            {data.dns[t].length === 0 ? (
              <div className="text-xs text-muted-foreground">—</div>
            ) : (
              <div className="space-y-0.5">
                {data.dns[t].slice(0, 4).map((v, i) => (
                  <div key={i} className="font-mono text-[11px] text-muted-foreground break-all">{v}</div>
                ))}
                {data.dns[t].length > 4 && (
                  <div className="text-[11px] text-muted-foreground">+ {data.dns[t].length - 4}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.whois && (
        <div className="mt-4 rounded-lg bg-surface/40 ring-1 ring-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-neon mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> WHOIS
          </div>
          <div className="grid gap-1 sm:grid-cols-2 text-xs">
            <div><span className="text-muted-foreground">Registrar:</span> {data.whois.registrar ?? "—"}</div>
            <div><span className="text-muted-foreground">Country:</span> {data.whois.country ?? "—"}</div>
            <div><span className="text-muted-foreground">Created:</span> {data.whois.created ?? "—"}</div>
            <div><span className="text-muted-foreground">Expires:</span> {data.whois.expires ?? "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BreachCard({ data }: { data: BreachResult }) {
  if (data.error) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 animate-fade-up">
        <div className="flex items-center gap-2 text-warning text-sm">
          <AlertCircle className="h-4 w-4" /> Breach check: {data.error}
        </div>
      </div>
    );
  }
  const sevTone = (s: "low" | "medium" | "high") =>
    s === "high" ? "danger" : s === "medium" ? "warning" : "muted";
  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 card-hover animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Mail className="h-5 w-5 text-neon" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neon">Breach Detection</div>
            <div className="font-display text-lg font-semibold font-mono">{data.email}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Pill tone={data.breached ? "danger" : "success"}>
            {data.breached ? `${data.breach_count} breaches` : "No known breaches"}
          </Pill>
          <Pill tone="muted">Confidence {data.confidence}%</Pill>
        </div>
      </div>

      {data.breached ? (
        <>
          <div className="rounded-lg bg-danger/10 ring-1 ring-danger/30 p-3 mb-4 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-foreground">Email found in {data.breach_count} known data breaches.</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Rotate passwords on affected sites. Enable 2FA. Most recent: {data.most_recent_breach ?? "unknown"}.
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.breaches.map((b) => (
              <div key={b.name} className="rounded-lg bg-surface/40 ring-1 ring-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-medium text-sm truncate">{b.title}</div>
                  <Pill tone={sevTone(b.severity)}>{b.severity}</Pill>
                </div>
                <div className="text-[11px] text-muted-foreground">{b.domain} · {b.date}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {b.data_types.slice(0, 5).map((t) => (
                    <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ring-1 ${
                      /Password|Credit/.test(t) ? "bg-danger/10 text-danger ring-danger/30" :
                      /Email|Username|Phone/.test(t) ? "bg-warning/10 text-warning ring-warning/30" :
                      "bg-surface ring-border text-muted-foreground"
                    }`}>{t}</span>
                  ))}
                  {b.data_types.length > 5 && <span className="text-[10px] text-muted-foreground">+{b.data_types.length - 5}</span>}
                </div>
              </div>
            ))}
          </div>
          <a
            href="https://haveibeenpwned.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-neon hover:underline"
          >
            Change passwords on affected sites <ExternalLink className="h-3 w-3" />
          </a>
        </>
      ) : (
        <div className="rounded-lg bg-success/10 ring-1 ring-success/30 p-4 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-success mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-foreground">No known breaches found.</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Absence of evidence isn't evidence of absence — keep monitoring and use unique passwords per site.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UsernamePresenceCard({ data }: { data: UsernamePresenceResult }) {
  if (data.error) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 animate-fade-up">
        <div className="flex items-center gap-2 text-warning text-sm">
          <AlertCircle className="h-4 w-4" /> Username check: {data.error}
        </div>
      </div>
    );
  }
  const riskTone = data.cross_platform_risk === "high" ? "danger" : data.cross_platform_risk === "medium" ? "warning" : "success";
  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 card-hover animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Users className="h-5 w-5 text-neon" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neon">Username Presence</div>
            <div className="font-display text-lg font-semibold font-mono">@{data.username}</div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Pill tone="neon">Found on {data.found_count}/{data.platforms_checked}</Pill>
          <Pill tone={riskTone}>Cross-platform: {data.cross_platform_risk}</Pill>
        </div>
      </div>

      {data.found_count >= 6 && (
        <div className="rounded-lg bg-warning/10 ring-1 ring-warning/30 p-3 mb-4 text-sm">
          <span className="font-medium">Cross-platform tracking risk.</span>{" "}
          <span className="text-muted-foreground">
            Your username appears on {data.found_count} platforms, enabling adversary correlation across services.
          </span>
        </div>
      )}

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        {data.results.map((r) => (
          <a
            key={r.platform}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg p-2.5 ring-1 transition-colors ${
              r.status === "found"
                ? "bg-success/5 ring-success/30 hover:bg-success/10"
                : r.status === "unknown"
                ? "bg-warning/5 ring-warning/30 opacity-70"
                : "bg-surface ring-border opacity-50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${
                r.status === "found" ? "bg-success" : r.status === "unknown" ? "bg-warning" : "bg-muted-foreground"
              }`} />
              <span className="text-xs font-medium truncate">{r.platform}</span>
              {r.status === "found" && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto" />}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {r.status === "found" ? "Found" : r.status === "not_found" ? "Not found" : "Could not verify"}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export type ModuleStatus = "idle" | "running" | "complete" | "failed" | "skipped";

export interface ModuleStatuses {
  local_scan: ModuleStatus;
  domain_recon: ModuleStatus;
  breach_check: ModuleStatus;
  username_presence: ModuleStatus;
  correlation: ModuleStatus;
}

export function ModuleStatusGrid({ statuses }: { statuses: ModuleStatuses }) {
  const rows: { key: keyof ModuleStatuses; label: string }[] = [
    { key: "local_scan", label: "Local Detection" },
    { key: "domain_recon", label: "Domain Recon" },
    { key: "breach_check", label: "Breach Detection" },
    { key: "username_presence", label: "Username Presence" },
    { key: "correlation", label: "Correlation Engine" },
  ];
  const dot = (s: ModuleStatus) => {
    if (s === "running") return <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />;
    if (s === "complete") return <span className="h-2 w-2 rounded-full bg-success" />;
    if (s === "failed") return <span className="h-2 w-2 rounded-full bg-danger" />;
    if (s === "skipped") return <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
    return <span className="h-2 w-2 rounded-full bg-muted-foreground" />;
  };
  const label = (s: ModuleStatus) =>
    s === "running" ? "Running…" : s === "complete" ? "Complete" : s === "failed" ? "Failed" : s === "skipped" ? "Skipped" : "Idle";
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="text-[10px] uppercase tracking-widest text-neon mb-3">Module Status</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {dot(statuses[r.key])}
              <span>{r.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{label(statuses[r.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModuleStatusPills({ statuses }: { statuses: ModuleStatuses }) {
  const rows: { key: keyof ModuleStatuses; label: string }[] = [
    { key: "domain_recon", label: "DNS Recon" },
    { key: "breach_check", label: "Breach Check" },
    { key: "username_presence", label: "Username Presence" },
    { key: "correlation", label: "Correlation Engine" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((r) => {
        const s = statuses[r.key];
        const tone =
          s === "running" ? "bg-primary/15 ring-primary/40 text-neon"
          : s === "complete" ? "bg-success/10 ring-success/30 text-success"
          : s === "failed" ? "bg-danger/10 ring-danger/30 text-danger"
          : "bg-surface ring-border text-muted-foreground";
        return (
          <span key={r.key} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ring-1 ${tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              s === "running" ? "bg-neon animate-pulse" :
              s === "complete" ? "bg-success" :
              s === "failed" ? "bg-danger" : "bg-muted-foreground"
            }`} />
            {r.label}
          </span>
        );
      })}
    </div>
  );
}
