// Composio v3 server-side wrapper. Composio handles OAuth flows for 250+
// providers (Google Calendar, HubSpot, Brevo, Pipedrive, ...) so we don't have
// to create our own Google Cloud Console app, go through verification, etc.
//
// We use the high-level toolkits.authorize() shortcut, which picks the default
// auth config of the toolkit on the operator's Composio org. The only required
// env var is COMPOSIO_API_KEY — Composio Managed Auth handles the rest.
//
// SDK methods we touch:
//   composio.toolkits.authorize(userId, toolkitSlug)   → start OAuth, returns redirect URL
//   composio.connectedAccounts.get(id)                 → check connection status
//   composio.tools.execute(toolSlug, { userId, arguments }) → run an action
//
// Composio Managed Auth means Composio uses ITS Google OAuth app (already
// verified by Google), so we skip the 6-8 week Google verification and the
// "100 testers max" limit. The client's OAuth consent screen says "Composio
// wants to access your calendar".

import { Composio } from '@composio/core';

let _client: Composio | null = null;

export function getComposio(): Composio {
  if (_client) return _client;
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'COMPOSIO_API_KEY not configured — set it in env to enable per-client OAuth integrations.',
    );
  }
  _client = new Composio({ apiKey });
  return _client;
}

export interface InitiateResult {
  redirectUrl: string;
  connectionRequestId: string;
}

/**
 * Provider registry. Maps our internal provider slug (used in
 * assistant.metadata.connections.{slug}) to the Composio toolkit slug
 * (lowercased, no separators — Composio's convention).
 */
export interface ProviderConfig {
  /** Our internal slug, used as the key in assistant.metadata.connections */
  slug: string;
  /** User-facing label for buttons/banners */
  label: string;
  /** Composio toolkit slug (e.g. "googlecalendar"). Lowercase, no separator. */
  composioToolkit: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  google_calendar: {
    slug: 'google_calendar',
    label: 'Google Calendar',
    composioToolkit: 'googlecalendar',
  },
};

/**
 * Start an OAuth flow for a given tenant + provider. Returns a redirect URL
 * the user must visit to authorize.
 *
 * Implementation notes:
 * - The legacy `connectedAccounts.initiate(userId, authConfigId)` endpoint is
 *   deprecated by Composio for Composio-managed OAuth configs (returns 400 with
 *   message redirecting to /connected_accounts/link). We use `link()` instead.
 * - `toolkits.authorize` is a higher-level wrapper but it currently calls the
 *   deprecated endpoint internally → we go one level lower.
 * - We auto-discover the auth config ID by listing Composio-managed configs
 *   for the toolkit. This keeps the single-env-var setup (just COMPOSIO_API_KEY).
 *
 * @param userId — tenant identifier. We use the Vapi assistantId since
 *   1 assistant = 1 tenant at this stage. Composio uses this to associate
 *   future actions with the right connection.
 * @param providerSlug — our internal slug, e.g. "google_calendar"
 */
export async function initiateConnection(
  userId: string,
  providerSlug: string,
): Promise<InitiateResult> {
  const provider = PROVIDERS[providerSlug];
  if (!provider) throw new Error(`Unknown provider: ${providerSlug}`);
  const composio = getComposio();

  // Discover an enabled Composio-managed auth config for the toolkit. This
  // is created when you activate the toolkit in the Composio dashboard.
  const list = await composio.authConfigs.list({
    toolkit: provider.composioToolkit,
    isComposioManaged: true,
  });
  const enabled = (list.items ?? []).filter((c) => c.status === 'ENABLED');
  if (enabled.length === 0) {
    throw new Error(
      `Aucune auth config Composio-managed activée pour le toolkit "${provider.composioToolkit}". Dans le dashboard Composio → Toolkits → ${provider.label} → "Connect" / "Enable".`,
    );
  }
  const authConfigId = enabled[0].id;

  // Use .link() — the current Composio-managed OAuth endpoint
  // (`.initiate()` is deprecated for Composio-managed configs).
  const req = await composio.connectedAccounts.link(userId, authConfigId);
  return {
    redirectUrl: req.redirectUrl ?? '',
    connectionRequestId: req.id,
  };
}

/**
 * Look up a connection by ID. Used after OAuth callback to verify status
 * before stamping it on the Vapi assistant.
 */
export async function getConnection(connectionId: string) {
  const composio = getComposio();
  return composio.connectedAccounts.get(connectionId);
}

/**
 * Execute an action against a previously-connected provider. Used by the
 * custom tool webhook routes (Phase 2).
 *
 * @param userId — same tenant identifier passed to initiateConnection
 * @param action — Composio tool slug, e.g. "GOOGLECALENDAR_FIND_FREE_SLOTS"
 * @param input — arguments matching the tool's input schema
 */
export async function executeAction<TOut = unknown>(
  userId: string,
  action: string,
  input: Record<string, unknown>,
): Promise<TOut> {
  const composio = getComposio();
  const result = await composio.tools.execute(action, {
    userId,
    arguments: input,
  });
  return result as TOut;
}
