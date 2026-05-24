import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Phone } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { isAuthenticated } from '@/lib/admin-auth';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  if (await isAuthenticated()) redirect('/admin');
  const params = await searchParams;
  const hasError = params.error === '1';

  return (
    <main className="min-h-screen hero-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-10 justify-center">
          <div className="size-8 rounded-full bg-default flex items-center justify-center">
            <Phone className="size-3.5 text-black" />
          </div>
          <span className="font-semibold tracking-tight uppercase">CallBot</span>
        </Link>

        <div className="border border-border bg-card rounded-md p-8 space-y-6">
          <div>
            <div className="uppercase text-xs tracking-widest text-default mb-3">— Admin</div>
            <h1 className="display-section text-3xl">Back-office</h1>
            <p className="text-sm text-muted-foreground mt-2 font-light">
              Réservé à l&apos;opérateur. Mot de passe requis.
            </p>
          </div>

          <form action="/api/admin/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block uppercase text-xs tracking-widest text-muted-foreground"
              >
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="w-full h-11 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-default"
              />
            </div>
            {hasError && (
              <p className="text-xs text-red-400 uppercase tracking-widest">Mot de passe invalide</p>
            )}
            <button type="submit" className={buttonVariants({ size: 'lg' }) + ' w-full btn-elevated'}>
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
