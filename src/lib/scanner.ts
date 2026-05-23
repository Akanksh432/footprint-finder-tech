// PII detection engine — runs entirely client-side
export type Category = "direct" | "indirect" | "correlation" | "social";
export type RiskLevel = "low" | "medium" | "high";

export interface Finding {
  id: string;
  type: string;
  category: Category;
  rawValue: string;
  maskedValue: string;
  riskLevel: RiskLevel;
  start: number;
  end: number;
}

const CATEGORY_WEIGHT: Record<Category, number> = {
  direct: 3,
  indirect: 2,
  correlation: 2.5,
  social: 1,
};

interface Detector {
  type: string;
  category: Category;
  risk: RiskLevel;
  regex: RegExp;
  mask: (v: string) => string;
}

const maskMiddle = (v: string, keepStart = 2, keepEnd = 2) => {
  if (v.length <= keepStart + keepEnd) return "[REDACTED]";
  return v.slice(0, keepStart) + "[REDACTED]" + v.slice(-keepEnd);
};

const maskEmail = (v: string) => {
  const [user, domain] = v.split("@");
  if (!domain) return "[REDACTED]";
  const u = user.length > 2 ? user.slice(0, 2) + "[REDACTED]" : "[REDACTED]";
  const dParts = domain.split(".");
  const d = dParts[0].length > 2 ? dParts[0].slice(0, 2) + "[REDACTED]" : "[REDACTED]";
  return `${u}@${d}.${dParts.slice(1).join(".")}`;
};

