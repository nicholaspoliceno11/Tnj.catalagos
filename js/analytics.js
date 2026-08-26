const LOCAL_STORAGE_KEY = "tnj3d_analytics_v1";

export const CLICK_SOURCES = ["hero", "card", "modal"];

export const createEmptyClickStats = () => ({ total: 0, hero: 0, card: 0, modal: 0 });

export const normalizeClickStats = (value) => {
  if (typeof value === "number") {
    return { total: value, hero: 0, card: 0, modal: 0 };
  }

  if (!value || typeof value !== "object") {
    return createEmptyClickStats();
  }

  return {
    total: Number(value.total) || 0,
    hero: Number(value.hero) || 0,
    card: Number(value.card) || 0,
    modal: Number(value.modal) || 0,
  };
};

export const mergeClickMaps = (...maps) => {
  const result = {};

  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([productId, stats]) => {
      const current = normalizeClickStats(result[productId]);
      const incoming = normalizeClickStats(stats);
      result[productId] = {
        total: current.total + incoming.total,
        hero: current.hero + incoming.hero,
        card: current.card + incoming.card,
        modal: current.modal + incoming.modal,
      };
    });
  });

  return result;
};

export const getClicksUrl = () => {
  const path = window.location.pathname;
  const base = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  return `${base}data/clicks.json`;
};

export const loadLocalClicks = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.clicks && typeof parsed.clicks === "object" ? parsed.clicks : {};
  } catch {
    return {};
  }
};

export const saveLocalClicks = (clicks) => {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      clicks,
      updatedAt: new Date().toISOString(),
    })
  );
};

export const trackLocalClick = (productId, source) => {
  if (!productId || !CLICK_SOURCES.includes(source)) return loadLocalClicks();

  const clicks = loadLocalClicks();
  const stats = normalizeClickStats(clicks[productId]);
  stats.total += 1;
  stats[source] += 1;
  clicks[productId] = stats;
  saveLocalClicks(clicks);
  return clicks;
};

export const fetchServerClicks = async () => {
  try {
    const response = await fetch(`${getClicksUrl()}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return {};
    const data = await response.json();
    return data?.clicks && typeof data.clicks === "object" ? data.clicks : {};
  } catch {
    return {};
  }
};

export const reportClickToServer = (productId, source, endpoint) => {
  if (!endpoint || !productId) return;

  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "catalogClick");
    url.searchParams.set("productId", productId);
    url.searchParams.set("source", source);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url.toString());
      return;
    }

    fetch(url.toString(), { method: "GET", mode: "no-cors", keepalive: true }).catch(() => {});
  } catch {
    // Ignora falhas de sincronização remota.
  }
};

export const trackProductClick = (productId, source, { analyticsEndpoint } = {}) => {
  const clicks = trackLocalClick(productId, source);
  reportClickToServer(productId, source, analyticsEndpoint);
  return clicks;
};

export const getMergedClickCounts = (...maps) => mergeClickMaps(...maps);

export const mergeAnalyticsIntoCatalog = (catalog, clicksMap) => ({
  ...catalog,
  analytics: {
    ...(catalog.analytics || {}),
    clicks: clicksMap,
    updatedAt: new Date().toISOString(),
  },
});

export const buildClicksPayload = (clicksMap) => ({
  version: 1,
  clicks: clicksMap,
  updatedAt: new Date().toISOString(),
});

export const getTopProductsByClicks = (products, clicksMap, limit = 5) =>
  [...products]
    .map((product) => ({
      product,
      clicks: normalizeClickStats(clicksMap[product.id]).total,
    }))
    .filter((entry) => entry.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks || a.product.name.localeCompare(b.product.name, "pt-BR"))
    .slice(0, limit);
