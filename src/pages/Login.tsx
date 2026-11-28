import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
}

export default function Login() {
  const { session } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [requiresStaffPassword, setRequiresStaffPassword] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchCompany = async () => {
      const { data, error } = await supabase.rpc("get_company_by_slug", { _slug: slug });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data && Array.isArray(data) && data.length > 0) {
        setCompany(data[0] as CompanyInfo);
      }
    };
    fetchCompany();
  }, [slug]);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const parsed = loginSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Invalid login details");
      } else {
        toast.error(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffCode.trim()) {
      toast.error("Please enter your staff code");
      return;
    }
    setStaffLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("staff-login", {
        body: {
          staff_code: staffCode.replace(/\s+/g, "").toUpperCase(),
          staff_password: requiresStaffPassword ? staffPassword : undefined,
          company_slug: slug ?? null,
        },
      });

      if (error) {
        let message = "Invalid staff code";
        let passwordRequired = false;
        const errorContext: unknown = "context" in error ? error.context : null;
        if (errorContext instanceof Response) {
          const body: unknown = await errorContext.clone().json().catch(() => null);
          if (body && typeof body === "object") {
            if ("error" in body && typeof body.error === "string") {
              message = body.error;
            }
            passwordRequired = "password_required" in body && body.password_required === true;
          }
        }
        if (passwordRequired) {
          setRequiresStaffPassword(true);
          setStaffPassword("");
          toast.info("This staff account requires a password");
          return;
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      if (data?.session) {
        if (data.staff?.company_id) {
          sessionStorage.setItem("staff_login_company_id", data.staff.company_id);
        }
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success(`Welcome, ${data.staff?.full_name}!`, {
          description: `${data.staff?.department} · ${data.staff?.company_name}`,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid staff code");
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <main className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-sm rounded-2xl border shadow-elevated">
          <CardHeader className="items-start text-left pb-3">
            <img
              src="/deepwest-hotel-logo.png"
              alt="DeepWest Hotel"
              className="mb-2 w-52 self-center object-contain"
            />
            <h1 className="text-lg font-bold font-display">{company?.name || "DeepWest"}</h1>
            <p className="text-sm text-muted-foreground">Sign in to your hotel account.</p>
          </CardHeader>
          <CardContent>
            {isAdminLogin ? (
              <div className="space-y-2.5">
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <Label htmlFor="email" className="sr-only">Admin email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="username"
                    required
                  />
                  <Label htmlFor="password" className="sr-only">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAdminLogin(false)}
                >
                  Back to access code
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <form onSubmit={handleStaffLogin} className="space-y-2.5">
                  <Label htmlFor="staffCode" className="sr-only">Access code</Label>
                  <Input
                    id="staffCode"
                    value={staffCode}
                    onChange={(e) => {
                      setStaffCode(e.target.value.toUpperCase());
                      setRequiresStaffPassword(false);
                      setStaffPassword("");
                    }}
                    placeholder="Staff access code"
                    autoComplete="one-time-code"
                    required
                  />
                  {requiresStaffPassword && (
                    <>
                      <Label htmlFor="staffPassword" className="sr-only">Staff password</Label>
                      <Input
                        id="staffPassword"
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="Staff password"
                        autoComplete="current-password"
                        required
                      />
                    </>
                  )}
                  <Button type="submit" className="w-full" disabled={staffLoading}>
                    {staffLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAdminLogin(true)}
                >
                  Sign in as admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="flex justify-center pt-4">
        <Button asChild variant="outline">
          <a href="/deepwest-app-20261126.apk" download="deepwest-app-20261126.apk">
            <Download aria-hidden="true" />
            Download DeepWest App
          </a>
        </Button>
      </footer>
    </div>
  );
}
