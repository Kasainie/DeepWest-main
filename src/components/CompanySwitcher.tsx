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

  const canSwitch = ["owner", "admin", "manager"].includes(companyRole?.toLowerCase() ?? "");
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
        <SelectTrigger
          aria-label="Switch hotel"
          className="h-8 w-fit min-w-0 max-w-[38vw] border-0 bg-transparent px-1 text-xs sm:h-9 sm:max-w-[220px] sm:px-2 sm:text-sm"
        >
          <div className="flex min-w-0 items-center">
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
