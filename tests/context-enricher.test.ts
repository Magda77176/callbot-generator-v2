import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Anthropic SDK before importing the module under test.
const anthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: anthropicCreate };
  },
}));

// Mock dataforseo-client so we don't hit the network.
const searchBusinessByName = vi.fn();
vi.mock('@/lib/dataforseo-client', () => ({
  searchBusinessByName: (...args: unknown[]) => searchBusinessByName(...args),
}));

import { enrichBusinessContext } from '@/lib/context-enricher';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  anthropicCreate.mockReset();
  searchBusinessByName.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('enrichBusinessContext', () => {
  it('returns success=false when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await enrichBusinessContext('Le Bistrot', { primary: 'Le Bistrot' });
    expect(result.success).toBe(false);
    expect(result.contextSummary).toBe('');
  });

  it('falls back cleanly when DataForSEO finds nothing and nothing else can be scraped', async () => {
    searchBusinessByName.mockResolvedValue({ found: false, error: 'Not found' });
    const result = await enrichBusinessContext('Inconnu', { primary: 'Inconnu' });
    expect(result.success).toBe(false);
    expect(result.detectedType).toBe('business_name');
    expect(result.sourcesStatus.some((s) => s.type === 'DataForSEO' && !s.ok)).toBe(true);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('returns Claude synthesis when GMB lookup succeeds (no website to scrape)', async () => {
    searchBusinessByName.mockResolvedValue({
      found: true,
      data: {
        title: 'Le Bistrot',
        category: 'Restaurant',
        address: '1 rue Test, Paris',
        phone: '0102030405',
        // No url → no website scrape attempt
        work_hours: { monday: '12-22' },
        rating: { value: 4.5 },
      },
      rawCost: 0.001,
    });
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Le Bistrot est un restaurant situé à Paris...' }],
    });

    const result = await enrichBusinessContext('Le Bistrot', { primary: 'Le Bistrot' });

    expect(result.success).toBe(true);
    expect(result.contextSummary).toContain('Le Bistrot');
    expect(result.detectedType).toBe('business_name');
    expect(anthropicCreate).toHaveBeenCalledOnce();
    const call = anthropicCreate.mock.calls[0]![0] as { model: string };
    expect(call.model).toBe('claude-sonnet-4-6');
  });

  it('includes a manual menu as the authoritative source', async () => {
    searchBusinessByName.mockResolvedValue({ found: false });
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Synthèse avec menu' }],
    });

    const result = await enrichBusinessContext('X', {
      primary: 'X',
      menu: 'Pizza Margherita 12€\nTiramisu 6€',
    });

    expect(result.success).toBe(true);
    expect(result.sourcesStatus.some((s) => s.type === 'Menu (collé manuellement)' && s.ok)).toBe(true);
    const prompt = (anthropicCreate.mock.calls[0]![0] as { messages: { content: string }[] }).messages[0]!.content;
    expect(prompt).toContain('Pizza Margherita 12€');
  });

  it('scrapes website URLs directly (with Jina fallback) for website inputs', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith('https://r.jina.ai/')) {
        return Promise.resolve(new Response('Jina-scraped content about the bistrot', { status: 200 }));
      }
      // Simulate direct fetch failure → triggers Jina fallback
      return Promise.resolve(new Response('', { status: 500 }));
    }) as typeof fetch;

    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Synthèse depuis le site' }],
    });

    const result = await enrichBusinessContext('', { primary: 'https://example.com' });
    expect(result.detectedType).toBe('website');
    expect(result.success).toBe(true);
    expect(result.sourcesStatus.some((s) => s.ok)).toBe(true);
  });

  it('gracefully handles Anthropic failure', async () => {
    searchBusinessByName.mockResolvedValue({
      found: true,
      data: { title: 'X', category: 'Resto' },
    });
    anthropicCreate.mockRejectedValue(new Error('Claude down'));

    const result = await enrichBusinessContext('X', { primary: 'X' });
    expect(result.success).toBe(false);
    expect(result.contextSummary).toBe('');
  });
});
