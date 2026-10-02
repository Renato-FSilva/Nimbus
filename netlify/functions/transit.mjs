const SOURCES = Object.freeze({
  metro: 'https://www.metro.sp.gov.br/wp-content/themes/metrosp/direto-metro.php?embed=1',
  artesp: 'https://ccm.artesp.sp.gov.br/metroferroviario/status-linhas/',
});

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60',
  'Netlify-CDN-Cache-Control': 'public, max-age=240, stale-while-revalidate=120',
  'Content-Type': 'application/json; charset=utf-8',
};
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

export const config = { path: '/api/transit', method: 'GET' };

export default async (request) => {
  const requestUrl = new URL(request.url);
  const forceRefresh = requestUrl.searchParams.has('refresh');
  const sourceName = requestUrl.searchParams.get('source');
  const sourceUrl = SOURCES[sourceName];
  if (!sourceUrl) {
    return Response.json({ error: 'Fonte de status desconhecida.' }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  try {
    const upstream = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      return Response.json({ error: `A fonte oficial respondeu HTTP ${upstream.status}.` }, { status: 502, headers: NO_CACHE_HEADERS });
    }

    const html = await upstream.text();
    if (!html || html.length < 100) {
      return Response.json({ error: 'A fonte oficial retornou conteúdo vazio.' }, { status: 502, headers: NO_CACHE_HEADERS });
    }

    return Response.json({ html, fetchedAt: new Date().toISOString() }, { headers: forceRefresh ? NO_CACHE_HEADERS : CACHE_HEADERS });
  } catch (error) {
    return Response.json({ error: error.message || 'Falha ao consultar a fonte oficial.' }, { status: 502, headers: NO_CACHE_HEADERS });
  }
};
