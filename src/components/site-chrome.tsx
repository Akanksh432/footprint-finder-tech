import { Link, useNavigate } from "@tanstack/react-router";
import { Shield, LogOut, LayoutDashboard, Menu, X, UserCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth, signOut } from "@/hooks/use-auth";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/scanner", label: "Scanner" },
  { to: "/about", label: "About" },
] as const;

const AUTH_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/notebook", label: "Notebook" },
] as const;

export function Navbar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
            <Shield className="h-4 w-4 text-neon" />
            <span className="absolute inset-0 rounded-lg bg-neon/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Cyber<span className="text-neon">Oracle</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[
            ...NAV_LINKS,
            ...(user ? AUTH_LINKS : []),
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-foreground data-[status=active]:bg-surface"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {loading ? (
            <div className="h-11 w-28 rounded-lg bg-surface animate-pulse" />
          ) : user ? (
            <>
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-sm"
              >
                <UserCircle2 className="h-3.5 w-3.5" /> Account
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-sm"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center min-h-11 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors ring-1 ring-neon/20"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface border border-border"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-5 py-4 flex flex-col gap-1">
            {[
              ...NAV_LINKS,
              ...(user ? [...AUTH_LINKS, { to: "/account", label: "Account" } as const] : []),
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="min-h-12 px-3 flex items-center rounded-md text-foreground hover:bg-surface"
              >
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            {user ? (
              <button
                onClick={handleSignOut}
                className="min-h-12 px-3 flex items-center gap-2 rounded-md text-left bg-surface"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 min-h-12 inline-flex items-center justify-center rounded-md bg-surface border border-border"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 min-h-12 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
              <Shield className="h-4 w-4 text-neon" />
            </span>
            <div className="font-display text-lg font-bold">
              Cyber<span className="text-neon">Oracle</span>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 max-w-sm">
            Privacy protection for the digital age. Detect exposed PII before it becomes a liability.
          </p>
        </div>
        <div>
          <div className="text-foreground font-medium mb-3">Product</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/scanner" className="hover:text-foreground">Scanner</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-foreground font-medium mb-3">Legal</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CyberOracle · Privacy protection for the digital age
      </div>
    </footer>
  );
}
