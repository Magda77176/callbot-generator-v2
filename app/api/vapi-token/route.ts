import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.VAPI_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { publicKey: null, error: 'VAPI_PUBLIC_KEY non configurée côté serveur' },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey });
}
