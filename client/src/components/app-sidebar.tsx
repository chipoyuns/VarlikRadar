import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Briefcase,
  ArrowLeftRight,
  Wallet,
  Target,
  CreditCard,
  TrendingUp,
  Sparkles,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Portföyüm", icon: Briefcase },
  { href: "/islemler", label: "İşlemler", icon: ArrowLeftRight },
  { href: "/butce", label: "Bütçe", icon: Wallet },
  { href: "/hedefler", label: "Hedefler", icon: Target },
  { href: "/borclar", label: "Borçlar", icon: CreditCard },
  { href: "/simulator", label: "Simülatör", icon: TrendingUp },
  { href: "/ai-koc", label: "AI Koç", icon: Sparkles },
  { href: "/raporlar", label: "Raporlar", icon: FileBarChart },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-[#0E1117] border-r border-[rgba(255,255,255,0.06)] flex flex-col transition-all duration-300 z-50"
      style={{ width: collapsed ? "72px" : "200px" }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00D4AA] glow-green flex items-center justify-center flex-shrink-0">
            <span className="text-[#080A0F] font-bold text-lg leading-none">F</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-[15px] font-semibold text-[#F0F2F7] tracking-tight leading-tight">FinOS</h1>
              <p className="text-[10px] text-[#4E5A6B] leading-tight">Yatırım Platformu</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group"
              style={{
                background: isActive ? "rgba(0,212,170,0.08)" : "transparent",
                color: isActive ? "#00D4AA" : "#8892A4",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.color = "#F0F2F7";
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#8892A4";
                }
              }}
              data-testid={`nav-${item.href === "/" ? "portfolio" : item.href.slice(1)}`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#00D4AA] rounded-r-full" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3" style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4B9EFF] to-[#A78BFA] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">AY</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#F0F2F7] truncate">Ahmet Y.</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FFB833] text-[#080A0F] rounded glow-gold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-[#4E5A6B]">Premium Üye</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#151A23] border border-[rgba(255,255,255,0.1)] rounded-full flex items-center justify-center text-[#8892A4] hover:text-[#F0F2F7] hover:bg-[#1a2030] transition-colors"
        data-testid="button-sidebar-toggle"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
