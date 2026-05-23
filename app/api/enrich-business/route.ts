import { NextResponse } from 'next/server';
import { isSector } from '@/lib/callbot-configs';
import { enrichBusinessContext } from '@/lib/context-enricher';
import { checkLimit, clientIp, enrichLimiter, rateLimitHeaders } from '@/lib/rate-limit';

interface EnrichRequestBody {
  businessName?: string;
  primary?: string;
  facebook?: string;
  instagram?: string;
  menu?: string;
  sector?: string;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY manquante côté serveur' },
      { status: 503 },
    );
  }

  const decision = await checkLimit(enrichLimiter, clientIp(request));
  if (!decision.allowed) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Réessaie dans quelques minutes.' },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  try {
    const body = (await request.json()) as EnrichRequestBody;
    const { businessName, primary, facebook, instagram, menu, sector } = body;

    if (!primary && !businessName) {
      return NextResponse.json(
        { success: false, error: 'primary (nom ou URL) requis' },
        { status: 400 },
      );
    }

    const validatedSector = sector && isSector(sector) ? sector : undefined;

    const result = await enrichBusinessContext(
      businessName || '',
      {
        primary: primary || businessName || '',
        facebook,
        instagram,
        menu,
      },
      validatedSector,
    );
    return NextResponse.json(result, { headers: rateLimitHeaders(decision) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const maxDuration = 60;
