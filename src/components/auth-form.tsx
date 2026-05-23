import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-5 sm:px-8 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
            <Shield className="h-4 w-4 text-neon" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Cyber<span className="text-neon">Oracle</span>
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-card border border-border p-8 ring-neon">
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function Field({
  label, type = "text", value, onChange, autoComplete, required, placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full min-h-11 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm transition-colors"
      />
    </label>
  );
}

export function SubmitButton({ children, loading, disabled }: { children: React.ReactNode; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full min-h-12 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-teal"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function FormBanner({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "error" ? "bg-danger/10 text-danger ring-danger/30" :
    tone === "success" ? "bg-success/10 text-success ring-success/30" :
    "bg-surface text-muted-foreground ring-border";
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${cls}`}>{children}</div>
  );
}
