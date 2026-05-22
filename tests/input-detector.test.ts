import { describe, expect, it } from 'vitest';
import { detectInputType } from '@/lib/input-detector';

describe('detectInputType', () => {
  it('returns empty business_name for blank input', () => {
    expect(detectInputType('')).toEqual({ type: 'business_name', value: '' });
    expect(detectInputType('   ')).toEqual({ type: 'business_name', value: '' });
  });

  it('detects Google Maps URLs', () => {
    expect(detectInputType('https://www.google.com/maps/place/Le+Bistrot/').type).toBe('google_maps');
    expect(detectInputType('https://maps.google.com/?q=Le+Bistrot').type).toBe('google_maps');
  });

  it('extracts business name from Google search URLs', () => {
    const r = detectInputType('https://www.google.com/search?q=Le+Bistrot+Paris');
    expect(r.type).toBe('business_name');
    expect(r.extractedName).toBe('Le Bistrot Paris');
  });

  it('detects Pages Jaunes', () => {
    expect(detectInputType('https://www.pagesjaunes.fr/pros/12345').type).toBe('pages_jaunes');
  });

  it('detects TripAdvisor', () => {
    expect(detectInputType('https://www.tripadvisor.com/Restaurant_Review-1234').type).toBe('tripadvisor');
    expect(detectInputType('https://www.tripadvisor.fr/whatever').type).toBe('tripadvisor');
  });

  it('detects TheFork and LaFourchette as thefork', () => {
    expect(detectInputType('https://www.thefork.fr/restaurant/abc').type).toBe('thefork');
    expect(detectInputType('https://www.lafourchette.com/restaurant/xyz').type).toBe('thefork');
  });

  it('detects Yelp', () => {
    expect(detectInputType('https://www.yelp.fr/biz/foo').type).toBe('yelp');
  });

  it('detects Facebook (facebook.com and fb.com)', () => {
    expect(detectInputType('https://www.facebook.com/restoX').type).toBe('facebook');
    expect(detectInputType('https://fb.com/restoX').type).toBe('facebook');
  });

  it('detects Instagram', () => {
    expect(detectInputType('https://www.instagram.com/resto').type).toBe('instagram');
  });

  it('falls back to website for unknown hosts', () => {
    expect(detectInputType('https://example.com').type).toBe('website');
    expect(detectInputType('https://monresto.fr/menu').type).toBe('website');
  });

  it('upgrades bare domains to https website', () => {
    const r = detectInputType('monresto.fr');
    expect(r.type).toBe('website');
    expect(r.value).toBe('https://monresto.fr');
  });

  it('upgrades bare domains with path to https website', () => {
    const r = detectInputType('monresto.fr/menu');
    expect(r.type).toBe('website');
    expect(r.value).toBe('https://monresto.fr/menu');
  });

  it('treats plain text as business_name', () => {
    expect(detectInputType('Le Bistrot Parisien').type).toBe('business_name');
    expect(detectInputType('Le Bistrot Parisien').value).toBe('Le Bistrot Parisien');
  });

  it('trims surrounding whitespace', () => {
    expect(detectInputType('  Le Bistrot  ').value).toBe('Le Bistrot');
  });

  it('handles malformed URLs as business_name', () => {
    // URL constructor throws on these → fallback to business_name
    expect(detectInputType('http://').type).toBe('business_name');
  });

  it('is case-insensitive on host matching', () => {
    expect(detectInputType('https://WWW.PAGESJAUNES.FR/pros/123').type).toBe('pages_jaunes');
    expect(detectInputType('https://Facebook.com/x').type).toBe('facebook');
  });
});
