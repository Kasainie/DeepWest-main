import { Home, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabBarProps {
  activeTab: "home" | "history";
  onTabChange: (tab: "home" | "history") => void;
}

const tabs = [
  { key: "home" as const, label: "Home", icon: Home },
  { key: "history" as const, label: "History", icon: History },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-lg transition-colors",
              activeTab === key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", activeTab === key && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
