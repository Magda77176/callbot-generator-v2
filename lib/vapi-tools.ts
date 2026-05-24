// Vapi tool spec definitions and creation helpers. Shared between the
// initial deploy flow (/api/deploy-vapi) and the resync flow
// (/api/admin/sync-prompt) so both endpoints produce identical tool
// configurations from the same source of truth.

import type { BusinessInfo, Sector } from '@/lib/callbot-configs';

// Common French regional proper nouns that Deepgram's baseline FR model
// frequently mis-transcribes. Boosting them via transcriber.keywords:
// - "Sainte-Luce" stays as "Sainte-Luce" instead of becoming "Saint-Russe"
// - "Schoelcher" doesn't get garbled
const MARTINIQUE_TOWNS = [
  'Schoelcher', 'Sainte-Luce', 'Sainte-Anne', 'Le Diamant', 'Fort-de-France',
  'Le Marin', 'Case-Pilote', 'Le Robert', 'Le Morne-Rouge', 'Saint-Pierre',
  'Terreville', 'Ravine Vilaine', 'Trinité', 'Le Lamentin', 'Ducos',
  'Rivière-Salée',
];

// Vapi rejects keywords containing spaces — they must each be a single token.
// So we split multi-word phrases ("Le Diamant", "Ravine Vilaine", agency
// names like "Amelie immo") into individual words and filter out French
// stopwords + ultra-short words that would over-boost generic conversation.
const FR_STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'l', 'd',
  'un', 'une', 'au', 'aux', 'et', 'ou',
]);

function emitTokens(phrase: string, boost: number, out: string[]): void {
  // Split on whitespace AND hyphens — Vapi's validator rejects multi-word
  // tokens, and even hyphenated compounds occasionally fail validation.
  // Then strip diacritics so "Trinité" → "Trinite", "Rivière" → "Riviere",
  // matching what Deepgram's FR model emits in its ASCII-normalised form.
  for (const raw of phrase.trim().split(/[\s\-]+/)) {
    if (!raw) continue;
    const word = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (word.length < 3) continue;
    if (FR_STOPWORDS.has(word.toLowerCase())) continue;
    // Drop any remaining non-alphanumeric chars (apostrophes, etc.) just in case
    const clean = word.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length < 3) continue;
    out.push(`${clean}:${boost}`);
  }
}

export function buildTranscriberKeywords(
  sector: Sector,
  businessInfo: BusinessInfo,
): string[] {
  const raw: string[] = [];
  if (businessInfo.name?.trim()) {
    emitTokens(businessInfo.name.trim(), 3, raw);
  }
  if (sector === 'immobilier') {
    for (const town of MARTINIQUE_TOWNS) emitTokens(town, 2, raw);
  }
  // Dedupe — the same token can come from multiple phrases (e.g. "Sainte"
  // from both "Sainte-Luce" and "Sainte-Anne"). Vapi may reject duplicates.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of raw) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Deepgram transcriber config. nova-2-phonecall = trained on 8kHz telephony
 * audio, the right tier for an outbound/inbound voice agent. numerals=true
 * forces digit format ("39" not "trente-neuf") so phone-number parsing is
 * unambiguous. endpointing=400 leaves enough silence between dictated digits
 * to keep them as one utterance.
 */
export function buildTranscriberConfig(sector: Sector, businessInfo: BusinessInfo) {
  return {
    provider: 'deepgram' as const,
    model: 'nova-2-phonecall',
    language: 'fr',
    numerals: true,
    smartFormat: true,
    endpointing: 400,
    keywords: buildTranscriberKeywords(sector, businessInfo),
  };
}

export interface VapiToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object;
  };
  server: { url: string; secret: string | undefined };
}

