import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, Field, SubmitButton, FormBanner } from "@/components/auth-form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      setSuccess("Account created. Check your email to confirm, then sign in.");
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save scans, track exposure over time, and keep a private history."
      footer={<>Already have an account? <Link to="/login" className="text-neon hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormBanner tone="error">{error}</FormBanner>}
        {success && <FormBanner tone="success">{success}</FormBanner>}
        <Field label="Full name" value={fullName} onChange={setFullName} required autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" placeholder="At least 6 characters" />
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
