const STORAGE_KEY = "tnj3d_catalog_v1";

const getCatalogUrl = () => {
  const path = window.location.pathname;
  const base = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  return `${base}data/catalog.json`;
};

export const loadCatalog = async () => {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const response = await fetch(`${getCatalogUrl()}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o catálogo.");
  }
  return response.json();
};

export const saveCatalog = (catalog) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
};

export const clearCatalogCache = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const downloadCatalog = (catalog) => {
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalog.json";
  link.click();
  URL.revokeObjectURL(url);
};

export const publishToGitHub = async (catalog, token) => {
  const owner = "nicholaspoliceno11";
  const repo = "Tnj.catalagos";
  const path = "data/catalog.json";
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(catalog, null, 2))));

  let sha;
  const current = await fetch(apiBase, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error("Falha ao acessar o repositório no GitHub.");
  }

  const response = await fetch(apiBase, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "chore: atualizar catálogo via painel admin TNJ 3D",
      content,
      sha,
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível publicar no GitHub. Verifique o token de acesso.");
  }

  saveCatalog(catalog);
  return response.json();
};
