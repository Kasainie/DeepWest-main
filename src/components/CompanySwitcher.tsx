import { useCompany } from "@/contexts/CompanyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function CompanySwitcher() {
  const { companies, currentCompany, companyRole, switchCompany } = useCompany();
  if (companies.length === 0) return null;

  const canSwitch = companyRole === "owner" || companyRole === "admin";
  const compactCompanyName = currentCompany?.name.replace(/\s+Hotel\b/i, "");

  // Staff are locked to the single company they belong to — no cross-tenant switching.
  if (!canSwitch) {
    return (
      <div className="flex min-w-0 max-w-[38vw] items-center sm:max-w-none">
        <span className="truncate text-xs font-medium sm:text-sm">{compactCompanyName}</span>
      </div>
    );
  }

  const handleValueChange = (value: string) => {
    switchCompany(value);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentCompany?.id || ""}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="h-9 w-[132px] min-w-0 bg-secondary border-0 px-2 sm:w-[200px]">
          <div className="flex min-w-0 items-center gap-1">
            {currentCompany?.logo_url ? (
              <img
                src={currentCompany.logo_url}
                alt=""
                className="h-4 w-4 shrink-0 rounded object-cover sm:h-5 sm:w-5"
              />
            ) : (
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            )}
            <SelectValue className="min-w-0 truncate text-xs sm:text-sm">
              <span className="sm:hidden">{compactCompanyName}</span>
              <span className="hidden sm:inline">{currentCompany?.name}</span>
            </SelectValue>
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
        </SelectContent>
      </Select>
    </div>
  );
}
