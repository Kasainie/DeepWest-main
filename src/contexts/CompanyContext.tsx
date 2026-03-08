import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  owner_id: string;
}

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  companyRole: string | null;
  staffDepartment: string[] | null;
  loading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  currentCompany: null,
  companyRole: null,
  staffDepartment: null,
  loading: true,
  switchCompany: async () => {},
  refreshCompanies: async () => {},
});

export const useCompany = () => useContext(CompanyContext);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [staffDepartment, setStaffDepartment] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setCompanyRole(null);
      setStaffDepartment(null);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setCompanies([]);
      setCurrentCompany(null);
      setCompanyRole(null);
      setLoading(false);
      return;
    }

    const companyIds = memberships.map((m) => m.company_id);
    const { data: companiesData } = await supabase
      .from("companies")
      .select("*")
      .in("id", companyIds);

    const list = (companiesData || []) as Company[];
    setCompanies(list);

    // Check for staff login override first, then fall back to profile
    const staffLoginCompanyId = sessionStorage.getItem("staff_login_company_id");
    if (staffLoginCompanyId) {
      sessionStorage.removeItem("staff_login_company_id");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_company_id")
      .eq("user_id", user.id)
      .single();

    const preferredId = staffLoginCompanyId || profile?.current_company_id;
    let active = list.find((c) => c.id === preferredId) || list[0] || null;
    setCurrentCompany(active);

    // Update profile if we used the staff login override
    if (staffLoginCompanyId && active && active.id !== profile?.current_company_id) {
      await supabase
        .from("profiles")
        .update({ current_company_id: active.id })
        .eq("user_id", user.id);
    }

    if (active) {
      const membership = memberships.find((m) => m.company_id === active!.id);
      setCompanyRole(membership?.role || null);

      // Fetch staff department
      const { data: staffRecord } = await supabase
        .from("company_staff")
        .select("department")
        .eq("company_id", active!.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setStaffDepartment(staffRecord?.department as string[] || null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const switchCompany = async (companyId: string) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ current_company_id: companyId })
      .eq("user_id", user.id);

    const company = companies.find((c) => c.id === companyId) || null;
    setCurrentCompany(company);

    const { data: membership } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    setCompanyRole(membership?.role || null);

    // Fetch staff department on switch
    const { data: staffRecord } = await supabase
      .from("company_staff")
      .select("department")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();
    setStaffDepartment(staffRecord?.department as string[] || null);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        companyRole,
        staffDepartment,
        loading,
        switchCompany,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}
