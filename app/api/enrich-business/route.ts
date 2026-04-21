import { NextResponse } from 'next/server';
import { enrichBusinessContext, type EnrichmentSources } from '@/lib/context-enricher';

interface EnrichRequestBody {
  businessName?: string;
  sources?: EnrichmentSources;
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
    const { businessName, sources } = body;

    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'businessName requis' },
        { status: 400 },
      );
    }

    const result = await enrichBusinessContext(businessName, sources || {});
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const maxDuration = 30;
