const $ = (id) => document.getElementById(id);
const state = { unit: 'celsius', location: { name: 'São Paulo', region: 'São Paulo', country: 'Brasil', latitude: -23.5505, longitude: -46.6333 } };

const weatherInfo = (code) => {
  if (code === 0) return ['Céu limpo', '☀️'];
  if ([1, 2].includes(code)) return ['Parcialmente nublado', '🌤️'];
  if (code === 3) return ['Nublado', '☁️'];
  if ([45, 48].includes(code)) return ['Neblina', '🌫️'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['Garoa', '🌦️'];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Chuva', '🌧️'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Neve', '🌨️'];
  if ([95, 96, 99].includes(code)) return ['Trovoadas', '⛈️'];
  return ['Condição variável', '🌤️'];
};
const temperature = (value) => Math.round(state.unit === 'celsius' ? value : value * 9 / 5 + 32);
const degrees = (value) => `${temperature(value)}°`;
const weekday = (date, options = {}) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
const time = (value) => value?.slice(11, 16) ?? '--:--';
const brazilStates = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

async function loadWeather() {
  $('status').textContent = `Buscando previsão para ${state.location.name}…`;
  $('status').classList.remove('error');
  try {
    const { latitude, longitude } = state.location;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude, longitude, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'visibility', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max', timezone: 'auto', forecast_days: '7' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Não foi possível obter a previsão. Tente novamente.');
    const data = await response.json();
    render(data);
    $('dashboard').hidden = false;
    $('status').textContent = `Previsão atualizada para ${state.location.name}`;
  } catch (error) {
    $('status').textContent = `${error.message} Confira sua conexão e tente novamente.`;
    $('status').classList.add('error');
  }
}

function render(data) {
  const c = data.current, d = data.daily;
  const [description, icon] = weatherInfo(c.weather_code);
  $('city-name').textContent = state.location.name;
  $('country-name').textContent = [state.location.region, state.location.country].filter(Boolean).join(' · ');
  $('today-label').textContent = weekday(c.time.slice(0, 10), { day: 'numeric', month: 'long' }).toUpperCase();
  $('hero-icon').textContent = icon;
  $('current-temp').textContent = temperature(c.temperature_2m);
  $('condition-text').textContent = description;
  $('feels-like').textContent = degrees(c.apparent_temperature);
  $('high-temp').textContent = degrees(d.temperature_2m_max[0]);
  $('low-temp').textContent = degrees(d.temperature_2m_min[0]);
  $('summary-text').textContent = c.is_day ? 'Durante o dia' : 'Durante a noite';
  $('sunrise').textContent = time(d.sunrise[0]); $('sunset').textContent = time(d.sunset[0]);
  $('humidity').textContent = `${c.relative_humidity_2m}%`;
  $('humidity-note').textContent = c.relative_humidity_2m >= 70 ? 'ar úmido' : 'ar mais seco';
  $('wind').innerHTML = `${Math.round(c.wind_speed_10m)} <small>km/h</small>`;
  $('wind-note').textContent = c.wind_speed_10m > 25 ? 'vento forte' : 'vento moderado';
  $('rain').textContent = `${d.precipitation_probability_max[0]}%`;
  $('uv').textContent = Math.round(d.uv_index_max[0]);
  $('uv-note').textContent = d.uv_index_max[0] >= 6 ? 'proteção recomendada' : 'baixo a moderado';
  const hourKey = `${c.time.slice(0, 13)}:00`;
  const hourIndex = data.hourly.time.indexOf(hourKey);
  const visibility = hourIndex >= 0 ? data.hourly.visibility[hourIndex] : null;
  renderTravelAdvice(c, d, visibility);
  $('forecast-list').innerHTML = d.time.map((date, i) => {
    const [label, emoji] = weatherInfo(d.weather_code[i]);
    const dayName = i === 0 ? 'Hoje' : weekday(date, { weekday: 'short' }).replace('.', '');
    return `<div class="forecast-row ${i === 0 ? 'today' : ''}"><span class="forecast-day">${dayName}</span><span class="forecast-weather" title="${label}">${emoji}</span><span class="rain-chance">${d.precipitation_probability_max[i]}% chuva</span><span class="forecast-temps"><b>${temperature(d.temperature_2m_max[i])}°</b>${temperature(d.temperature_2m_min[i])}°</span></div>`;
  }).join('');
}