export function reservationToolSpec(webhookUrl: string): VapiToolSpec {
  return {
    type: 'function',
    function: {
      name: 'record_reservation',
      description:
        "Enregistre une réservation confirmée par le client. À appeler UNIQUEMENT après que tous les champs ont été reconfirmés à voix haute. C'est cet appel qui sauvegarde la réservation côté restaurateur — tant qu'il n'a pas eu lieu, la réservation n'existe pas.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date de la réservation au format ISO AAAA-MM-JJ (ex. 2026-05-25)',
          },
          time: {
            type: 'string',
            description:
              "Heure de la réservation au format 24h HH:MM (ex. 19:30 pour sept heures et demie du soir)",
          },
          partySize: {
            type: 'integer',
            description: 'Nombre de personnes (entier ≥ 0). 0 pour une annulation.',
            minimum: 0,
          },
          customerName: {
            type: 'string',
            description: 'Nom du client tel que reconfirmé à voix haute',
          },
          customerPhone: {
            type: 'string',
            description: 'Numéro français à 10 chiffres formaté "06 12 34 56 78"',
          },
          dietaryNotes: {
            type: 'string',
            description: 'Allergies, régimes spéciaux mentionnés. Chaîne vide si rien.',
          },
          specialRequests: {
            type: 'string',
            description:
              'Demandes particulières (anniversaire, table fenêtre, modif, annulation, liste d\'attente). Chaîne vide si rien.',
          },
        },
        required: ['date', 'time', 'partySize', 'customerName', 'customerPhone'],
      },
    },
    server: { url: webhookUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

export function leadToolSpec(webhookUrl: string): VapiToolSpec {
  return {
    type: 'function',
    function: {
      name: 'record_lead',
      description:
        "Enregistre un lead immobilier qualifié. À appeler UNIQUEMENT après collecte des infos qualifiantes et reconfirmation orale du nom et du téléphone.",
      parameters: {
        type: 'object',
        properties: {
          leadType: {
            type: 'string',
            enum: ['buyer', 'renter', 'seller', 'estimation', 'other'],
            description:
              "Catégorie : buyer=acheteur, renter=locataire, seller=vendeur, estimation=demande d'estimation, other=autre",
          },
          customerName: {
            type: 'string',
            description: 'Nom complet du contact tel que reconfirmé à voix haute',
          },
          customerPhone: {
            type: 'string',
            description: 'Numéro français à 10 chiffres formaté "06 12 34 56 78"',
          },
          propertyType: { type: 'string', description: 'Type de bien. Vide si non pertinent.' },
          zones: {
            type: 'string',
            description:
              'Zones recherchées (acheteur/locataire) OU adresse précise du bien (vendeur/estimation)',
          },
          budget: { type: 'string', description: "Budget en clair, ex. \"300 à 400 000 euros\"" },
          rooms: { type: 'integer', description: 'Nombre de pièces. 0 si non précisé.', minimum: 0 },
          timing: { type: 'string', description: 'Timing du projet' },
          mustHaves: { type: 'string', description: 'Critères importants en clair texte' },
          notes: { type: 'string', description: 'Autres infos pertinentes' },
        },
        required: ['leadType', 'customerName', 'customerPhone'],
      },
    },
    server: { url: webhookUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

export function checkCalendarToolSpec(toolsCalendarUrl: string): VapiToolSpec {
  return {
    type: 'function',
    function: {
      name: 'check_calendar_availability',
      description:
        "Vérifie les créneaux disponibles dans le Google Calendar du client pour une plage donnée. À utiliser AVANT de proposer un créneau de visite ou de rendez-vous. Renvoie les slots libres.",
      parameters: {
        type: 'object',
        properties: {
          time_min: {
            type: 'string',
            description:
              'Début de la plage à scanner, ISO 8601 avec timezone (ex. "2026-05-26T09:00:00+02:00")',
          },
          time_max: {
            type: 'string',
            description: 'Fin de la plage à scanner, ISO 8601 avec timezone',
          },
          time_zone: {
            type: 'string',
            description: 'Fuseau horaire IANA. Défaut: "Europe/Paris".',
          },
        },
        required: ['time_min', 'time_max'],
      },
    },
    server: { url: toolsCalendarUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

export function bookCalendarToolSpec(toolsCalendarUrl: string): VapiToolSpec {
  return {
    type: 'function',
    function: {
      name: 'book_calendar_event',
      description:
        "Crée un événement dans le Google Calendar du client. À appeler après confirmation orale du créneau ET récap des coordonnées du client.",
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description:
              'Titre, ex. "Visite [type+ville+prix] — [nom] [téléphone]" ou "Estimation [adresse] — [nom] [téléphone]"',
          },
          description: { type: 'string', description: 'Notes additionnelles. Vide si rien.' },
          start_datetime: {
            type: 'string',
            description: 'Début ISO 8601 avec timezone (ex. "2026-05-26T11:00:00+02:00")',
          },
          end_datetime: {
            type: 'string',
            description: 'Fin ISO 8601 avec timezone. 30-45 min pour une visite.',
          },
          time_zone: { type: 'string', description: 'Fuseau horaire IANA. Défaut: "Europe/Paris".' },
        },
        required: ['summary', 'start_datetime', 'end_datetime'],
      },
    },
    server: { url: toolsCalendarUrl, secret: process.env.VAPI_WEBHOOK_SECRET?.trim() },
  };
}

/**
 * Build the public URL for /api/tools/calendar from APP_PUBLIC_URL when set,
 * otherwise derive it from the origin of VAPI_WEBHOOK_URL so we don't need a
 * second env var.
 */
export function buildToolsCalendarUrl(): string {
  const explicit = process.env.APP_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '') + '/api/tools/calendar';
  const webhook = process.env.VAPI_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      return new URL(webhook).origin + '/api/tools/calendar';
    } catch {}
  }
  throw new Error(
    'Cannot build tools/calendar URL: set APP_PUBLIC_URL or fix VAPI_WEBHOOK_URL',
  );
}

export function buildToolsForSector(sector: Sector, webhookUrl: string): VapiToolSpec[] {
  switch (sector) {
    case 'restaurant':
      return [reservationToolSpec(webhookUrl)];
    case 'immobilier':
      return [
        leadToolSpec(webhookUrl),
        checkCalendarToolSpec(buildToolsCalendarUrl()),
        bookCalendarToolSpec(buildToolsCalendarUrl()),
      ];
    default:
      return [];
  }
}

/**
 * Vapi requires tools to be created as standalone resources first (via POST
 * /tool), then referenced from an assistant by ID (model.toolIds). Inline
 * model.tools is not supported.
 */
export async function createVapiTool(toolSpec: VapiToolSpec, apiKey: string): Promise<string> {
  const res = await fetch('https://api.vapi.ai/tool', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolSpec),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vapi tool create failed: ${res.status} - ${errorText}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}
