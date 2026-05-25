import type { IdentityInput, ScanResult, Priority } from "@/lib/scanner";
import type { OsintModuleResults } from "@/lib/osint-api";

const SEV_EMOJI: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

export function generateMarkdownReport(
  input: IdentityInput,
  result: ScanResult,
  osint: OsintModuleResults | null,
): string {
  const lines: string[] = [];
  const now = new Date();
  const userLabel = input.email ? `${input.email.slice(0, 2)}***@${input.email.split("@")[1] ?? "***"}` : "anonymous";

  lines.push("# CyberOracle Privacy Exposure Report");
  lines.push(`Generated: ${now.toISOString()} | User: ${userLabel} | Score: ${result.score}/100`);
  lines.push("");

  // Summary
  const level = result.score >= 75 ? "CRITICAL" : result.score >= 50 ? "HIGH" : result.score >= 25 ? "MEDIUM" : "LOW";
  lines.push("## Executive Summary");
  lines.push(
    `Detected **${result.totalFound} signals** (${result.validatedFindings} validated) across ${result.categoriesAffected} categories. ` +
      `Generated **${result.attackPaths.length} correlated attack paths**. ` +
      `External modules: ${[
        osint?.domainRecon && "Domain Recon",
        osint?.breachCheck && "Breach Detection",
        osint?.usernamePresence && "Username Presence",
      ].filter(Boolean).join(", ") || "none triggered"}.`,
  );
  lines.push("");

  // Score
  lines.push("## Exposure Score");
  lines.push(`**${result.score}/100 — ${level}**`);
  lines.push(
    `Categories: Direct(${result.counts.direct}) · Indirect(${result.counts.indirect}) · Correlation(${result.counts.correlation}) · Social(${result.counts.social})`,
  );
  lines.push("");

  // Findings by category
  lines.push("## Findings");
  (["direct", "indirect", "correlation", "social"] as const).forEach((cat) => {
    const items = result.findings.filter((f) => f.category === cat);
    if (items.length === 0) return;
    lines.push(`### ${cat[0].toUpperCase() + cat.slice(1)} Exposure (${items.length})`);
    lines.push("| Type | Masked Value | Severity | Confidence | Fix |");
    lines.push("|---|---|---|---|---|");
    items.forEach((f) =>
      lines.push(`| ${f.type} | \`${f.maskedValue}\` | ${f.severity} | ${f.confidence}% | ${f.fix} |`),
    );
    lines.push("");
  });

  // Attack paths
  if (result.attackPaths.length > 0) {
    lines.push("## Attack Paths");
    result.attackPaths.forEach((p) => {
      lines.push(`### ${SEV_EMOJI[p.severity]} ${p.name} — ${p.severity}`);
      lines.push(`Confidence: ${p.confidence}% | Components: ${p.componentLabels.join(", ")}`);
      lines.push(p.description);
      lines.push(`**Fix:** ${p.fix}`);
      lines.push("");
    });
  }

  // OSINT modules
  if (osint?.domainRecon) {
    const d = osint.domainRecon;
    lines.push(`## Domain Reconnaissance — ${d.domain}`);
    lines.push(`- Subdomains: ${d.subdomain_count}`);
    lines.push(`- DNS Records: A(${d.dns.A.length}) MX(${d.dns.MX.length}) NS(${d.dns.NS.length}) TXT(${d.dns.TXT.length})`);
    lines.push(`- Mail server: ${d.has_mail_server ? "YES" : "NO"}`);
    if (d.whois) {
      lines.push(`- WHOIS: ${d.whois.registrar ?? "?"} · Created ${d.whois.created ?? "?"} · Expires ${d.whois.expires ?? "?"}`);
    }
    lines.push("");
  }
  if (osint?.breachCheck) {
    const b = osint.breachCheck;
    lines.push(`## Breach Detection — ${b.email}`);
    lines.push(`Breached: ${b.breached ? "YES" : "NO"} (${b.breach_count} breaches)`);
    b.breaches.forEach((br) => lines.push(`- ${br.title} (${br.date}) — severity ${br.severity}`));
    lines.push("");
  }
  if (osint?.usernamePresence) {
    const u = osint.usernamePresence;
    lines.push(`## Username Presence — @${u.username}`);
    lines.push(`Found on ${u.found_count}/${u.platforms_checked} platforms — cross-platform risk: ${u.cross_platform_risk}`);
    const found = u.results.filter((r) => r.found);
    if (found.length) lines.push(`Platforms: ${found.map((r) => r.platform).join(", ")}`);
    lines.push("");
  }

  // Mitigation
  lines.push("## Mitigation Plan");
  (["fix_now", "fix_soon", "monitor"] as Priority[]).forEach((p, idx) => {
    const items = result.actions.filter((a) => a.priority === p);
    if (items.length === 0) return;
    const emoji = ["🔴 Fix Now", "🟡 Fix Soon", "🔵 Monitor"][idx];
    lines.push(`### ${emoji}`);
    items.forEach((a, i) => lines.push(`${i + 1}. **${a.title}** — ${a.description}`));
    lines.push("");
  });

  lines.push("---");
  lines.push("_CyberOracle — Privacy Exposure Intelligence Platform_");
  lines.push("_This report contains no raw PII. All values are masked or aggregated. Do not share with unauthorized parties._");
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
