import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

export interface EnrichmentSources {
  website?: string;
  gmb_url?: string;
  facebook?: string;
  instagram?: string;
}

export interface SourceStatus {
  fetched: boolean;
  error?: string;
  chars?: number;
}

export interface EnrichmentResult {
  success: boolean;
  contextSummary: string;
  sources: {
    website?: SourceStatus;
    gmb?: SourceStatus;
    facebook?: SourceStatus;
    instagram?: SourceStatus;
  };
}

async function scrapeUrl(url: string, maxChars = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Ottomatisation CallBot Enricher)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, nav, footer, header').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.slice(0, maxChars);
}

async function scrapeViaJina(url: string, maxChars = 15000): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
  const text = await res.text();
  return text.slice(0, maxChars);
}

export async function enrichBusinessContext(
  businessName: string,
  sources: EnrichmentSources,
): Promise<EnrichmentResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { success: false, contextSummary: '', sources: {} };
  }

  const result: EnrichmentResult = {
    success: false,
    contextSummary: '',
    sources: {},
  };

  const scraped: Record<string, string> = {};

  if (sources.website) {
    try {
      let content = '';
      try {
        content = await scrapeUrl(sources.website);
      } catch {
        content = await scrapeViaJina(sources.website);
      }
      scraped.website = content;
      result.sources.website = { fetched: true, chars: content.length };
    } catch (e) {
      result.sources.website = {
        fetched: false,
        error: e instanceof Error ? e.message : 'Unknown',
        chars: 0,
      };
    }
  }

  if (sources.gmb_url) {
    try {
      const content = await scrapeViaJina(sources.gmb_url, 8000);
      scraped.gmb = content;
      result.sources.gmb = { fetched: true, chars: content.length };
    } catch (e) {
      result.sources.gmb = {
        fetched: false,
        error: e instanceof Error ? e.message : 'Unknown',
        chars: 0,
      };
    }
  }

  if (sources.facebook) {
    try {
      scraped.facebook = await scrapeViaJina(sources.facebook, 5000);
      result.sources.facebook = { fetched: true };
    } catch {
      result.sources.facebook = { fetched: false, error: 'Page privée ou bloquée' };
    }
  }

  if (sources.instagram) {
    try {
      scraped.instagram = await scrapeViaJina(sources.instagram, 5000);
      result.sources.instagram = { fetched: true };
    } catch {
      result.sources.instagram = { fetched: false, error: 'Compte privé ou bloqué' };
    }
  }

  if (Object.keys(scraped).length === 0) {
    return result;
  }

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const sourcesBlock = Object.entries(scraped)
      .map(([k, v]) => `## SOURCE: ${k.toUpperCase()}\n${v}`)
      .join('\n\n---\n\n');

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Tu es un assistant qui synthétise des informations business pour alimenter un CallBot vocal IA.

NOM DE L'ÉTABLISSEMENT : ${businessName}

SOURCES BRUTES SCRAPÉES :
${sourcesBlock}

Rédige une section "CONTEXTE BUSINESS RÉEL" en prose française naturelle (pas de bullets, pas de listes, pas de markdown), qui synthétise TOUT ce que le CallBot doit savoir pour être crédible au téléphone :
- Nature exacte de l'activité
- Horaires d'ouverture avec jours de fermeture
- Services, plats, produits, prestations proposés avec détails
- Équipe, chef, gérant si mentionnés
- Événements spéciaux en cours (menu saisonnier, promo, nouveauté)
- Adresse, moyens d'accès, parking si mentionnés
- Points forts cités par les clients

N'invente JAMAIS d'information non présente dans les sources. Si une info manque, n'en parle pas.
Écris de façon fluide et factuelle, max 400 mots. Commence directement par la synthèse, sans préambule.`,
        },
      ],
    });

    const content = msg.content[0];
    if (content.type === 'text') {
      result.contextSummary = content.text;
      result.success = true;
    }
  } catch (e) {
    console.error('Anthropic synthesis failed:', e);
  }

  return result;
}
