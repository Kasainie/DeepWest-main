import { useState, useEffect } from "react";
import { Navigate, Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Hotel, Loader2, KeyRound, Mail, Building2, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 20, label: "Weak", color: "bg-destructive" };
  if (score <= 2) return { score: 40, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score: 60, label: "Medium", color: "bg-yellow-500" };
  if (score <= 4) return { score: 80, label: "Strong", color: "bg-emerald-500" };
  return { score: 100, label: "Very Strong", color: "bg-emerald-600" };
}
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

interface CompanyInfo {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

export default function Login() {
  const { session } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staffCode, setStaffCode] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [companyLoading, setCompanyLoading] = useState(!!slug);

  useEffect(() => {
    if (!slug) return;
    setCompanyLoading(true);
    const fetchCompany = async () => {
      try {
        const { data } = await supabase.rpc("get_company_by_slug", { _slug: slug });
        if (data && Array.isArray(data) && data.length > 0) {
          setCompany(data[0] as CompanyInfo);
        }
      } finally {
        setCompanyLoading(false);
      }
    };
    fetchCompany();
  }, [slug]);

  useEffect(() => {
    setIsSignUp(searchParams.get("mode") === "signup");
  }, [searchParams]);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const parsed = signupSchema.parse({ email, password, fullName, confirmPassword });
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            data: { full_name: parsed.fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const parsed = loginSchema.parse({ email, password });
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Authentication failed");
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
          staff_password: staffPassword || undefined,
        },
      });

      if (error) {
        // Surface the real message from the function's error response body
        let message = "Invalid staff code";
        try {
          const body = await (error as any)?.context?.json?.();
          if (body?.error) message = body.error;
        } catch {
          /* ignore parse errors */
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
    } catch (err: any) {
      toast.error(err.message || "Invalid staff code");
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center pb-2">
          {companyLoading ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : company ? (
            <>
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover border border-border"
                />
              ) : (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                </div>
              )}
              <h1 className="text-2xl font-bold font-display">{company.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your dashboard</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                <Hotel className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold font-display">LKTECH</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your dashboard</p>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="owner" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="owner" className="text-xs gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Owner / Admin
              </TabsTrigger>
              <TabsTrigger value="staff" className="text-xs gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Staff Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owner">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {isSignUp && password && (
                    <div className="space-y-1 mt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Strength</span>
                        <span className={`text-xs font-medium ${
                          getPasswordStrength(password).score <= 40 ? "text-destructive" : 
                          getPasswordStrength(password).score <= 60 ? "text-yellow-600" : "text-emerald-600"
                        }`}>
                          {getPasswordStrength(password).label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                          style={{ width: `${getPasswordStrength(password).score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={async () => {
                  try {
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                      extraParams: { prompt: "select_account" },
                    });
                    if (result.error) {
                      toast.error(result.error.message || "Google sign-in failed");
                      return;
                    }
                    if (result.redirected) return;
                    navigate("/dashboard", { replace: true });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Google sign-in failed");
                  }
                }}

              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = isSignUp ? null : "signup";
                    const nextParams = new URLSearchParams(searchParams);

                    if (nextMode) {
                      nextParams.set("mode", nextMode);
                    } else {
                      nextParams.delete("mode");
                    }

                    setSearchParams(nextParams, { replace: true });
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="rounded-lg bg-secondary/50 p-3 mb-2">
                  <p className="text-xs text-muted-foreground">
                    Enter the staff code and password provided by your manager. You will only see your own restaurant/company.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffCode">Staff Code</Label>
                  <Input
                    id="staffCode"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                    placeholder="e.g. STAFF-001"
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={20}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffPassword">
                    Password <span className="text-muted-foreground font-normal">(if your manager set one)</span>
                  </Label>
                  <Input
                    id="staffPassword"
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Staff password"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={staffLoading}>
                  {staffLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Sign In with Staff Code
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
