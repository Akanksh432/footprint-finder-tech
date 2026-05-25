// CyberOracle Privacy Exposure Intelligence engine
// Runs entirely client-side. Stage 1 of the OSINT-style upgrade
// (external lookups will plug in later via an Edge Function).

export type Category = "direct" | "indirect" | "correlation" | "social";
export type RiskLevel = "low" | "medium" | "high";
export type Priority = "fix_now" | "fix_soon" | "monitor";

export interface Finding {
  id: string;
  type: string;
  category: Category;
  rawValue: string;
  maskedValue: string;
  riskLevel: RiskLevel;
  /** 0–100 — how sure we are the match is meaningful */
  confidence: number;
  /** 0–100 — how damaging the exposure is */
  severity: number;
  /** Short context snippet (±30 chars around the match, or field label). */
  evidence: string;
  /** Plain-English why-it-matters. */
  why: string;
  /** Concrete remediation suggestion. */
  fix: string;
  source: "field" | "bio" | "correlation";
  start: number;
  end: number;
}

export interface AttackPath {
  id: string;
  name: string;
  description: string;
  severity: RiskLevel;
  confidence: number;
  /** Finding ids that fuel this path. */
  componentIds: string[];
  /** Human-readable list of clues. */
  componentLabels: string[];
  fix: string;
}

export interface MitigationAction {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  /** Optional finding/path ids this action addresses. */
  relatedIds?: string[];
}

export interface IdentityInput {
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

export interface ScanResult {
  findings: Finding[];
  attackPaths: AttackPath[];
  actions: MitigationAction[];
  counts: Record<Category, number>;
  totalFound: number;
  validatedFindings: number;
  score: number;
  categoriesAffected: number;
}

export const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  direct: { label: "Direct Exposure", description: "Identifiers that point straight at you — email, phone, IDs." },
  indirect: { label: "Indirect Exposure", description: "Quasi-identifiers like city, employer, or college." },
  correlation: { label: "Correlation Risk", description: "Multiple clues that together re-identify you." },
  social: { label: "Social Engineering", description: "Recovery hints, security questions, password tells." },
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-danger",
};

export const PRIORITY_META: Record<Priority, { label: string; tone: RiskLevel; description: string }> = {
  fix_now: { label: "Fix now", tone: "high", description: "High-impact exposure with a quick remediation." },
  fix_soon: { label: "Fix soon", tone: "medium", description: "Material risk — schedule this in your next privacy pass." },
  monitor: { label: "Monitor", tone: "low", description: "Low confidence or low impact. Worth watching." },
};

// ----------------------------------------------------------------------------
// Masking
// ----------------------------------------------------------------------------
const maskMiddle = (v: string, keepStart = 2, keepEnd = 2) => {
  if (v.length <= keepStart + keepEnd) return "[REDACTED]";
  return v.slice(0, keepStart) + "***" + v.slice(-keepEnd);
};
const maskEmail = (v: string) => {
  const [u, d] = v.split("@");
  if (!d) return "[REDACTED]";
  const us = u.length > 2 ? u.slice(0, 2) + "***" : "**";
  const dp = d.split(".");
  const ds = dp[0].length > 2 ? dp[0].slice(0, 2) + "***" : "**";
  return `${us}@${ds}.${dp.slice(1).join(".")}`;
};
const maskPhone = (v: string) => {
  const digits = v.replace(/\D/g, "");
  if (digits.length < 6) return "[REDACTED]";
  return digits.slice(0, 2) + "***" + digits.slice(-2);
};
const maskUsername = (v: string) => (v.length > 3 ? v.slice(0, 2) + "***" + v.slice(-1) : "***");
const maskName = (v: string) => v.split(/\s+/).map((p) => (p ? p[0] + "." : "")).join(" ").trim();

// ----------------------------------------------------------------------------
// Bio-text detectors
// ----------------------------------------------------------------------------
interface Detector {
  type: string;
  category: Category;
  /** Base severity if matched cleanly. */
  baseSeverity: number;
  /** Base confidence if no context boost/penalty applies. */
  baseConfidence: number;
  regex: RegExp;
  mask: (v: string) => string;
  why: string;
  fix: string;
  /** Phrases nearby that boost confidence. */
  boost?: RegExp;
}

