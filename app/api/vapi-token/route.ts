import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.VAPI_PUBLIC_KEY?.trim();
  // Optional: a specific assistant the marketing home can demo. The wizard
  // creates fresh assistants; for a public demo we'd point this at a stable
  // showcase bot (e.g. the Le Ti Taurus restaurant or an Agence Demo immo).
  const demoAssistantId = process.env.DEMO_ASSISTANT_ID?.trim() ?? null;

  if (!publicKey) {
    return NextResponse.json(
      { publicKey: null, demoAssistantId, error: 'VAPI_PUBLIC_KEY non configurée côté serveur' },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey, demoAssistantId });
}
