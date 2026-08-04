import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Hotel, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
});

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const parsed = emailSchema.parse({ email });

      // Branded reset email sent instantly via our own mailer
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: parsed.email, origin: window.location.origin },
      });

      if (error || (data && data.success === false)) {
        // Fallback to the built-in mailer so the user is never blocked
        const { error: fallbackError } = await supabase.auth.resetPasswordForEmail(
          parsed.email,
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (fallbackError) throw fallbackError;
      }

      setSent(true);
      toast.success("Password reset email sent");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Hotel className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent
              ? "Check your email for a reset link"
              : "Enter your email to receive a password reset link"}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                We sent a reset link to <span className="font-medium text-foreground">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSent(false)}
              >
                Send again
              </Button>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@grandvista.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