const D: Detector[] = [
  {
    type: "Email", category: "direct", baseSeverity: 80, baseConfidence: 95,
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, mask: maskEmail,
    why: "Emails feed phishing, credential stuffing, and account-recovery attacks.",
    fix: "Use a contact form or alias address in public bios. Never publish a recovery email.",
    boost: /\b(contact|reach|email|mail|hire|work)\b/i,
  },
  {
    type: "Phone", category: "direct", baseSeverity: 85, baseConfidence: 80,
    regex: /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{3}\)|\d{3,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/g, mask: maskPhone,
    why: "Phones enable SIM-swap, 2FA bypass, and pretext calls.",
    fix: "Mask the middle digits in public posts. Use a Google Voice / virtual number for resumes.",
    boost: /\b(call|whatsapp|phone|mobile|contact|cell)\b/i,
  },
  {
    type: "Aadhaar", category: "direct", baseSeverity: 100, baseConfidence: 95,
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    mask: (v) => v.replace(/\D/g, "").slice(0, 4) + " **** " + v.replace(/\D/g, "").slice(-4),
    why: "Aadhaar is a high-value identity number. Public disclosure is dangerous.",
    fix: "Never include Aadhaar in resumes, public docs, or chat. Use masked Aadhaar (VID).",
  },
  {
    type: "PAN", category: "direct", baseSeverity: 95, baseConfidence: 98,
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, mask: (v) => v.slice(0, 3) + "****" + v.slice(-1),
    why: "PAN ties to financial accounts and KYC. Disclosure aids fraud.",
    fix: "Remove from any public artifact. Share over secure channels only.",
  },
  {
    type: "Credit Card", category: "direct", baseSeverity: 100, baseConfidence: 70,
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    mask: (v) => "**** **** **** " + v.replace(/\D/g, "").slice(-4),
    why: "Card numbers are immediately abusable.",
    fix: "Strip from screenshots and pasted text. Rotate the card if it was published.",
    boost: /\b(card|visa|master|amex|cvv)\b/i,
  },
  {
    type: "SSN", category: "direct", baseSeverity: 100, baseConfidence: 95,
    regex: /\b\d{3}-\d{2}-\d{4}\b/g, mask: () => "XXX-XX-****",
    why: "US SSN is a critical identifier. Public disclosure is catastrophic.",
    fix: "Remove immediately. If already public, place fraud alerts with credit bureaus.",
  },
  {
    type: "Date of Birth", category: "indirect", baseSeverity: 65, baseConfidence: 55,
    regex: /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/g,
    mask: (v) => "**/**/" + v.slice(-4),
    why: "DOB + name is enough for many account-recovery flows.",
    fix: "Publish only birth year or month-day, never the full DOB.",
    boost: /\b(dob|born|birth|birthday)\b/i,
  },
  {
    type: "Address", category: "indirect", baseSeverity: 80, baseConfidence: 75,
    regex: /\d+\s+\w+(?:\s+\w+)*\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|place|pl)\b/gi,
    mask: (v) => v.split(" ").slice(0, 1).join(" ") + " [REDACTED]",
    why: "Street address enables doxxing and physical-world risk.",
    fix: "Use city only in bios. Never publish street-level address.",
  },
  {
    type: "IP Address", category: "indirect", baseSeverity: 40, baseConfidence: 65,
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    mask: (v) => v.split(".").slice(0, 2).join(".") + ".***",
    why: "IP leaks location and can correlate sessions.",
    fix: "Strip IPs from shared logs and screenshots.",
  },
  {
    type: "Password Hint", category: "social", baseSeverity: 60, baseConfidence: 60,
    regex: /\b(?:password|pwd|passcode|my pass(?:word)?\s+is)\b/gi, mask: () => "[REDACTED]",
    why: "Mentioning a password — even abstractly — invites credential probing.",
    fix: "Never reference your password in any public text.",
  },
  {
    type: "Security Question Tell", category: "social", baseSeverity: 70, baseConfidence: 70,
    regex: /\b(mother'?s? maiden name|first pet|childhood (?:friend|school)|favou?rite teacher|high school|first car)\b/gi,
    mask: (v) => v.slice(0, 4) + "***",
    why: "These phrases match common account-recovery questions.",
    fix: "Avoid revealing answers to recovery questions in bios or posts.",
  },
  {
    type: "Account Number", category: "social", baseSeverity: 75, baseConfidence: 70,
    regex: /\b(?:acc(?:t|ount)?[\s:#-]*)\d{6,15}\b/gi,
    mask: (v) => v.slice(0, 4) + "***",
    why: "Account numbers help attackers pose as you to support staff.",
    fix: "Redact account numbers before sharing screenshots or emails.",
  },
];

const NAME_RE = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g;
const HANDLE_RE = /(?:^|\s)@([A-Za-z0-9_]{3,})\b/g;
const EMPLOYER_RE = /\b(?:work(?:s|ed)?|employed)\s+(?:at|for|by)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+)*)/gi;
const CITY_RE = /\b(?:lives?|based|located)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
const COLLEGE_RE = /\b(?:studied|studies|graduated|alum(?:ni|nus)?|degree)\s+(?:at|from)\s+([A-Z][\w.-]+(?:\s+[A-Z][\w.-]+)*)/gi;

