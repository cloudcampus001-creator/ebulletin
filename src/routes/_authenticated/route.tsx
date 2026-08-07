import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [router.state.location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/classes", label: "Classes", icon: BookOpen },
    { to: "/students", label: "Students", icon: Users },
    { to: "/staff", label: "Staff", icon: UserCog },
    { to: "/bulletins", label: "Bulletins", icon: FileText },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold">Bulletin</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="rounded p-2 hover:bg-surface">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="md:grid md:grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside
          className={`${open ? "block" : "hidden"} md:block md:sticky md:top-0 md:h-screen md:border-r md:border-sidebar-border bg-sidebar text-sidebar-foreground`}
        >
          <div className="hidden h-16 items-center gap-2.5 px-6 md:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">Bulletin</span>
          </div>

          <nav className="flex flex-col gap-0.5 px-3 py-4">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to as never}
                className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-sidebar-border px-3 py-4">
            <div className="px-3 py-2 text-xs text-sidebar-foreground/60">
              <p className="truncate font-medium text-sidebar-foreground/90">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
