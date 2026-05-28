import { Link, useLocation } from "wouter";
import {
  Briefcase, ArrowLeftRight, Wallet, Target, CreditCard, TrendingUp,
  Sparkles, FileBarChart, Settings, ChevronLeft, Shield, BookOpen,
} from "lucide-react";

const currentUser = { role: "admin" };

const mainNavItems = [
  { href: "/", label: "Portföyüm", icon: Briefcase, color: null },
  { href: "/islemler", label: "İşlemler", icon: ArrowLeftRight, color: null },
  { href: "/not-defteri", label: "Not Defteri", icon: BookOpen, color: "#A78BFA" },
  { href: "/butce", label: "Bütçe", icon: Wallet, color: null },
  { href: "/hedefler", label: "Hedefler", icon: Target, color: null },
  { href: "/borclar", label: "Borçlar", icon: CreditCard, color: null },
  { href: "/simulator", label: "Simülatör", icon: TrendingUp, color: null },
  { href: "/ai-koc", label: "AI Koç", icon: Sparkles, color: null },
  { href: "/raporlar", label: "Raporlar", icon: FileBarChart, color: null },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const [location] = useLocation();
  const isAdmin = currentUser.role === "admin" || currentUser.role === "superadmin";
  const isSettingsActive = location.startsWith("/settings") || location === "/ayarlar";
  const isAdminActive = location.startsWith("/admin");

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-[#0E1117] border-r border-[rgba(255,255,255,0.06)] flex flex-col transition-all duration-300 z-50"
      style={{ width: collapsed ? "72px" : "220px" }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00D4AA] glow-green flex items-center justify-center flex-shrink-0">
            <span className="text-[#080A0F] font-bold text-lg leading-none">E</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-semibold text-[#F0F2F7] tracking-tight leading-tight">EkoS</h1>
              <p className="text-[10px] text-[#4E5A6B] leading-tight">Yatırım Platformu</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          const accentColor = item.color || "#00D4AA";
          const activeBg = item.color
            ? `rgba(167,139,250,0.08)`
            : "rgba(0,212,170,0.08)";
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group"
              style={{
                background: isActive ? activeBg : "transparent",
                color: isActive ? accentColor : "#8892A4",
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
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: accentColor }}
                />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Settings */}
        <Link
          href="/ayarlar"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative"
          style={{ background: isSettingsActive ? "rgba(0,212,170,0.08)" : "transparent", color: isSettingsActive ? "#00D4AA" : "#8892A4" }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (!isSettingsActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#F0F2F7"; }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (!isSettingsActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8892A4"; }
          }}
          data-testid="nav-settings"
        >
          {isSettingsActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#00D4AA] rounded-r-full" />}
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium truncate">Ayarlar</span>}
        </Link>

        {/* Admin */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative"
            style={{ background: isAdminActive ? "rgba(255,71,87,0.08)" : "transparent", color: isAdminActive ? "#FF4757" : "#8892A4" }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              if (!isAdminActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#F0F2F7"; }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              if (!isAdminActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8892A4"; }
            }}
            data-testid="nav-admin"
          >
            {isAdminActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF4757] rounded-r-full" />}
            <div className="relative flex-shrink-0">
              <Shield className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4757] rounded-full animate-pulse" />
            </div>
            {!collapsed && (
              <>
                <span className="text-sm font-medium truncate flex-1">Admin</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FF4757] text-white rounded flex-shrink-0">ADMIN</span>
              </>
            )}
          </Link>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3" style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
          <div className="w-9 h-9 rounded-lg bg-[#1E2A3A] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.06)]">
            <span className="text-xs font-bold text-[#00D4AA]">ES</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F0F2F7] truncate">Erkan S.</p>
              <p className="text-[10px] text-[#4E5A6B] truncate">Administratör</p>
            </div>
          )}
          {!collapsed && (
            <div className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(0,212,170,0.15)] text-[#00D4AA] border border-[rgba(0,212,170,0.2)] flex-shrink-0">PRO</div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[#151A23] border border-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[#1E2A3A] transition-colors z-10"
        data-testid="button-collapse-sidebar"
      >
        <ChevronLeft
          className="w-3 h-3 text-[#8892A4] transition-transform duration-300"
          style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
    </aside>
  );
}
