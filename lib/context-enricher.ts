import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { searchBusinessByName, type DataForSeoResult } from './dataforseo-client';
import { detectInputType } from './input-detector';

export interface EnrichmentSources {
  primary: string;
  facebook?: string;
  instagram?: string;
  menu?: string;
}

export interface SourceStatus {
  type: string;
  ok: boolean;
  details?: string;
  error?: string;
}

export interface EnrichmentResult {
  success: boolean;
  contextSummary: string;
  detectedType: string;
  sourcesStatus: SourceStatus[];
  dataforseo?: DataForSeoResult;
  cost?: { dataforseo: number; anthropic: number };
}

async function scrapeViaJina(url: string, maxChars = 12000): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  return (await res.text()).slice(0, maxChars);
}

async function scrapeDirect(url: string, maxChars = 12000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Ottomatisation Enricher)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, nav, footer, header').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

export async function enrichBusinessContext(
  businessName: string,
  sources: EnrichmentSources,
): Promise<EnrichmentResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return {
      success: false,
      contextSummary: '',
      detectedType: 'unknown',
      sourcesStatus: [],
    };
  }

  const result: EnrichmentResult = {
    success: false,
    contextSummary: '',
    detectedType: 'unknown',
    sourcesStatus: [],
  };

  const detected = detectInputType(sources.primary);
  result.detectedType = detected.type;

  const scraped: Record<string, string> = {};
  let dataforseoData: DataForSeoResult | undefined;

  // 1. Nom ou URL Google Maps → DataForSEO GMB lookup
  if (detected.type === 'business_name' || detected.type === 'google_maps') {
    const searchTerm = detected.extractedName || businessName || detected.value;
    if (searchTerm) {
      dataforseoData = await searchBusinessByName(searchTerm);
      if (dataforseoData.found && dataforseoData.data) {
        const d = dataforseoData.data;
        scraped.dataforseo_gmb = JSON.stringify(
          {
            nom: d.title,
            categorie: d.category,
            adresse: d.address,
            telephone: d.phone,
            site_web: d.url,
            horaires: d.work_hours,
            note: d.rating,
            description: d.description,
            attributs: d.attributes,
            liens: d.local_business_links,
          },
          null,
          2,
        );
        result.sourcesStatus.push({
          type: 'DataForSEO (Google My Business)',
          ok: true,
          details: d.title || 'Fiche trouvée',
        });

        // 2. Si la fiche GMB contient un site web, on tente de le scraper aussi
        if (d.url) {
          try {
            scraped.website_from_gmb = await scrapeDirect(d.url);
            result.sourcesStatus.push({ type: 'Site web (depuis GMB)', ok: true });
          } catch {
            try {
              scraped.website_from_gmb = await scrapeViaJina(d.url);
              result.sourcesStatus.push({ type: 'Site web (via Jina)', ok: true });
            } catch {
              result.sourcesStatus.push({
                type: 'Site web',
                ok: false,
                error: 'Inaccessible',
              });
            }
          }
        }

        // 2bis. Scraper le menu_url GMB si disponible
        if (d.menu_url) {
          const menuUrl = d.menu_url;
          try {
            let menuContent = '';
            try {
              menuContent = await scrapeDirect(menuUrl, 15000);
            } catch {
              menuContent = '';
            }
            if (!menuContent || menuContent.length < 200) {
              menuContent = await scrapeViaJina(menuUrl, 15000);
            }
            if (menuContent) {
              scraped.menu_from_gmb = menuContent.slice(0, 15000);
              result.sourcesStatus.push({
                type: 'menu',
                ok: true,
                details: `Menu récupéré depuis ${new URL(menuUrl).hostname}`,
              });
            }
          } catch (e) {
            result.sourcesStatus.push({
              type: 'menu',
              ok: false,
              error: `Menu non accessible : ${(e as Error).message}`,
            });
          }
        }
      } else {
        result.sourcesStatus.push({
          type: 'DataForSEO',
          ok: false,
          error: dataforseoData.error || 'Non trouvé',
        });
      }
    }
  }

  // 3. URL directe (site web ou annuaire) → scrape
  const directScrapeTypes = [
    'website',
    'pages_jaunes',
    'tripadvisor',
    'thefork',
    'yelp',
    'directory_other',
  ];
  if (directScrapeTypes.includes(detected.type)) {
    try {
      let content = '';
      try {
        content = await scrapeDirect(detected.value);
      } catch {
        content = await scrapeViaJina(detected.value);
      }
      scraped.primary_url = content;
      result.sourcesStatus.push({
        type: `URL ${detected.type}`,
        ok: true,
        details: `${content.length} car.`,
      });
    } catch (e) {
      result.sourcesStatus.push({
        type: `URL ${detected.type}`,
        ok: false,
        error: e instanceof Error ? e.message : 'Inaccessible',
      });
    }
  }

  // 4. Réseaux sociaux (optionnels)
  if (sources.facebook) {
    try {
      scraped.facebook = await scrapeViaJina(sources.facebook, 5000);
      result.sourcesStatus.push({ type: 'Facebook', ok: true });
    } catch {
      result.sourcesStatus.push({
        type: 'Facebook',
        ok: false,
        error: 'Privé ou bloqué',
      });
    }
  }
  if (sources.instagram) {
    try {
      scraped.instagram = await scrapeViaJina(sources.instagram, 5000);
      result.sourcesStatus.push({ type: 'Instagram', ok: true });
    } catch {
      result.sourcesStatus.push({
        type: 'Instagram',
        ok: false,
        error: 'Privé ou bloqué',
      });
    }
  }

  // Menu collé manuellement par l'utilisateur — source de vérité absolue
  if (sources.menu && sources.menu.trim().length > 0) {
    scraped.menu_manual = sources.menu.trim().slice(0, 15000);
    result.sourcesStatus.push({
      type: 'Menu (collé manuellement)',
      ok: true,
      details: `${scraped.menu_manual.length} car.`,
    });
  }

  // Rien récupéré → sortie propre
  if (Object.keys(scraped).length === 0) {
    result.dataforseo = dataforseoData;
    return result;
  }

  // 5. Synthèse Claude Sonnet
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
          content: `Tu es un assistant qui synthétise des informations business pour alimenter un CallBot vocal IA français.

NOM DE L'ÉTABLISSEMENT : ${businessName || detected.extractedName || 'non précisé'}

SOURCES BRUTES COLLECTÉES :
${sourcesBlock}

Rédige une section "CONTEXTE BUSINESS RÉEL" en prose française naturelle (pas de bullets, pas de listes, pas de markdown), qui synthétise TOUT ce que le CallBot doit savoir pour être crédible au téléphone :
- Nature exacte de l'activité et catégorie
- Adresse complète et moyens d'accès
- Horaires d'ouverture précis avec jours de fermeture
- Téléphone, email si disponibles
- Plats, menus et prix précis (TRÈS IMPORTANT si la source menu_from_gmb existe : liste explicitement les principaux plats avec leurs prix et noms, allergènes signalés, formules midi/soir, spécialités)
- Services et prestations annexes (livraison, réservation en ligne, événements privés)
- Équipe, chef, gérant si mentionnés
- Événements spéciaux en cours
- Avis clients (score, points forts cités)
- Attributs particuliers (terrasse, parking, wifi, accès PMR...)

Si une source menu_manual ou menu_from_gmb est présente, tu DOIS inclure dans ta synthèse les plats-phares avec leurs prix, au moins 5 à 10 plats représentatifs (ou TOUS si le menu en contient moins). Le CallBot doit pouvoir répondre naturellement à "qu'est-ce que vous avez comme plat aujourd'hui" ou "c'est combien la salade machin".

PRIORITÉ DES SOURCES sur le menu :
1. menu_manual (collé par le restaurateur) = source de vérité ABSOLUE — recopie les plats et prix tels quels, sans paraphraser ni omettre
2. menu_from_gmb (scrapé) = à utiliser seulement si menu_manual est absent
3. autres sources (avis, site web) = pour le contexte général uniquement, jamais pour inventer des plats ou des prix

N'invente JAMAIS d'information non présente dans les sources. Si une info manque, ne l'évoque pas.
Écris de façon fluide et factuelle, max 450 mots. Commence directement par la synthèse, sans préambule.`,
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

  result.dataforseo = dataforseoData;
  result.cost = {
    dataforseo: dataforseoData?.rawCost || 0,
    anthropic: 0,
  };
  return result;
}
