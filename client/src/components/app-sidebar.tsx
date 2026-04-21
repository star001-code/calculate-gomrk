import { useLocation } from "wouter";
import { useContext } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, Package, Info, LogIn, LogOut, Calculator, User, FileImage, Sun, Moon, Table } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeContext } from "@/App";
import logoImg from "@assets/IMG_2293_1770690757765.png";

const menuItems = [
  { title: "الرئيسية", url: "/", icon: Home },
  { title: "المنتجات", url: "/search", icon: Package },
  { title: "الحاسبة", url: "/calculator", icon: Calculator },
  { title: "قراءة المنفست", url: "/manifest", icon: FileImage },
  { title: "التعرفة الجمركية", url: "/tariff", icon: Table },
  { title: "حول النظام", url: "/about", icon: Info },
];

export function AppSidebar({ className }: { className?: string }) {
  const [location, navigate] = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useContext(ThemeContext);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side="right" collapsible="icon" className={cn(className)}>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-sm scale-110" />
            <img
              src={logoImg}
              alt="الكمارك العراقية"
              className="h-10 w-auto shrink-0 object-contain relative"
              data-testid="img-logo-sidebar"
            />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold truncate text-gradient-gold">الحاسبة الكمركية</span>
            <span className="text-[11px] text-muted-foreground truncate">فرق الرسم — العراق</span>
          </div>
        </div>
      </SidebarHeader>
      <div className="px-4 py-1 group-data-[collapsible=icon]:hidden">
        <div className="h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-wider text-muted-foreground/70">القائمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`link-${item.url === "/" ? "home" : item.url.slice(1)}`}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-wider text-muted-foreground/70">المظهر</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleTheme}
                  data-testid="button-theme-sidebar"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{isDark ? "الوضع الفاتح" : "الوضع الداكن"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="h-px bg-gradient-to-l from-transparent via-border to-transparent mb-3" />
        </div>
        {isLoggedIn ? (
          <div className="space-y-2.5 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-gold shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-username">
                  {user?.username}
                </p>
                <p className="text-[10px] text-muted-foreground">مسجل الدخول</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => logout.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="mr-2">خروج</span>
            </Button>
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/login"}
                data-testid="link-login"
              >
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  <span>تسجيل الدخول</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
