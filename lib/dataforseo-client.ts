interface DataForSeoBusinessInfo {
  title?: string;
  category?: string;
  address?: string;
  phone?: string;
  url?: string;
  work_hours?: unknown;
  rating?: { value: number; votes_count: number };
  main_image?: string;
  local_business_links?: unknown[];
  attributes?: Record<string, unknown>;
  description?: string;
  place_id?: string;
  cid?: string;
  latitude?: number;
  longitude?: number;
  menu_url?: string | null;
  book_online_url?: string | null;
  order_online_url?: string | null;
  additional_categories?: string[];
  price_level?: string | null;
  snippet?: string | null;
}

export interface DataForSeoResult {
  found: boolean;
  data?: DataForSeoBusinessInfo;
  error?: string;
  rawCost?: number;
}

interface DataForSeoTaskItem extends DataForSeoBusinessInfo {}

interface DataForSeoTask {
  status_code: number;
  status_message?: string;
  cost?: number;
  result?: Array<{ items?: DataForSeoTaskItem[] }>;
}

interface DataForSeoResponse {
  tasks?: DataForSeoTask[];
}

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error('DataForSEO credentials missing');
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function fetchWithRetry(
  url: string,
  init: () => RequestInit,
  retries = 1,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init());
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

export async function searchBusinessByName(
  keyword: string,
  locationCode = 2250,
  languageCode = 'fr',
): Promise<DataForSeoResult> {
  try {
    const res = await fetchWithRetry(
      'https://api.dataforseo.com/v3/business_data/google/my_business_info/live',
      () => ({
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            keyword,
            location_code: locationCode,
            language_code: languageCode,
          },
        ]),
        signal: AbortSignal.timeout(30000),
      }),
    );
    if (!res.ok) {
      return { found: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as DataForSeoResponse;
    const task = json?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      return { found: false, error: task?.status_message || 'No task' };
    }
    const items = task?.result?.[0]?.items;
    if (!items || items.length === 0) {
      return { found: false, error: 'No business found' };
    }
    const first = items[0];
    return {
      found: true,
      rawCost: task.cost,
      data: {
        title: first.title,
        category: first.category,
        address: first.address,
        phone: first.phone,
        url: first.url,
        work_hours: first.work_hours,
        rating: first.rating,
        main_image: first.main_image,
        local_business_links: first.local_business_links,
        attributes: first.attributes,
        description: first.description,
        place_id: first.place_id,
        cid: first.cid,
        latitude: first.latitude,
        longitude: first.longitude,
        menu_url: first.menu_url ?? null,
        book_online_url: first.book_online_url ?? null,
        order_online_url: first.order_online_url ?? null,
        additional_categories: first.additional_categories ?? [],
        price_level: first.price_level ?? null,
        snippet: first.snippet ?? null,
      },
    };
  } catch (e) {
    return { found: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}