function renderTravelAdvice(current, daily, visibility) {
  const rainChance = daily.precipitation_probability_max[0] ?? 0;
  const wind = current.wind_speed_10m;
  const storm = [95, 96, 99].includes(current.weather_code);
  const raining = current.precipitation > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(current.weather_code);
  const visible = visibility ?? Number.POSITIVE_INFINITY;
  const visibilityReason = visibility == null ? 'Visibilidade indisponível' : `${(visibility / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km de visibilidade`;
  const label = (score) => score >= 2 ? ['Favorável', 'good'] : score === 1 ? ['Atenção', 'caution'] : ['Desfavorável', 'poor'];
  const conditions = [
    { icon: '🚶', name: 'Caminhada', score: (visible < 1000 || storm || wind >= 55) ? 0 : ((raining || rainChance >= 50 || visible < 3000 || wind >= 35) ? 1 : 2), reason: raining ? 'Chuva no momento' : (rainChance >= 50 ? `Chance de chuva: ${rainChance}%` : visibilityReason) },
    { icon: '🚲', name: 'Bicicleta', score: (visible < 1000 || storm || wind >= 45) ? 0 : ((raining || rainChance >= 35 || visible < 5000 || wind >= 25) ? 1 : 2), reason: raining ? 'Pista molhada ou chuva' : (wind >= 25 ? `Vento de ${Math.round(wind)} km/h` : visibilityReason) },
    { icon: '🏍️', name: 'Moto', score: (visible < 1000 || storm || raining || wind >= 50) ? 0 : ((rainChance >= 30 || visible < 5000 || wind >= 30) ? 1 : 2), reason: raining ? 'Chuva reduz a aderência' : (visible < 5000 ? 'Visibilidade reduzida' : `Vento de ${Math.round(wind)} km/h`) },
    { icon: '🚗', name: 'Carro', score: (visible < 500 || storm) ? 0 : ((raining || rainChance >= 60 || visible < 2000 || wind >= 55) ? 1 : 2), reason: visible < 2000 ? 'Visibilidade reduzida' : (raining ? 'Chuva no momento' : visibilityReason) },
    { icon: '✈️', name: 'Avião', score: (storm || visible < 1000 || wind >= 60) ? 0 : ((raining || visible < 5000 || wind >= 40) ? 1 : 2), reason: storm ? 'Trovoadas na região' : (visible < 5000 ? 'Visibilidade local reduzida' : visibilityReason) },
  ];
  $('visibility-reading').textContent = visibility == null ? 'Visibilidade indisponível' : `Visibilidade: ${(visibility / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  $('travel-grid').innerHTML = conditions.map((item) => {
    const [status, kind] = label(item.score);
    return `<article class="travel-item"><span class="travel-icon" aria-hidden="true">${item.icon}</span><span class="travel-name">${item.name}</span><strong class="travel-status ${kind}">${status}</strong><small>${item.reason}</small></article>`;
  }).join('');
}

async function searchCity(query, region) {
  $('status').textContent = `Procurando ${query}${region ? `, ${region}` : ''}…`;
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: query, count: '10', language: 'pt', format: 'json' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na busca da cidade.');
    const results = (await response.json()).results ?? [];
    const requestedRegion = region.trim();
    const expandedRegion = brazilStates[requestedRegion.toUpperCase()] ?? requestedRegion;
    const normalizedRegion = normalize(expandedRegion);
    const result = normalizedRegion
      ? results.find((place) => [place.admin1, place.admin1_code, place.admin2].some((value) => value && (normalize(value) === normalizedRegion || normalize(value).startsWith(`${normalizedRegion} `))))
      : results[0];
    if (!result) throw new Error(normalizedRegion ? 'Cidade não encontrada nesse estado. Confira o nome do estado ou UF.' : 'Cidade não encontrada. Tente outro nome.');
    state.location = { name: result.name, region: result.admin1 ?? '', country: result.country ?? '', latitude: result.latitude, longitude: result.longitude };
    await loadWeather();
  } catch (error) {
    $('status').textContent = error.message;
    $('status').classList.add('error');
  }
}

$('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = $('city-input').value.trim();
  const region = $('state-input').value.trim();
  if (query) searchCity(query, region);
});
$('unit-toggle').addEventListener('click', () => {
  state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
  $('unit-toggle').innerHTML = state.unit === 'celsius' ? '°C <span>/</span> °F' : '°F <span>/</span> °C';
  loadWeather();
});
$('refresh-transit').addEventListener('click', () => {
  $('transit-updated').textContent = `Painéis recarregados às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
  loadTransitStatuses({ force: true });
});

const metroLines = [
  { code: '1', name: 'Azul' }, { code: '2', name: 'Verde' }, { code: '3', name: 'Vermelha' },
  { code: '15', name: 'Prata' }, { code: '17', name: 'Ouro' },
];
const concessionLines = [
  { code: '4', name: 'Amarela' }, { code: '5', name: 'Lilás' }, { code: '6', name: 'Laranja' },
  { code: '7', name: 'Rubi' }, { code: '8', name: 'Diamante' }, { code: '9', name: 'Esmeralda' },
];
const cptmLines = [
  { code: '10', name: 'Turquesa' }, { code: '11', name: 'Coral' },
  { code: '12', name: 'Safira' }, { code: '13', name: 'Jade' },
];
const transitStatuses = [
  'Operação com Impacto Pontual', 'Operação Normal', 'Operação Transitória', 'Operação Diferenciada',
  'Operação Especial', 'Operação Parcial', 'Operação Encerrada', 'Velocidade Reduzida',
  'Com Ocorrências', 'Operação Paralisada', 'Paralisada', 'Maiores Intervalos', 'Status Desconhecido',
  'Dados/Status Indisponíveis', 'Dados Indisponíveis', 'Status não disponível',
];

