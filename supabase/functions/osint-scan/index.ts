// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT = 20;

const FLAGGED_DOMAINS = ["gov.in", ".police.", ".military.", ".mil"];

interface ScanInput {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  city?: string;
  college?: string;
  employer?: string;
  domain?: string;
  bio?: string;
}

function sanitize(input: ScanInput): { ok: boolean; reason?: string; cleaned: ScanInput } {
  const limits: Record<keyof ScanInput, number> = {
    name: 100, username: 50, email: 200, phone: 20,
    city: 100, college: 200, employer: 200, domain: 200, bio: 8000,
  };
  const cleaned: ScanInput = {};
  for (const k of Object.keys(limits) as (keyof ScanInput)[]) {
    const v = input[k];
    if (typeof v === "string") cleaned[k] = v.slice(0, limits[k]);
  }
  if (cleaned.domain) {
    const d = cleaned.domain.toLowerCase();
    for (const flag of FLAGGED_DOMAINS) {
      if (d.includes(flag)) return { ok: false, reason: "Restricted domain", cleaned };
    }
  }
  return { ok: true, cleaned };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const { data: limitRow } = await admin
      .from("scan_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    let remaining = DAILY_LIMIT;
    let resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    if (!limitRow) {
      await admin.from("scan_rate_limits").insert({
        user_id: userId,
        scan_count_today: 1,
        last_scan_at: now.toISOString(),
        reset_at: resetAt,
      });
      remaining = DAILY_LIMIT - 1;
    } else {
      const reset = new Date(limitRow.reset_at);
      if (now > reset) {
        await admin.from("scan_rate_limits").update({
          scan_count_today: 1,
          last_scan_at: now.toISOString(),
          reset_at: resetAt,
        }).eq("user_id", userId);
        remaining = DAILY_LIMIT - 1;
      } else if (limitRow.scan_count_today >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ error: `Daily scan limit reached (${DAILY_LIMIT}/day)`, resetAt: limitRow.reset_at }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        await admin.from("scan_rate_limits").update({
          scan_count_today: limitRow.scan_count_today + 1,
          last_scan_at: now.toISOString(),
        }).eq("user_id", userId);
        remaining = DAILY_LIMIT - (limitRow.scan_count_today + 1);
        resetAt = limitRow.reset_at;
      }
    }

    const body = await req.json();
    const sanResult = sanitize((body?.input ?? {}) as ScanInput);
    if (!sanResult.ok) {
      return new Response(JSON.stringify({ error: sanResult.reason }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const input = sanResult.cleaned;

    const ip = req.headers.get("x-forwarded-for") ?? null;
    const modules: string[] = [];
    if (input.domain) modules.push("domain_recon");
    if (input.email) modules.push("breach_check");
    if (input.username) modules.push("username_presence");

    await admin.from("audit_events").insert({
      user_id: userId,
      event_type: "scan_started",
      metadata: { modules, fields_count: Object.keys(input).length },
      ip_address: ip,
    });

    const callFn = async (fn: string, payload: Record<string, unknown>) => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { error: data?.error ?? `Failed: ${res.status}` };
        return data;
      } catch (e) {
        return { error: (e as Error).message };
      }
    };

    const [domainRes, breachRes, usernameRes] = await Promise.allSettled([
      input.domain ? callFn("domain-recon", { domain: input.domain, userId }) : Promise.resolve(null),
      input.email ? callFn("email-breach", { email: input.email, userId }) : Promise.resolve(null),
      input.username ? callFn("username-presence", { username: input.username, userId }) : Promise.resolve(null),
    ]);

    const pick = <T,>(p: PromiseSettledResult<T>): T | null =>
      p.status === "fulfilled" ? (p.value as T) : null;

    const domainRecon = pick(domainRes);
    const breachCheck = pick(breachRes);
    const usernamePresence = pick(usernameRes);

    await admin.from("audit_events").insert({
      user_id: userId,
      event_type: "scan_complete",
      metadata: {
        modules,
        domain_subdomains: (domainRecon as any)?.subdomain_count ?? null,
        breach_count: (breachCheck as any)?.breach_count ?? null,
        username_found: (usernamePresence as any)?.found_count ?? null,
      },
      ip_address: ip,
    });

    return new Response(
      JSON.stringify({
        domain_recon: domainRecon,
        breach_check: breachCheck,
        username_presence: usernamePresence,
        rate_limit: { remaining, reset_at: resetAt },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
