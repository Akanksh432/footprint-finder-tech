import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar, Footer } from "@/components/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle2, Mail, Calendar, Activity, KeyRound, Save, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "Account — CyberOracle" }],
  }),
  component: AccountPage,
});

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [totalScans, setTotalScans] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setFullName((data as Profile).full_name ?? "");
      } else {
        setProfile({
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name as string) ?? "",
          created_at: user.created_at,
        });
        setFullName((user.user_metadata?.full_name as string) ?? "");
      }
      const { count } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTotalScans(count ?? 0);
    })();
  }, [user?.id]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Could not save", { description: error.message });
    else {
      toast.success("Profile updated");
      setProfile((p) => (p ? { ...p, full_name: fullName } : p));
    }
  };

  const onResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) toast.error("Could not send reset email", { description: error.message });
    else toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl w-full px-5 sm:px-8 py-12">
        <div className="text-xs uppercase tracking-widest text-neon">Account</div>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account details and security.</p>

        {!profile ? (
          <div className="mt-8 space-y-3">
            <div className="h-32 rounded-2xl bg-card border border-border animate-pulse" />
            <div className="h-48 rounded-2xl bg-card border border-border animate-pulse" />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl bg-card border border-border p-6 ring-neon">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
                  <UserCircle2 className="h-7 w-7 text-neon" />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-xl font-semibold truncate">
                    {profile.full_name || "Unnamed"}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Stat icon={Calendar} label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
                <Stat icon={Activity} label="Total scans" value={totalScans === null ? "…" : String(totalScans)} />
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-6">
              <h2 className="font-medium">Edit profile</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full min-h-11 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
                  <input
                    value={profile.email}
                    disabled
                    className="mt-2 w-full min-h-11 px-3 rounded-lg bg-input/50 border border-border text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={onSave}
                  disabled={saving || fullName === (profile.full_name ?? "")}
                  className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-6">
              <h2 className="font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-neon" /> Security</h2>
              <p className="mt-2 text-sm text-muted-foreground">We'll email you a secure link to set a new password.</p>
              <button
                onClick={onResetPassword}
                disabled={sendingReset}
                className="mt-4 inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-surface border border-border hover:border-neon/40 text-sm disabled:opacity-50"
              >
                {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Change password
              </button>
            </div>

            <div className="text-xs text-muted-foreground flex gap-4">
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface/50 border border-border p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
