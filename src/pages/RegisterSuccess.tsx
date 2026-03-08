import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Copy, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

export default function RegisterSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const slug = location.state?.slug || "";
  const adminCode = location.state?.adminCode || "";

  const nextSteps = [
    { title: "Complete Your Profile", description: "Add your company details and branding" },
    { title: "Invite Your Team", description: "Add staff members and assign roles" },
    { title: "Set Up Your Menu", description: "Create menu items for your restaurant" },
    { title: "Configure Rooms", description: "Set up rooms and booking preferences" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            >
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>
            <h1 className="text-3xl font-bold font-display">Company Created!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your company has been successfully registered
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Admin Access Code */}
            {adminCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase">Your Admin Access Code</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-mono font-bold tracking-widest text-foreground">
                    {adminCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adminCode);
                      setCodeCopied(true);
                      toast.success("Admin code copied!");
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="p-2 hover:bg-background rounded-md transition-colors"
                    title="Copy code"
                  >
                    <Copy className={`h-5 w-5 ${codeCopied ? "text-green-600" : "text-muted-foreground"}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this code to log in via Staff Code login. It has also been sent to your email.
                  Keep it safe — you'll need it to access your admin dashboard.
                </p>
              </motion.div>
            )}

            {/* Company Slug Display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Your Company URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-semibold break-all text-foreground">
                  lktech.life/{slug}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`lktech.life/${slug}`);
                    setCopied(true);
                    toast.success("URL copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 hover:bg-background rounded-md transition-colors"
                  title="Copy URL"
                >
                  <Copy className={`h-5 w-5 ${copied ? "text-green-600" : "text-muted-foreground"}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with your customers to access your business
              </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Next Steps</h2>
              <div className="grid gap-3">
                {nextSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                View Settings Later
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