function snippet(text: string, start: number, end: number): string {
  const a = Math.max(0, start - 28);
  const b = Math.min(text.length, end + 28);
  const pre = a > 0 ? "…" : "";
  const post = b < text.length ? "…" : "";
  return pre + text.slice(a, b).replace(/\s+/g, " ").trim() + post;
}

function detectInBio(text: string, idStart: number): Finding[] {
  const out: Finding[] = [];
  let i = idStart;
  const push = (f: Omit<Finding, "id">) => out.push({ ...f, id: `b-${i++}` });

  for (const d of D) {
    const re = new RegExp(d.regex.source, d.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const ev = snippet(text, m.index, m.index + raw.length);
      let confidence = d.baseConfidence;
      if (d.boost && d.boost.test(ev)) confidence = Math.min(100, confidence + 12);
      // penalize obviously decorative matches
      if (d.type === "IP Address" && /\b(version|v\d|0\.0\.0\.0|127\.0\.0\.1)\b/i.test(ev)) confidence -= 30;
      if (d.type === "Phone" && raw.replace(/\D/g, "").length < 7) confidence -= 25;
      confidence = Math.max(5, Math.min(100, confidence));
      const severity = d.baseSeverity;
      const risk: RiskLevel = severity >= 80 ? "high" : severity >= 55 ? "medium" : "low";
      push({
        type: d.type, category: d.category,
        rawValue: raw, maskedValue: d.mask(raw),
        riskLevel: risk, confidence, severity,
        evidence: ev, why: d.why, fix: d.fix, source: "bio",
        start: m.index, end: m.index + raw.length,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Names / handles / employer / city / college mentions in bio
  const corrPatterns: { re: RegExp; type: string; why: string; fix: string; severity: number; confidence: number; mask: (v: string) => string; }[] = [
    { re: NAME_RE, type: "Full Name", severity: 50, confidence: 60,
      why: "A real name combined with other clues drives re-identification.",
      fix: "Consider using initials in public bios when other identifiers are present.",
      mask: maskName },
    { re: HANDLE_RE, type: "Username Mention", severity: 55, confidence: 80,
      why: "Handles re-link your activity across platforms.",
      fix: "Avoid reusing the same handle on sensitive and public accounts.",
      mask: (v) => "@" + maskUsername(v.replace(/^@/, "")) },
    { re: EMPLOYER_RE, type: "Employer Mention", severity: 55, confidence: 75,
      why: "Employer + name narrows you to a small pool — useful for impersonation and targeted phishing.",
      fix: "Avoid combining employer with other identifiers in public posts.",
      mask: () => "[REDACTED]" },
    { re: CITY_RE, type: "City Mention", severity: 45, confidence: 70,
      why: "City pinpoints geography and feeds correlation.",
      fix: "Use region (e.g. country) instead of city in public bios.",
      mask: () => "[REDACTED]" },
    { re: COLLEGE_RE, type: "College Mention", severity: 50, confidence: 75,
      why: "Alma mater plus name and graduation year is highly identifying.",
      fix: "Skip the institution name in fully public bios.",
      mask: () => "[REDACTED]" },
  ];
  for (const p of corrPatterns) {
    const re = new RegExp(p.re.source, p.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0].trim();
      const ev = snippet(text, m.index, m.index + raw.length);
      push({
        type: p.type, category: "indirect",
        rawValue: raw, maskedValue: p.mask(raw),
        riskLevel: p.severity >= 55 ? "medium" : "low",
        confidence: p.confidence, severity: p.severity,
        evidence: ev, why: p.why, fix: p.fix, source: "bio",
        start: m.index, end: m.index + raw.length,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  return out;
}

// ----------------------------------------------------------------------------
// Field-based findings (multi-field identity input)
// ----------------------------------------------------------------------------
interface FieldSpec {
  key: keyof IdentityInput;
  label: string;
  type: string;
  category: Category;
  severity: number;
  mask: (v: string) => string;
  why: string;
  fix: string;
}

const FIELDS: FieldSpec[] = [
  { key: "name", label: "Full name", type: "Full Name", category: "indirect", severity: 50, mask: maskName,
    why: "Real names are weak identifiers alone, strong in combination with other clues.",
    fix: "Use initials in fully public profiles." },
  { key: "username", label: "Username / handle", type: "Username", category: "indirect", severity: 60, mask: maskUsername,
    why: "Handles allow cross-platform correlation of your activity.",
    fix: "Use unique handles across sensitive accounts." },
  { key: "email", label: "Email", type: "Email", category: "direct", severity: 80, mask: maskEmail,
    why: "Emails are the entry point for phishing and recovery abuse.",
    fix: "Use an alias address for public contact." },
  { key: "phone", label: "Phone", type: "Phone", category: "direct", severity: 85, mask: maskPhone,
    why: "Phones enable SIM-swap and bypass of SMS 2FA.",
    fix: "Mask middle digits or use a virtual number publicly." },
  { key: "city", label: "City", type: "City", category: "indirect", severity: 45, mask: () => "[REDACTED]",
    why: "City pinpoints location and is a strong correlation signal.",
    fix: "Use region instead of city in public bios." },
  { key: "college", label: "College", type: "College", category: "indirect", severity: 50, mask: () => "[REDACTED]",
    why: "Alma mater + name + year is highly identifying.",
    fix: "Omit institution from fully public profiles." },
  { key: "employer", label: "Employer", type: "Employer", category: "indirect", severity: 55, mask: () => "[REDACTED]",
    why: "Employer + city + name narrows you to a small pool.",
    fix: "Skip employer when posting publicly with other identifiers." },
  { key: "domain", label: "Domain", type: "Domain", category: "indirect", severity: 40, mask: (v) => v,
    why: "A personal domain links many other identifiers via WHOIS and subdomains.",
    fix: "Use privacy-protected WHOIS." },
];

// ----------------------------------------------------------------------------
// Attack-path correlation
// ----------------------------------------------------------------------------
interface PathRule {
  id: string;
  name: string;
  description: string;
  fix: string;
  severity: RiskLevel;
  /** All these finding types must be present. */
  needs: string[];
}

const PATHS: PathRule[] = [
  {
    id: "p_recovery", name: "Account Recovery Abuse",
    description: "Email + phone together expose both common recovery channels. An attacker can trigger resets and intercept codes.",
    fix: "Use a recovery email different from your primary public email and remove your phone from public bios.",
    severity: "high", needs: ["Email", "Phone"],
  },
  {
    id: "p_simswap", name: "SIM-Swap Risk",
    description: "Phone + city + employer/name is enough pretext for a carrier social-engineering attack.",
    fix: "Add a carrier port-out PIN and mask your phone publicly.",
    severity: "high", needs: ["Phone", "City"],
  },
  {
    id: "p_impersonation", name: "Impersonation Surface",
    description: "Name + employer + city builds a believable persona for impersonation and targeted phishing.",
    fix: "Decouple your name from employer and city in any single public profile.",
    severity: "medium", needs: ["Full Name", "Employer", "City"],
  },
  {
    id: "p_phish", name: "Targeted Phishing",
    description: "Email + employer + name lets attackers craft convincing internal-looking emails.",
    fix: "Use an alias address for public listings.",
    severity: "medium", needs: ["Email", "Employer"],
  },
  {
    id: "p_dox", name: "Doxxing / Stalking Risk",
    description: "Full name + city + college (or address fragment) lets a stalker locate you offline.",
    fix: "Drop college or city from any profile that already shows your real name.",
    severity: "high", needs: ["Full Name", "City"],
  },
  {
    id: "p_identity", name: "Identity-Theft Building Blocks",
    description: "Date of birth + name + city is a starter kit for opening accounts in your name.",
    fix: "Remove full DOB everywhere public; share birth year at most.",
    severity: "high", needs: ["Date of Birth", "Full Name"],
  },
  {
    id: "p_cross", name: "Cross-Platform Correlation",
    description: "A reused handle plus employer/email links activity across sites and de-anonymizes alt accounts.",
    fix: "Use unique usernames on sensitive accounts.",
    severity: "medium", needs: ["Username", "Email"],
  },
  {
    id: "p_credreset", name: "Credential-Reset Pretext",
    description: "Security-question style phrases (mother's maiden name, first pet, etc.) match common reset prompts.",
    fix: "Never publish content that answers a standard recovery question.",
    severity: "medium", needs: ["Security Question Tell"],
  },
];

// ----------------------------------------------------------------------------
// External attack paths — generated after OSINT modules return
// ----------------------------------------------------------------------------
export interface ExternalContext {
  subdomainCount?: number;
  breached?: boolean;
  emailInBio?: boolean;
}

export function generateExternalAttackPaths(
  input: IdentityInput,
  ctx: ExternalContext = {},
): AttackPath[] {
  const out: AttackPath[] = [];
  const has = (k: keyof IdentityInput) => !!(input[k] && input[k]!.trim());

  const add = (p: AttackPath) => out.push(p);

  if (has("domain") && has("email")) {
    add({
      id: "px_domain_email", name: "Corporate email + domain attack surface",
      description: "Combining a registered domain with a corporate email enables spear-phishing and mail server abuse.",
      severity: "high", confidence: 85, componentIds: [], componentLabels: ["Domain", "Email"],
      fix: "Use distinct addresses for WHOIS, public contact, and sensitive logins.",
    });
  }
  if (has("username") && has("email")) {
    add({
      id: "px_user_email", name: "Cross-platform identity enumeration",
      description: "A consistent username + email lets an adversary link accounts across platforms and build a complete profile.",
      severity: "high", confidence: 80, componentIds: [], componentLabels: ["Username", "Email"],
      fix: "Use unique handles on sensitive accounts; never reuse your primary email's local-part as a handle.",
    });
  }
  if (has("city") && has("employer") && has("name")) {
    add({
      id: "px_loc_emp_name", name: "Physical + organizational targeting vector",
      description: "Name, employer, and city together enable physical surveillance, tailgating, and LinkedIn social engineering.",
      severity: "high", confidence: 90, componentIds: [], componentLabels: ["Name", "Employer", "City"],
      fix: "Decouple name from employer and city in any single public profile.",
    });
  }
  if (has("phone") && has("name") && has("city")) {
    add({
      id: "px_simswap_full", name: "SIM-swap and vishing enablement",
      description: "Phone + name + location gives attackers everything needed to attempt a SIM-swap or voice-phishing call.",
      severity: "high", confidence: 88, componentIds: [], componentLabels: ["Phone", "Name", "City"],
      fix: "Add a carrier port-out PIN; mask phone in public profiles.",
    });
  }
  if (has("college") && has("employer") && has("name")) {
    add({
      id: "px_alumni", name: "Alumni social engineering vector",
      description: "Shared college + employer history is a classic pretexting scenario — attackers impersonate recruiters or alumni.",
      severity: "medium", confidence: 75, componentIds: [], componentLabels: ["Name", "College", "Employer"],
      fix: "Drop institution names from fully public profiles when employer is also listed.",
    });
  }
  if (has("domain") && (ctx.subdomainCount ?? 0) > 5) {
    add({
      id: "px_subdomain", name: "Subdomain attack surface",
      description: `Domain exposes ${ctx.subdomainCount} subdomains via certificate transparency — broader takeover and enumeration surface.`,
      severity: "high", confidence: 85, componentIds: [], componentLabels: ["Domain", "Subdomains"],
      fix: "Audit subdomains, retire unused ones, monitor for new cert issuance.",
    });
  }
  if (ctx.breached && ctx.emailInBio) {
    add({
      id: "px_cred_stuff", name: "Credential stuffing risk",
      description: "A breached email that also appears publicly in a bio signals the same credentials may be reused.",
      severity: "high", confidence: 90, componentIds: [], componentLabels: ["Email (breached)", "Public bio"],
      fix: "Rotate passwords on all sites using this address; enable a password manager + 2FA.",
    });
  }
  return out;
}


// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
export function analyzeIdentity(input: IdentityInput): ScanResult {
  const findings: Finding[] = [];
  let i = 0;

  // 1. Field-level findings
  for (const spec of FIELDS) {
    const raw = (input[spec.key] || "").trim();
    if (!raw) continue;
    const confidence = 100; // user-asserted
    const severity = spec.severity;
    const risk: RiskLevel = severity >= 80 ? "high" : severity >= 55 ? "medium" : "low";
    findings.push({
      id: `f-${i++}`,
      type: spec.type === "Domain" || spec.type === "City" || spec.type === "College" || spec.type === "Employer"
        ? spec.type
        : spec.type,
      category: spec.category,
      rawValue: raw,
      maskedValue: spec.mask(raw),
      riskLevel: risk,
      confidence,
      severity,
      evidence: `${spec.label}: provided directly`,
      why: spec.why,
      fix: spec.fix,
      source: "field",
      start: 0, end: 0,
    });
  }

  // 2. Bio detection
  if (input.bio && input.bio.trim()) {
    findings.push(...detectInBio(input.bio, i));
    i += 1000; // bump id space
  }

  // 3. Correlation / attack paths
  const findingsByType = new Map<string, Finding[]>();
  for (const f of findings) {
    const k = f.type;
    if (!findingsByType.has(k)) findingsByType.set(k, []);
    findingsByType.get(k)!.push(f);
  }
  const attackPaths: AttackPath[] = [];
  for (const rule of PATHS) {
    const matched = rule.needs.every((t) => findingsByType.has(t));
    if (!matched) continue;
    const components = rule.needs.flatMap((t) => findingsByType.get(t)!);
    const componentIds = components.map((c) => c.id);
    const componentLabels = rule.needs.map((t) => t);
    const confidence = Math.round(
      components.reduce((s, c) => s + c.confidence, 0) / components.length
    );
    attackPaths.push({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      confidence,
      componentIds,
      componentLabels,
      fix: rule.fix,
    });
  }

  // 4. Mitigation actions
  const actions: MitigationAction[] = [];
  // Fix-now: every high-confidence direct finding
  findings
    .filter((f) => f.category === "direct" && f.confidence >= 70)
    .forEach((f) =>
      actions.push({
        id: `a-${f.id}`,
        title: `Mask or remove ${f.type.toLowerCase()}`,
        description: f.fix,
        priority: "fix_now",
        relatedIds: [f.id],
      })
    );
  // Fix-now: every high-severity attack path
  attackPaths
    .filter((p) => p.severity === "high")
    .forEach((p) =>
      actions.push({
        id: `a-${p.id}`,
        title: `Break the "${p.name}" chain`,
        description: p.fix,
        priority: "fix_now",
        relatedIds: [p.id],
      })
    );
  // Fix-soon: medium attack paths and medium-confidence indirect findings
  attackPaths
    .filter((p) => p.severity === "medium")
    .forEach((p) =>
      actions.push({
        id: `a-${p.id}`,
        title: `Reduce "${p.name}" exposure`,
        description: p.fix,
        priority: "fix_soon",
        relatedIds: [p.id],
      })
    );
  findings
    .filter((f) => f.category === "indirect" && f.confidence >= 60 && !actions.some((a) => a.relatedIds?.includes(f.id)))
    .slice(0, 4)
    .forEach((f) =>
      actions.push({
        id: `a-${f.id}`,
        title: `Reconsider sharing ${f.type.toLowerCase()}`,
        description: f.fix,
        priority: "fix_soon",
        relatedIds: [f.id],
      })
    );
  // Monitor: low-confidence findings
  findings
    .filter((f) => f.confidence < 60)
    .slice(0, 4)
    .forEach((f) =>
      actions.push({
        id: `a-mon-${f.id}`,
        title: `Monitor possible ${f.type.toLowerCase()}`,
        description: `Detected with low confidence (${f.confidence}). Verify before acting.`,
        priority: "monitor",
        relatedIds: [f.id],
      })
    );
  if (actions.length === 0) {
    actions.push({
      id: "a-clean",
      title: "Keep practicing data minimization",
      description: "No actionable exposure detected from this input. Re-scan when you publish new content.",
      priority: "monitor",
    });
  }

  // 5. Aggregate score
  const counts: Record<Category, number> = { direct: 0, indirect: 0, correlation: 0, social: 0 };
  for (const f of findings) counts[f.category]++;
  counts.correlation = attackPaths.length;

  const validatedFindings = findings.filter((f) => f.confidence >= 60).length;

  // Weighted score: validated findings × severity + attack-path bonus
  const findingsWeight = findings.reduce(
    (s, f) => s + (f.severity / 100) * (f.confidence / 100) * 6,
    0
  );
  const pathWeight = attackPaths.reduce(
    (s, p) => s + (p.severity === "high" ? 18 : p.severity === "medium" ? 10 : 5),
    0
  );
  const score = Math.max(0, Math.min(100, Math.round(findingsWeight + pathWeight)));
  const categoriesAffected = (Object.values(counts) as number[]).filter((n) => n > 0).length;

  return {
    findings: findings.sort((a, b) => b.severity * b.confidence - a.severity * a.confidence),
    attackPaths,
    actions,
    counts,
    totalFound: findings.length,
    validatedFindings,
    score,
    categoriesAffected,
  };
}

/** Backward-compatible helper — analyzes free text as a bio. */
export function scanText(text: string): ScanResult {
  return analyzeIdentity({ bio: text });
}

export function scoreColor(score: number) {
  if (score < 30) return "success";
  if (score < 60) return "warning";
  return "danger";
}

/** Legacy recommendation list — kept so existing callers don't break. */
export function getRecommendations(result: ScanResult): string[] {
  return result.actions.map((a) => `${PRIORITY_META[a.priority].label}: ${a.title} — ${a.description}`);
}

export const DEMO_INPUT: IdentityInput = {
  name: "John Smith",
  username: "johnsmith123",
  email: "john.smith@gmail.com",
  phone: "+1 415 555 0142",
  city: "Hyderabad",
  college: "IIIT Hyderabad",
  employer: "TechCorp",
  bio: "Hi, I'm John Smith. You can reach me at john.smith@gmail.com or call +1 415 555 0142. I work at TechCorp as a senior analyst, based in Hyderabad. Studied at IIIT Hyderabad. DOB 15/03/1992. My mother's maiden name is Patel.",
};

export const DEMO_TEXT = DEMO_INPUT.bio!;
