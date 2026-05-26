import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { CurrencyProvider } from "@/lib/currency-context";
import { useState, useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Budget from "@/pages/budget";
import Goals from "@/pages/hedefler";
import Debts from "@/pages/borclar";
import Simulator from "@/pages/simulator";
import AICoach from "@/pages/ai-koc";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

const ACCENT_COLORS: Record<string, string> = {
  teal:   "#00D4AA",
  blue:   "#4B9EFF",
  purple: "#A78BFA",
  gold:   "#FFB833",
  red:    "#FF4757",
};

function applyAppearanceGlobal() {
  try {
    const stored = localStorage.getItem("appearance_settings");
    if (!stored) return;
    const s = JSON.parse(stored);
    const root = document.documentElement;

    const accentHex = ACCENT_COLORS[s.accentColor] ?? "#00D4AA";
    root.style.setProperty("--accent-primary", accentHex);
    root.style.setProperty("--accent-bg", `${accentHex}15`);
    root.style.setProperty("--accent-border", `${accentHex}30`);

    const theme = s.theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : (s.theme ?? "dark");
    root.setAttribute("data-theme", theme);

    const fontSizeMap: Record<string, string> = { small: "13px", normal: "15px", large: "17px" };
    root.style.setProperty("--app-font-size", fontSizeMap[s.fontSize] ?? "15px");

    if (!s.animations) root.style.setProperty("--transition-speed", "0ms");
    else root.style.removeProperty("--transition-speed");
  } catch {}
}

applyAppearanceGlobal();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/islemler" component={Transactions} />
      <Route path="/butce" component={Budget} />
      <Route path="/hedefler" component={Goals} />
      <Route path="/borclar" component={Debts} />
      <Route path="/simulator" component={Simulator} />
      <Route path="/ai-koc" component={AICoach} />
      <Route path="/raporlar" component={Reports} />
      <Route path="/ayarlar" component={Settings} />
      <Route path="/settings/*" component={Settings} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/*" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyAppearanceGlobal();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearanceGlobal();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-[#080A0F] noise-overlay">
            <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <main
              className="transition-all duration-300 min-h-screen"
              style={{ marginLeft: collapsed ? "72px" : "200px" }}
            >
              <div className="p-6 relative z-10">
                <Router />
              </div>
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

export default App;
