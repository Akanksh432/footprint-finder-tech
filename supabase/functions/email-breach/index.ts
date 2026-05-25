// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BreachRequest {
  email: string;
  userId: string;
}

function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return "[REDACTED]";
  return `${u.slice(0, 2)}***@${d}`;
}

function severityOf(dataClasses: string[]): "low" | "medium" | "high" {
  const high = ["Passwords", "Credit cards", "Bank account numbers", "Historical passwords"];
  if (dataClasses.some((c) => high.includes(c))) return "high";
  const mediumSet = new Set(["Email addresses", "Usernames", "Phone numbers", "Physical addresses"]);
  const mediumCount = dataClasses.filter((c) => mediumSet.has(c)).length;
  if (mediumCount >= 2) return "medium";
  return "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email }: BreachRequest = await req.json();
    if (!email || typeof email !== "string" || email.length > 200 || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("HIBP_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          email: maskEmail(email),
          breached: false,
          breach_count: 0,
          breaches: [],
          most_recent_breach: null,
          highest_severity: null,
          confidence: 0,
          error: "Breach check unavailable — API key not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": apiKey,
          "User-Agent": "CyberOracle-OSINT",
        },
      },
    );

    if (res.status === 404) {
      return new Response(
        JSON.stringify({
          email: maskEmail(email),
          breached: false,
          breach_count: 0,
          breaches: [],
          most_recent_breach: null,
          highest_severity: null,
          confidence: 40,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 401 || res.status === 403) {
      return new Response(
        JSON.stringify({ error: "Invalid HIBP API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      return new Response(
        JSON.stringify({ error: "Rate limited", retryAfter }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `HIBP error ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const raw: any[] = await res.json();
    const breaches = raw.slice(0, 20).map((b) => ({
      name: b.Name,
      title: b.Title,
      domain: b.Domain,
      date: b.BreachDate,
      data_types: b.DataClasses ?? [],
      severity: severityOf(b.DataClasses ?? []),
    }));
    const mostRecent = breaches.reduce<string | null>(
      (acc, b) => (!acc || b.date > acc ? b.date : acc),
      null,
    );
    const rank = { low: 1, medium: 2, high: 3 };
    const highest = breaches.reduce<"low" | "medium" | "high" | null>(
      (acc, b) => (!acc || rank[b.severity] > rank[acc] ? b.severity : acc),
      null,
    );

    return new Response(
      JSON.stringify({
        email: maskEmail(email),
        breached: true,
        breach_count: breaches.length,
        breaches,
        most_recent_breach: mostRecent,
        highest_severity: highest,
        confidence: 100,
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