function statusFromText(text, startAt) {
  const nearby = text.slice(startAt, startAt + 420);
  const candidates = transitStatuses.flatMap((status) => {
    const index = nearby.toLocaleLowerCase('pt-BR').indexOf(status.toLocaleLowerCase('pt-BR'));
    return index < 0 ? [] : [{ status, index }];
  }).sort((a, b) => a.index - b.index);
  return candidates[0]?.status ?? null;
}

function renderTransitLines(containerId, lines, sourceText, updatedText, failureReason = '') {
  const container = $(containerId);
  const cleanText = sourceText.replace(/\s+/g, ' ').trim();
  const normalizedText = cleanText.toLocaleLowerCase('pt-BR');
  const rows = [];
  for (const line of lines) {
    const lineName = line.name.toLocaleLowerCase('pt-BR');
    const anchor = normalizedText.lastIndexOf(lineName);
    const nextLinePositions = lines
      .filter((candidate) => candidate.code !== line.code)
      .map((candidate) => normalizedText.lastIndexOf(candidate.name.toLocaleLowerCase('pt-BR'), anchor + lineName.length))
      .filter((position) => position > anchor);
    const nextLine = nextLinePositions.length ? Math.min(...nextLinePositions) : cleanText.length;
    const status = anchor >= 0 ? statusFromText(cleanText.slice(0, nextLine), anchor + line.name.length) : null;
    rows.push({ ...line, status: status ?? 'Status indisponível' });
  }
  container.replaceChildren();
  if (!rows.length) {
    const message = document.createElement('p');
    message.className = 'transit-error';
    message.textContent = window.location.protocol === 'file:'
      ? 'Para carregar os status aqui, abra iniciar-clima.bat na pasta do site. O arquivo HTML aberto diretamente não consegue consultar as fontes.'
      : (failureReason
        ? `${failureReason} Use o link do painel para consultar a operação.`
        : 'A página oficial abriu, mas o status das linhas não foi encontrado. Use o link do painel para consultar a operação.');
    container.append(message);
    return;
  }
  for (const line of rows) {
    const row = document.createElement('div');
    row.className = 'transit-line';
    const lineName = document.createElement('strong');
    lineName.className = `line-number line-${line.code}`;
    lineName.textContent = line.code;
    const name = document.createElement('span');
    name.className = 'line-name';
    name.textContent = line.name;
    const status = document.createElement('span');
    const isNormal = line.status.toLocaleLowerCase('pt-BR').includes('normal');
    status.className = `line-status ${isNormal ? 'status-normal' : 'status-attention'}`;
    status.textContent = line.status;
    row.append(lineName, name, status);
    container.append(row);
  }
  if (updatedText || failureReason) {
    const updated = document.createElement('small');
    updated.className = 'line-updated';
    updated.textContent = updatedText || `Consulta indisponível: ${failureReason}`;
    container.append(updated);
  }
}

async function fetchOfficialPage(source, force) {
  if (window.location.protocol === 'file:') throw new Error('Abra o site pelo iniciar-clima.bat.');
  const refresh = force ? `&refresh=${Date.now()}` : '';
  const response = await fetch(`/api/transit?source=${encodeURIComponent(source)}${refresh}`, { cache: force ? 'no-store' : 'default' });
  if (!response.ok) throw new Error(`Consulta respondeu HTTP ${response.status}`);
  const result = await response.json();
  if (!result.html) throw new Error(result.error || 'A fonte oficial retornou conteúdo vazio.');
  return { page: new DOMParser().parseFromString(result.html, 'text/html'), fetchedAt: result.fetchedAt };
}

async function loadTransitStatuses({ force = false } = {}) {
  const sources = [
    { id: 'metro-lines', source: 'metro', lines: metroLines },
    { id: 'artesp-lines', source: 'artesp', lines: concessionLines },
    { id: 'cptm-lines', source: 'cptm', lines: cptmLines },
  ];
  await Promise.all(sources.map(async (source) => {
    try {
      const { page, fetchedAt } = await fetchOfficialPage(source.source, force);
      const cptmStatus = source.source === 'cptm' ? page.querySelector('.situacao_linhas') : null;
      const cptmUpdated = source.source === 'cptm' ? page.querySelector('.situacao_linhas_atualizado_em') : null;
      const text = source.source === 'cptm'
        ? (cptmStatus?.innerText || cptmStatus?.textContent || '')
        : (page.body?.innerText || page.body?.textContent || '');
      const updatedSource = cptmUpdated?.innerText || cptmUpdated?.textContent || text;
      const updatedMatch = updatedSource.match(/Atualizado\s*:?\s*(\d{2}\/\d{2}\/\d{4}[^\n<]{0,30})/i);
      const checked = fetchedAt ? new Date(fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      renderTransitLines(source.id, source.lines, text, updatedMatch?.[1] ? `Atualizado: ${updatedMatch[1].trim()}` : `Consulta: ${checked}`);
    } catch (error) {
      renderTransitLines(source.id, source.lines, '', '', error.message);
    }
  }));
}

loadTransitStatuses();
window.setInterval(loadTransitStatuses, 5 * 60 * 1000);
loadWeather();
