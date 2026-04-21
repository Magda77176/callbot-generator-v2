export type InputType =
  | 'website'
  | 'google_maps'
  | 'pages_jaunes'
  | 'tripadvisor'
  | 'thefork'
  | 'yelp'
  | 'facebook'
  | 'instagram'
  | 'directory_other'
  | 'business_name';

export interface DetectedInput {
  type: InputType;
  value: string;
  extractedName?: string;
}

export function detectInputType(raw: string): DetectedInput {
  const trimmed = raw.trim();

  if (!trimmed) return { type: 'business_name', value: '' };

  // URL avec schéma
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');

      if (
        host.includes('google.com/maps') ||
        host === 'maps.google.com' ||
        url.pathname.includes('/maps/')
      ) {
        return { type: 'google_maps', value: trimmed };
      }
      if (host.includes('google.com') && url.pathname.includes('/search')) {
        const q = url.searchParams.get('q') || '';
        return { type: 'business_name', value: q, extractedName: q };
      }
      if (host.includes('pagesjaunes.fr')) return { type: 'pages_jaunes', value: trimmed };
      if (host.includes('tripadvisor')) return { type: 'tripadvisor', value: trimmed };
      if (host.includes('thefork') || host.includes('lafourchette')) {
        return { type: 'thefork', value: trimmed };
      }
      if (host.includes('yelp')) return { type: 'yelp', value: trimmed };
      if (host.includes('facebook.com') || host.includes('fb.com')) {
        return { type: 'facebook', value: trimmed };
      }
      if (host.includes('instagram.com')) return { type: 'instagram', value: trimmed };

      return { type: 'website', value: trimmed };
    } catch {
      return { type: 'business_name', value: trimmed };
    }
  }

  // Domaine sans schéma (ex: "monresto.fr")
  if (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return { type: 'website', value: 'https://' + trimmed };
  }

  // Sinon c'est un nom
  return { type: 'business_name', value: trimmed };
}
