import { NextResponse } from 'next/server';
import { enrichBusinessContext } from '@/lib/context-enricher';

interface EnrichRequestBody {
  businessName?: string;
  primary?: string;
  facebook?: string;
  instagram?: string;
  menu?: string;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY manquante côté serveur' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as EnrichRequestBody;
    const { businessName, primary, facebook, instagram, menu } = body;

    if (!primary && !businessName) {
      return NextResponse.json(
        { success: false, error: 'primary (nom ou URL) requis' },
        { status: 400 },
      );
    }

    const result = await enrichBusinessContext(businessName || '', {
      primary: primary || businessName || '',
      facebook,
      instagram,
      menu,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const maxDuration = 60;
