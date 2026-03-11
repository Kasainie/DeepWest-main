import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const ADD_COMPANY_VALUE = "__add_new_company__";

export function CompanySwitcher() {
  const { companies, currentCompany, companyRole, switchCompany } = useCompany();
  const navigate = useNavigate();
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isOwner = companyRole === "owner";

  if (companies.length === 0) return null;

  const handleValueChange = (value: string) => {
    if (value === ADD_COMPANY_VALUE) {
      navigate("/register-company");
      return;
    }
    if (value === currentCompany?.id) return;

    // Prompt for password
    setPendingCompanyId(value);
    setPassword("");
    setShowPassword(false);
    setPasswordDialog(true);
  };

  const handleVerifyAndSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCompanyId || !password) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "company-password?action=verify_password",
        { body: { company_id: pendingCompanyId, password } }
      );

      if (error) throw new Error("Verification failed");
      if (!data?.verified) {
        toast.error("Incorrect company password");
        return;
      }

      await switchCompany(pendingCompanyId);
      setPasswordDialog(false);
      toast.success("Switched company successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to verify password");
    } finally {
      setLoading(false);
    }
  };

  const pendingCompany = companies.find((c) => c.id === pendingCompanyId);

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={currentCompany?.id || ""}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-[200px] h-9 bg-secondary border-0">
            <div className="flex items-center gap-2">
              {currentCompany?.logo_url ? (
                <img
                  src={currentCompany.logo_url}
                  alt=""
                  className="h-5 w-5 rounded object-cover"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-4 w-4 rounded object-cover" />
                  ) : (
                    <Building2 className="h-3 w-3" />
                  )}
                  {c.name}
                </div>
              </SelectItem>
            ))}
            {isOwner && (
              <>
                <Separator className="my-1" />
                <SelectItem value={ADD_COMPANY_VALUE}>
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="h-3 w-3" />
                    Register New Company
                  </div>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Lock className="h-5 w-5 text-primary" />
              Company Password Required
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVerifyAndSwitch} className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Enter the password to switch to{" "}
              <span className="font-semibold text-foreground">
                {pendingCompany?.name}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="switch-password">Password</Label>
              <div className="relative">
                <Input
                  id="switch-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter company password"
                  required
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Switch Company
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
