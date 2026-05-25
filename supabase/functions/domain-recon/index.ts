// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DomainReconRequest {
  domain: string;
  userId: string;
}

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

async function fetchDns(domain: string, type: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: "application/dns-json" } },
    );
    if (!res.ok) return [];
    const body = await res.json();
    return (body.Answer ?? []).map((a: DnsAnswer) => a.data);
  } catch {
    return [];
  }
}

async function fetchCrtSh(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`);
    if (!res.ok) return [];
    const data = await res.json();
    const set = new Set<string>();
    for (const row of data ?? []) {
      const nv: string = row.name_value ?? "";
      for (const sub of nv.split(/\n/)) {
        const cleaned = sub.trim().toLowerCase().replace(/^\*\./, "");
        if (cleaned && cleaned.endsWith(domain.toLowerCase())) set.add(cleaned);
      }
    }
    return Array.from(set).slice(0, 30);
  } catch {
    return [];
  }
}

async function fetchWhois(domain: string): Promise<any | null> {
  const key = Deno.env.get("WHOIS_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${key}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const wr = data?.WhoisRecord ?? {};
    return {
      registrar: wr.registrarName ?? null,
      created: wr.createdDate ?? null,
      expires: wr.expiresDate ?? null,
      country: wr.registrant?.country ?? null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain }: DomainReconRequest = await req.json();
    if (!domain || typeof domain !== "string" || domain.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const [subdomains, a, mx, ns, txt, whois] = await Promise.all([
      fetchCrtSh(cleanDomain),
      fetchDns(cleanDomain, "A"),
      fetchDns(cleanDomain, "MX"),
      fetchDns(cleanDomain, "NS"),
      fetchDns(cleanDomain, "TXT"),
      fetchWhois(cleanDomain),
    ]);

    const result = {
      domain: cleanDomain,
      subdomains,
      dns: { A: a, MX: mx, NS: ns, TXT: txt },
      whois,
      subdomain_count: subdomains.length,
      has_mail_server: mx.length > 0,
      certificate_found: subdomains.length > 0,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
