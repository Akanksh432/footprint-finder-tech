import { Link, useNavigate } from "@tanstack/react-router";
import { Shield, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";

export function Navbar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
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
            { to: "/", label: "Home" },
            { to: "/scanner", label: "Scanner" },
            { to: "/about", label: "About" },
            ...(user ? [{ to: "/dashboard", label: "Dashboard" }] : []),
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
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-11 w-28 rounded-lg bg-surface animate-pulse" />
          ) : user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-neon/40 text-sm"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
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
                className="hidden sm:inline-flex items-center min-h-11 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground"
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
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div className="md:col-span-2">
          <div className="font-display text-lg font-bold">
            Cyber<span className="text-neon">Oracle</span>
          </div>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Detect your digital footprint risk before others do. Client-side PII scanning that never sends your data anywhere unless you save it.
          </p>
        </div>
        <div>
          <div className="text-foreground font-medium mb-3">Product</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/scanner" className="hover:text-foreground">Scanner</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-foreground font-medium mb-3">Account</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>
            <li><Link to="/signup" className="hover:text-foreground">Sign up</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CyberOracle
      </div>
    </footer>
  );
}