const DETECTORS: Detector[] = [
  // Direct PII
  { type: "Email", category: "direct", risk: "high",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, mask: maskEmail },
  { type: "Phone (India)", category: "direct", risk: "high",
    regex: /(?:\+91[\s-]?)?[6-9]\d{9}/g, mask: (v) => maskMiddle(v, 3, 2) },
  { type: "Phone (US)", category: "direct", risk: "high",
    regex: /(?:\+1[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}/g, mask: (v) => maskMiddle(v, 3, 2) },
  { type: "Aadhaar", category: "direct", risk: "high",
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, mask: (v) => v.slice(0, 6) + "[REDACTED] " + v.slice(-4) },
  { type: "PAN", category: "direct", risk: "high",
    regex: /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g, mask: (v) => v.slice(0, 3) + "[REDACTED]" + v.slice(-1) },
  { type: "Passport", category: "direct", risk: "high",
    regex: /\b[A-Z]{1,2}\d{6,7}\b/g, mask: (v) => maskMiddle(v, 2, 2) },
  { type: "Credit Card", category: "direct", risk: "high",
    regex: /\b(?:\d[ -]*?){13,16}\b/g, mask: (v) => "[REDACTED] " + v.replace(/\D/g, "").slice(-4) },
  { type: "SSN", category: "direct", risk: "high",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g, mask: () => "XXX-XX-[REDACTED]" },

  // Indirect PII
  { type: "Date of Birth", category: "indirect", risk: "medium",
    regex: /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/g, mask: (v) => v.slice(0, 2) + "/[REDACTED]" },
  { type: "Address", category: "indirect", risk: "medium",
    regex: /\d+\s+\w+(?:\s+\w+)*\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|place|pl)\b/gi,
    mask: (v) => v.split(" ").slice(0, 1).join(" ") + " [REDACTED]" },
  { type: "IP Address", category: "indirect", risk: "medium",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, mask: (v) => v.split(".").slice(0, 2).join(".") + ".[REDACTED]" },

  // Social engineering
  { type: "Password Keyword", category: "social", risk: "low",
    regex: /\b(?:password|pwd|pass|123456|qwerty)\b/gi, mask: () => "[REDACTED]" },
  { type: "Security Question", category: "social", risk: "low",
    regex: /mother's maiden name|father's birthplace|first pet|high school/gi, mask: (v) => v.slice(0, 6) + "[REDACTED]" },
  { type: "Account Number", category: "social", risk: "medium",
    regex: /\b(?:acc|account|acct)[\s:#-]?\d{6,15}\b/gi, mask: (v) => v.slice(0, 4) + "[REDACTED]" },
];

const CORRELATION_PATTERNS: { type: string; regex: RegExp; mask: (v: string) => string }[] = [
  { type: "Full Name", regex: /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g, mask: (v) => v.charAt(0) + ". [REDACTED]" },
  { type: "City + Role", regex: /\b(?:lives|based|located)\s+in\s+[A-Z][a-z]+/gi, mask: () => "[REDACTED]" },
  { type: "Company + Title", regex: /\b(?:works|employed)\s+(?:at|by)\s+[A-Z][a-zA-Z]+\s+as\s+\w+/gi, mask: () => "[REDACTED]" },
];

export interface ScanResult {
  findings: Finding[];
  counts: Record<Category, number>;
  totalFound: number;
  score: number;
  categoriesAffected: number;
}

export function scanText(text: string): ScanResult {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  const push = (f: Finding) => {
    const key = `${f.start}-${f.end}-${f.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(f);
  };

  let i = 0;
  for (const d of DETECTORS) {
    const re = new RegExp(d.regex.source, d.regex.flags.includes("g") ? d.regex.flags : d.regex.flags + "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      push({
        id: `f-${i++}`,
        type: d.type,
        category: d.category,
        rawValue: raw,
        maskedValue: d.mask(raw),
        riskLevel: d.risk,
        start: m.index,
        end: m.index + raw.length,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  for (const p of CORRELATION_PATTERNS) {
    let m;
    const re = new RegExp(p.regex.source, p.regex.flags);
    while ((m = re.exec(text)) !== null) {
      push({
        id: `f-${i++}`,
        type: p.type,
        category: "correlation",
        rawValue: m[0],
        maskedValue: p.mask(m[0]),
        riskLevel: "high",
        start: m.index,
        end: m.index + m[0].length,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  const counts: Record<Category, number> = { direct: 0, indirect: 0, correlation: 0, social: 0 };
  for (const f of findings) counts[f.category]++;

  const weighted =
    counts.direct * CATEGORY_WEIGHT.direct +
    counts.indirect * CATEGORY_WEIGHT.indirect +
    counts.correlation * CATEGORY_WEIGHT.correlation +
    counts.social * CATEGORY_WEIGHT.social;

  const score = Math.min(100, Math.round((weighted / 5) * 10));
  const categoriesAffected = (Object.values(counts) as number[]).filter((n) => n > 0).length;

  return {
    findings: findings.sort((a, b) => a.start - b.start),
    counts,
    totalFound: findings.length,
    score,
    categoriesAffected,
  };
}

export const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  direct: { label: "Direct PII", description: "Identifiers that uniquely point to you." },
  indirect: { label: "Indirect PII", description: "Quasi-identifiers usable in combination." },
  correlation: { label: "Correlation Risk", description: "Combined signals enabling re-identification." },
  social: { label: "Social Engineering", description: "Hints attackers leverage for pretexting." },
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-danger",
};

export function scoreColor(score: number) {
  if (score < 30) return "success";
  if (score < 60) return "warning";
  return "danger";
}

export const DEMO_TEXT =
  "John Smith, email johnsmith@example.com, phone +91 9876543210, Aadhaar 1234 5678 9012, PAN ABCDE1234F, DOB 15/03/1999, lives in Hyderabad, works at TechCorp as analyst";

export function getRecommendations(result: ScanResult): string[] {
  const recs: string[] = [];
  if (result.counts.direct > 0)
    recs.push("Remove direct identifiers (email, phone, government IDs) from public documents and portfolios.");
  if (result.counts.direct > 0 || result.counts.indirect > 0)
    recs.push("Mask numbers and IDs before sharing screenshots or pasting into AI tools.");
  if (result.counts.correlation > 0)
    recs.push("Avoid combining contact + address + DOB in the same public profile — they multiply re-identification risk.");
  if (result.counts.indirect > 0)
    recs.push("Review your resume, GitHub README, and social bios for quasi-identifiers like address and DOB.");
  if (result.counts.social > 0)
    recs.push("Never share password hints, security-question answers, or account numbers in shared docs.");
  if (result.score > 60)
    recs.push("Your exposure is HIGH — consider scrubbing this content before publishing or sending.");
  if (recs.length === 0)
    recs.push("No significant exposure detected. Continue practicing data minimization.");
  return recs;
}
