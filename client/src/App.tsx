import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

import Home from "./pages/home";
import Login from "./pages/login";
import About from "./pages/about";
import SearchPage from "./pages/search";
import CalculatorPage from "./pages/calculator";
import ManifestPage from "./pages/manifest";
import TariffPage from "./pages/tariff";
import NotFound from "./pages/not-found";

export const ThemeContext = createContext<{
  theme: "light" | "dark";
  toggleTheme: () => void;
  isDark: boolean;
}>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/about" component={About} />
      <Route path="/search" component={SearchPage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/manifest" component={ManifestPage} />
      <Route path="/tariff" component={TariffPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { theme, toggleTheme, isDark } = useTheme();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full overflow-hidden bg-background">
              <AppSidebar className="print:hidden" />

              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 shrink-0 sticky top-0 z-50 bg-background/80 backdrop-blur-md print:hidden">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="h-4 w-px bg-border/50" />
                  <span className="text-sm font-semibold text-primary">
                    حاسبة فرق الرسم الكمركي
                  </span>
                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-8 w-8 rounded-lg"
                    data-testid="button-theme-toggle"
                  >
                    {isDark ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-primary" />}
                  </Button>
                </header>

                <main className="flex-1 overflow-auto p-0 md:p-5">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
