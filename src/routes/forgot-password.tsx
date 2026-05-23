import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, Field, SubmitButton, FormBanner } from "@/components/auth-form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={<><Link to="/login" className="text-neon hover:underline">Back to sign in</Link></>}
    >
      {sent ? (
        <FormBanner tone="success">If an account exists for {email}, a reset link is on its way.</FormBanner>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <FormBanner tone="error">{error}</FormBanner>}
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
