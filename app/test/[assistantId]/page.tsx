import Link from 'next/link';
import { VoiceTester } from '@/components/voice-tester';

interface TestPageProps {
  params: Promise<{ assistantId: string }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { assistantId } = await params;
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <Link href="/builder" className="text-sm text-muted-foreground hover:underline">
          ← Retour au builder
        </Link>
        <h1 className="text-3xl font-bold mt-2">Test vocal</h1>
        <p className="text-muted-foreground">Testez votre bot en conditions réelles.</p>
      </header>
      <VoiceTester assistantId={assistantId} />
    </main>
  );
}
