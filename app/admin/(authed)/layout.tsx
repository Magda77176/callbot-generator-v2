import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Phone, Users, PhoneCall, LayoutDashboard } from 'lucide-react';
import { isAuthenticated } from '@/lib/admin-auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // /admin/login is its own route — this layout only wraps the authed area.
  // We still need to allow the login page to render unauthed; that's why
  // login is a sibling, not a child.
  return <AuthShell>{children}</AuthShell>;
}

async function AuthShell({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect('/admin/login');

  return (
    <div className="min-h-screen hero-bg">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-default flex items-center justify-center">
              <Phone className="size-3.5 text-black" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold tracking-tight uppercase text-sm">CallBot</span>
              <span className="text-[10px] uppercase tracking-widest text-default">Admin</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 uppercase text-xs tracking-widest">
            <NavLink href="/admin" icon={LayoutDashboard}>
              Tableau de bord
            </NavLink>
            <NavLink href="/admin/assistants" icon={Users}>
              Assistants
            </NavLink>
            <NavLink href="/admin/calls" icon={PhoneCall}>
              Appels
            </NavLink>
          </nav>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-default inline-flex items-center gap-1 transition-colors px-3 py-2"
            >
              <LogOut className="size-3.5" />
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-default inline-flex items-center gap-2 transition-colors px-3 py-2"
    >
      <Icon className="size-3.5" />
      {children}
    </Link>
  );
}
