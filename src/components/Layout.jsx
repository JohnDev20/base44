import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home as HomeIcon, Settings, ShoppingBag, History as HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Listas", icon: HomeIcon },
  { to: "/history", label: "Histórico", icon: HistoryIcon },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const isListDetail = location.pathname.startsWith("/list/");

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground leading-tight">CompraFácil</h1>
              <p className="text-[11px] text-muted-foreground">Suas listas organizadas</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
            <p className="text-xs font-medium opacity-90">Dica 💡</p>
            <p className="text-xs mt-1 opacity-80 leading-relaxed">
              Marque os itens conforme coloca no carrinho para acompanhar o progresso.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className={cn("flex-1 min-w-0 pb-20 md:pb-0", !isListDetail && "max-w-5xl mx-auto w-full")}>
        <Outlet />
      </main>
    </div>
  );
}