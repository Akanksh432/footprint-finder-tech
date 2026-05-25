import { supabase } from "@/integrations/supabase/client";
import type { IdentityInput } from "@/lib/scanner";

export interface DomainReconResult {
  domain: string;
  subdomains: string[];
  dns: { A: string[]; MX: string[]; NS: string[]; TXT: string[] };
  whois: { registrar: string | null; created: string | null; expires: string | null; country: string | null } | null;
  subdomain_count: number;
  has_mail_server: boolean;
  certificate_found: boolean;
  error?: string;
}

export interface BreachItem {
  name: string;
  title: string;
  domain: string;
  date: string;
  data_types: string[];
  severity: "low" | "medium" | "high";
}

export interface BreachResult {
  email: string;
  breached: boolean;
  breach_count: number;
  breaches: BreachItem[];
  most_recent_breach: string | null;
  highest_severity: "low" | "medium" | "high" | null;
  confidence: number;
  error?: string;
}

export interface PlatformResult {
  platform: string;
  url: string;
  found: boolean;
  status: "found" | "not_found" | "unknown";
  confidence: number;
}

export interface UsernamePresenceResult {
  username: string;
  platforms_checked: number;
  found_count: number;
  not_found_count: number;
  unknown_count: number;
  results: PlatformResult[];
  cross_platform_risk: "low" | "medium" | "high";
  confidence: number;
  error?: string;
}

export interface OsintModuleResults {
  domainRecon: DomainReconResult | null;
  breachCheck: BreachResult | null;
  usernamePresence: UsernamePresenceResult | null;
  rateLimit: { remaining: number; resetAt: string };
}

export async function runOsintScan(input: IdentityInput, userId: string): Promise<OsintModuleResults> {
  const { data, error } = await supabase.functions.invoke("osint-scan", {
    body: { input, userId },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return {
    domainRecon: (data as { domain_recon: DomainReconResult | null }).domain_recon,
    breachCheck: (data as { breach_check: BreachResult | null }).breach_check,
    usernamePresence: (data as { username_presence: UsernamePresenceResult | null }).username_presence,
    rateLimit: {
      remaining: (data as { rate_limit: { remaining: number; reset_at: string } }).rate_limit.remaining,
      resetAt: (data as { rate_limit: { remaining: number; reset_at: string } }).rate_limit.reset_at,
    },
  };
}

export async function saveOsintResults(scanId: string, userId: string, results: OsintModuleResults) {
  const entries = [
    { module: "domain_recon", data: results.domainRecon, count: results.domainRecon?.subdomain_count ?? 0 },
    { module: "breach_check", data: results.breachCheck, count: results.breachCheck?.breach_count ?? 0 },
    { module: "username_presence", data: results.usernamePresence, count: results.usernamePresence?.found_count ?? 0 },
  ].filter((e) => e.data !== null);

  if (entries.length === 0) return;
  await supabase.from("osint_results").insert(
    entries.map((e) => ({
      scan_id: scanId,
      user_id: userId,
      module: e.module,
      status: (e.data as { error?: string })?.error ? "failed" : "complete",
      result_json: e.data as unknown as never,
      finding_count: e.count,
    })),
  );
}
