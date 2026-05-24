// Composio v3 server-side wrapper. Composio handles OAuth flows for 250+
// providers (Google Calendar, HubSpot, Brevo, Pipedrive, ...) so we don't have
// to create our own Google Cloud Console app, go through verification, etc.
//
// The actual SDK exposes a `Composio` class with sub-clients. We only need:
//   composio.connectedAccounts.initiate(...)   → start OAuth, returns redirect URL
//   composio.connectedAccounts.get(id)         → check connection status
//   composio.tools.execute(...)                → execute an action like GOOGLECALENDAR_FIND_FREE_SLOTS
//
// To use this you need TWO env vars:
//   COMPOSIO_API_KEY                         (from Composio dashboard → API Keys)
//   COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID  (created once: Composio dashboard → Auth Configs → Google Calendar → Use Composio Managed Auth)
//
// The auth config = your one-time setup. Composio Managed Auth means Composio
// uses ITS google OAuth app (already verified by Google), so we skip the 6-8
// week Google verification process entirely. The client's OAuth consent screen
// says "Composio wants to access your calendar" rather than "Your App".

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
 * Start an OAuth flow for a given tenant + provider. Returns a redirect URL
 * the user must visit to authorize.
 *
 * @param userId — your tenant identifier. We use the Vapi assistantId since
 *   1 assistant = 1 tenant at this stage. Composio uses this to associate
 *   future actions with the right connection.
 * @param authConfigId — the Composio auth config ID for the provider. Created
 *   once in the Composio dashboard for each provider you support.
 */
export async function initiateConnection(
  userId: string,
  authConfigId: string,
): Promise<InitiateResult> {
  const composio = getComposio();
  // Composio v3 API: connectedAccounts.initiate
  const req = await composio.connectedAccounts.initiate(userId, authConfigId);
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
 * @param action — Composio action slug, e.g. "GOOGLECALENDAR_FIND_FREE_SLOTS"
 * @param input — arguments matching the action's input schema
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

/**
 * Provider registry. Each provider needs an env var with its Composio auth
 * config ID. We centralise lookups here so adding a new provider is one entry.
 */
export interface ProviderConfig {
  slug: string;
  label: string;
  authConfigEnvVar: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  google_calendar: {
    slug: 'google_calendar',
    label: 'Google Calendar',
    authConfigEnvVar: 'COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID',
  },
};

export function getAuthConfigId(providerSlug: string): string {
  const cfg = PROVIDERS[providerSlug];
  if (!cfg) throw new Error(`Unknown provider: ${providerSlug}`);
  const id = process.env[cfg.authConfigEnvVar]?.trim();
  if (!id) {
    throw new Error(
      `${cfg.authConfigEnvVar} not configured. Create an auth config in the Composio dashboard for ${cfg.label} and put its ID in env.`,
    );
  }
  return id;
}
