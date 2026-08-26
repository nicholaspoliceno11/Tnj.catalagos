const normalizeCategoryKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

const registerCategory = (bucket, name) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return;

  const key = normalizeCategoryKey(trimmed);
  if (!bucket.has(key)) bucket.set(key, new Map());
  const names = bucket.get(key);
  names.set(trimmed, (names.get(trimmed) || 0) + 1);
};

export const getCategoryCanonicalMap = (catalog) => {
  const bucket = new Map();
  registerCategory(bucket, catalog?.defaultCategory);
  (catalog?.products || []).forEach((product) => registerCategory(bucket, product.category));

  const canonical = new Map();
  bucket.forEach((names, key) => {
    const winner = [...names.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
    )[0][0];
    canonical.set(key, winner);
  });

  return canonical;
};

export const getCatalogCategories = (catalog) =>
  [...getCategoryCanonicalMap(catalog).values()].sort((a, b) => a.localeCompare(b, "pt-BR"));

export const resolveCategoryName = (input, catalog) => {
  const trimmed = String(input || "").trim();
  if (!trimmed) return trimmed;

  const canonical = getCategoryCanonicalMap(catalog);
  return canonical.get(normalizeCategoryKey(trimmed)) || trimmed;
};

export const normalizeCatalogCategories = (catalog) => {
  if (!catalog) return catalog;

  const canonical = getCategoryCanonicalMap(catalog);
  const resolve = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return trimmed;
    return canonical.get(normalizeCategoryKey(trimmed)) || trimmed;
  };

  if (catalog.defaultCategory) {
    catalog.defaultCategory = resolve(catalog.defaultCategory);
  }

  if (catalog.products) {
    catalog.products = catalog.products.map((product) => ({
      ...product,
      category: resolve(product.category),
    }));
  }

  return catalog;
};

export const fillCategoryDatalist = (datalistId, catalog) => {
  const datalist = document.getElementById(datalistId);
  if (!datalist) return;

  datalist.innerHTML = getCatalogCategories(catalog)
    .map((category) => `<option value="${category.replace(/"/g, "&quot;")}"></option>`)
    .join("");
};
