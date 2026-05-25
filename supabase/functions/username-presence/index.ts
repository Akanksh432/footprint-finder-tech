const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UsernameRequest {
  username: string;
  userId: string;
}

interface PlatformDef {
  name: string;
  url: (u: string) => string;
}

const PLATFORMS: PlatformDef[] = [
  { name: "Twitter/X", url: (u) => `https://twitter.com/${u}` },
  { name: "GitHub", url: (u) => `https://github.com/${u}` },
  { name: "Instagram", url: (u) => `https://www.instagram.com/${u}/` },
  { name: "Reddit", url: (u) => `https://www.reddit.com/user/${u}` },
  { name: "LinkedIn", url: (u) => `https://www.linkedin.com/in/${u}/` },
  { name: "Pinterest", url: (u) => `https://www.pinterest.com/${u}/` },
  { name: "Tumblr", url: (u) => `https://www.tumblr.com/${u}` },
  { name: "Medium", url: (u) => `https://medium.com/@${u}` },
  { name: "Dev.to", url: (u) => `https://dev.to/${u}` },
  { name: "Keybase", url: (u) => `https://keybase.io/${u}` },
  { name: "HackerNews", url: (u) => `https://news.ycombinator.com/user?id=${u}` },
  { name: "ProductHunt", url: (u) => `https://www.producthunt.com/@${u}` },
  { name: "Quora", url: (u) => `https://www.quora.com/profile/${u}` },
  { name: "Flickr", url: (u) => `https://www.flickr.com/people/${u}` },
  { name: "GitLab", url: (u) => `https://gitlab.com/${u}` },
  { name: "Pastebin", url: (u) => `https://pastebin.com/u/${u}` },
  { name: "SoundCloud", url: (u) => `https://soundcloud.com/${u}` },
  { name: "Twitch", url: (u) => `https://www.twitch.tv/${u}` },
  { name: "Steam", url: (u) => `https://steamcommunity.com/id/${u}` },
  { name: "Telegram", url: (u) => `https://t.me/${u}` },
];

async function checkPlatform(p: PlatformDef, username: string) {
  const url = p.url(username);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CyberOracleOSINT/1.0; +https://cyberoracle.app)",
      },
    });
    clearTimeout(timer);
    if (res.status === 200) {
      return { platform: p.name, url, found: true, status: "found" as const, confidence: 90 };
    }
    if (res.status === 404) {
      return { platform: p.name, url, found: false, status: "not_found" as const, confidence: 0 };
    }
    return { platform: p.name, url, found: false, status: "unknown" as const, confidence: 50 };
  } catch {
    return { platform: p.name, url, found: false, status: "unknown" as const, confidence: 50 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { username }: UsernameRequest = await req.json();
    if (!username || typeof username !== "string" || username.length > 50 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return new Response(JSON.stringify({ error: "Invalid username" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settled = await Promise.allSettled(PLATFORMS.map((p) => checkPlatform(p, username)));
    const results = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : { platform: PLATFORMS[i].name, url: PLATFORMS[i].url(username), found: false, status: "unknown" as const, confidence: 50 },
    );
    const found = results.filter((r) => r.found);
    const notFound = results.filter((r) => r.status === "not_found");
    const unknown = results.filter((r) => r.status === "unknown");
    const foundCount = found.length;
    const risk: "low" | "medium" | "high" = foundCount >= 8 ? "high" : foundCount >= 4 ? "medium" : "low";
    const confidence = found.length > 0
      ? Math.round(found.reduce((s, r) => s + r.confidence, 0) / found.length)
      : 30;

    return new Response(
      JSON.stringify({
        username,
        platforms_checked: PLATFORMS.length,
        found_count: foundCount,
        not_found_count: notFound.length,
        unknown_count: unknown.length,
        results,
        cross_platform_risk: risk,
        confidence,
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
