import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompanySwitcher() {
  const { companies, currentCompany, switchCompany } = useCompany();
  const navigate = useNavigate();

  if (companies.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentCompany?.id || ""}
        onValueChange={(val) => {
          if (val === "__new__") {
            navigate("/register-company");
          } else {
            switchCompany(val);
          }
        }}
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
          <SelectItem value="__new__">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-3 w-3" />
              Add new company
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
