import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, Field, SubmitButton, FormBanner } from "@/components/auth-form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 1200);
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Open this page from your reset email."
      footer={<><Link to="/login" className="text-neon hover:underline">Back to sign in</Link></>}
    >
      {success ? (
        <FormBanner tone="success">Password updated. Redirecting…</FormBanner>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <FormBanner tone="error">{error}</FormBanner>}
          <Field label="New password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />
          <SubmitButton loading={loading}>Update password</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
