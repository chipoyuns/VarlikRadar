import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { CurrencyProvider } from "@/lib/currency-context";
import { useState } from "react";
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
