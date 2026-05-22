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
  ChevronDown,
  Shield,
  Eye,
  Bell,
  Lock,
  Palette,
  Globe,
  Crown,
  Database,
} from "lucide-react";

const currentUser = { role: "admin" };

const mainNavItems = [
  { href: "/", label: "Portföyüm", icon: Briefcase },
  { href: "/islemler", label: "İşlemler", icon: ArrowLeftRight },
  { href: "/butce", label: "Bütçe", icon: Wallet },
  { href: "/hedefler", label: "Hedefler", icon: Target },
  { href: "/borclar", label: "Borçlar", icon: CreditCard },
  { href: "/simulator", label: "Simülatör", icon: TrendingUp },
  { href: "/ai-koc", label: "AI Koç", icon: Sparkles },
  { href: "/raporlar", label: "Raporlar", icon: FileBarChart },
];

const settingsSubItems = [
  { href: "/ayarlar", label: "Genel", icon: Settings },
  { href: "/settings/gorunum", label: "Görünüm", icon: Palette },
  { href: "/settings/bildirimler", label: "Bildirimler", icon: Bell },
  { href: "/settings/gizlilik", label: "Gizlilik", icon: Lock },
  { href: "/settings/bolgesel", label: "Bölgesel", icon: Globe },
  { href: "/settings/premium", label: "Premium", icon: Crown },
  { href: "/settings/yedekleme", label: "Yedekleme", icon: Database },
];

const adminSubItems = [
  { href: "/admin", label: "Genel Bakış", icon: Eye },
  { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: Briefcase },
  { href: "/admin/uyeler", label: "Üyeler", icon: CreditCard },
  { href: "/admin/istatistikler", label: "İstatistikler", icon: TrendingUp },
  { href: "/admin/icerik", label: "İçerik", icon: FileBarChart },
  { href: "/admin/sistem", label: "Sistem", icon: Database },
  { href: "/admin/guvenlik", label: "Güvenlik", icon: Shield },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
  { href: "/admin/destek", label: "Destek", icon: Sparkles },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const [location] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(location.startsWith("/settings") || location === "/ayarlar");
  const [adminOpen, setAdminOpen] = useState(location.startsWith("/admin"));

  const isAdmin = currentUser.role === "admin" || currentUser.role === "superadmin";

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-[#0E1117] border-r border-[rgba(255,255,255,0.06)] flex flex-col transition-all duration-300 z-50"
      style={{ width: collapsed ? "72px" : "220px" }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00D4AA] glow-green flex items-center justify-center flex-shrink-0">
            <span className="text-[#080A0F] font-bold text-lg leading-none">F</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-semibold text-[#F0F2F7] tracking-tight leading-tight">FinOS</h1>
              <p className="text-[10px] text-[#4E5A6B] leading-tight">Yatırım Platformu</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Nav Items */}
        {mainNavItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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

        {/* Settings with Sub Menu */}
        <div>
          <button
            onClick={() => !collapsed && setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group"
            style={{
              background: location.startsWith("/settings") || location === "/ayarlar"
                ? "rgba(0,212,170,0.08)"
                : "transparent",
              color: location.startsWith("/settings") || location === "/ayarlar"
                ? "#00D4AA"
                : "#8892A4",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!(location.startsWith("/settings") || location === "/ayarlar")) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.color = "#F0F2F7";
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!(location.startsWith("/settings") || location === "/ayarlar")) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#8892A4";
              }
            }}
            data-testid="nav-settings"
          >
            {(location.startsWith("/settings") || location === "/ayarlar") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#00D4AA] rounded-r-full" />
            )}
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm font-medium truncate flex-1 text-left">Ayarlar</span>
                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${settingsOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>

          {/* Settings Sub Items */}
          {!collapsed && settingsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-3">
              {settingsSubItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 text-xs"
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
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin with Sub Menu - Only for Admins */}
        {isAdmin && (
          <div>
            <button
              onClick={() => !collapsed && setAdminOpen(!adminOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group"
              style={{
                background: location.startsWith("/admin")
                  ? "rgba(255,71,87,0.08)"
                  : "transparent",
                color: location.startsWith("/admin")
                  ? "#FF4757"
                  : "#8892A4",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!location.startsWith("/admin")) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.color = "#F0F2F7";
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!location.startsWith("/admin")) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#8892A4";
                }
              }}
              data-testid="nav-admin"
            >
              {location.startsWith("/admin") && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF4757] rounded-r-full" />
              )}
              <div className="relative">
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4757] rounded-full animate-pulse" />
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium truncate flex-1 text-left">Admin</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FF4757] text-white rounded flex-shrink-0">
                    ADMIN
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${adminOpen ? "rotate-180" : ""}`} />
                </>
              )}
            </button>

            {/* Admin Sub Items */}
            {!collapsed && adminOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-[rgba(255,71,87,0.2)] pl-3">
                {adminSubItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 text-xs"
                      style={{
                        background: isActive ? "rgba(255,71,87,0.08)" : "transparent",
                        color: isActive ? "#FF4757" : "#8892A4",
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
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
