var RADIO_BROWSER_ENDPOINT =
  'https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/VN?hidebroken=true&order=votes&reverse=true&limit=12';

var FALLBACK_STATIONS = [
  {
    id: 'vn-fallback-1',
    name: 'VOH Radio',
    streamUrl: '',
    homepage: 'https://voh.com.vn/',
    tags: ['tin tuc', 'tong hop'],
    language: 'Vietnamese',
    frequency: 89.1,
  },
  {
    id: 'vn-fallback-2',
    name: 'VOV Giao Thông',
    streamUrl: '',
    homepage: 'https://vovgiaothong.vn/',
    tags: ['giao thong', 'tin tuc'],
    language: 'Vietnamese',
    frequency: 91.7,
  },
  {
    id: 'vn-fallback-3',
    name: 'Xone FM',
    streamUrl: '',
    homepage: 'https://xonefm.com/',
    tags: ['am nhac', 'pop'],
    language: 'Vietnamese',
    frequency: 94.4,
  },
];

function mapStation(station, index) {
  var baseFrequency = 88.1;
  var step = 1.1;

  return {
    id: station.stationuuid || station.changeuuid || 'radio-' + index,
    name: station.name || 'Radio ' + (index + 1),
    streamUrl: station.url_resolved || station.url || '',
    homepage: station.homepage || '',
    tags: String(station.tags || '')
      .split(',')
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean)
      .slice(0, 3),
    language: station.language || 'Vietnamese',
    frequency: Number((baseFrequency + index * step).toFixed(1)),
  };
}

function dedupeStations(stations) {
  var seen = new Set();

  return stations.filter(function (station) {
    var key = station.streamUrl || station.name;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

exports.listVietnameseStations = async function listVietnameseStations() {
  try {
    var response = await fetch(RADIO_BROWSER_ENDPOINT, {
      headers: {
        'User-Agent': 'MIA/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Radio Browser request failed with ' + response.status);
    }

    var payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error('Radio Browser payload is invalid');
    }

    var stations = dedupeStations(
      payload
        .map(mapStation)
        .filter(function (station) {
          return Boolean(station.streamUrl);
        }),
    );

    if (stations.length > 0) {
      return stations.slice(0, 8);
    }
  } catch (_error) {
    // fall back to a curated list if the upstream directory is unavailable
  }

  return FALLBACK_STATIONS;
};
