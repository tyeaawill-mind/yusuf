import { useEffect, useState } from "react";
import { Outlet, createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  CheckSquare,
  Target,
  BarChart3,
  LogOut,
  User,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { label: "Chat", icon: MessageSquare, path: "/app" },
  { label: "Todos", icon: CheckSquare, path: "/app/todos" },
  { label: "Goals", icon: Target, path: "/app/goals" },
  { label: "Insights", icon: BarChart3, path: "/app/insights" },
];

function AuthenticatedLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    router.invalidate();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground font-display">
                Aria
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Your assistant</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                activeProps={{
                  className:
                    "bg-sidebar-primary text-sidebar-primary-foreground",
                }}
                inactiveProps={{
                  className:
                    "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <Link
              to="/app/profile"
              inactiveProps={{
                className:
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm font-display">Aria</span>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
