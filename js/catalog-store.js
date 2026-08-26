const STORAGE_KEY = "tnj3d_catalog_v1";
const BACKUP_KEY = "tnj3d_catalog_backup_v1";
const BACKUP_META_KEY = "tnj3d_catalog_backup_meta_v1";
const GITHUB_OWNER = "nicholaspoliceno11";
const GITHUB_REPO = "Tnj.catalagos";

export const isProductPublished = (product) => {
  if (product.projetoId) {
    return product.active === true;
  }
  return product.active !== false;
};

export const normalizeCatalog = (catalog) => {
  if (!catalog?.products) return catalog;

  catalog.products = catalog.products.map((product) => {
    if (product.projetoId && product.active !== true) {
      return { ...product, active: false };
    }
    return product;
  });

  return catalog;
};

const getCatalogUrl = () => {
  const path = window.location.pathname;
  const base = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  return `${base}data/catalog.json`;
};

export { getCatalogUrl };

const githubHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const parseGitHubError = async (response) => {
  try {
    const data = await response.json();
    return data?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const encodeBase64 = (text) => btoa(unescape(encodeURIComponent(text)));

const uploadGitHubFile = async (token, path, contentBase64, message) => {
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  let sha;

  const current = await fetch(apiBase, { headers: githubHeaders(token) });
  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error(`Falha ao acessar ${path} no GitHub.`);
  }

  const response = await fetch(apiBase, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      sha,
    }),
  });

  if (!response.ok) {
    const detail = await parseGitHubError(response);
    throw new Error(`Não foi possível enviar ${path}. ${detail}`);
  }

  return response.json();
};

const isDataImage = (value) => typeof value === "string" && value.startsWith("data:image/");

const getImageExtension = (dataUrl) => {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  const type = match?.[1]?.toLowerCase() || "png";
  if (type === "jpeg") return "jpg";
  return type;
};

const dataUrlToBase64 = (dataUrl) => dataUrl.split(",")[1];

const compressDataUrlForPublish = (dataUrl, maxWidth = 900, quality = 0.78) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Não foi possível comprimir a imagem."));
    img.src = dataUrl;
  });

export const loadCatalog = async ({ useCache = true } = {}) => {
  if (useCache) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return normalizeCatalog(JSON.parse(cached));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  const response = await fetch(`${getCatalogUrl()}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o catálogo.");
  }
  return normalizeCatalog(await response.json());
};

export const loadPublicCatalog = async () => loadCatalog({ useCache: false });

export const saveCatalog = (catalog) => {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(
      BACKUP_META_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        productCount: JSON.parse(current)?.products?.length || 0,
      })
    );
    sessionStorage.setItem(BACKUP_KEY, current);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCatalog(catalog)));
};

export const getCatalogBackupInfo = () => {
  const backup = localStorage.getItem(BACKUP_KEY) || sessionStorage.getItem(BACKUP_KEY);
  if (!backup) return null;

  try {
    const meta = JSON.parse(localStorage.getItem(BACKUP_META_KEY) || "null");
    const parsed = JSON.parse(backup);
    return {
      productCount: meta?.productCount || parsed?.products?.length || 0,
      savedAt: meta?.savedAt || null,
    };
  } catch {
    return null;
  }
};

export const restoreCatalogBackup = () => {
  const backup = localStorage.getItem(BACKUP_KEY) || sessionStorage.getItem(BACKUP_KEY);
  if (!backup) return null;

  try {
    const parsed = normalizeCatalog(JSON.parse(backup));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return null;
  }
};

export const hasCatalogBackup = () =>
  Boolean(localStorage.getItem(BACKUP_KEY) || sessionStorage.getItem(BACKUP_KEY));

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

const publishImages = async (catalog, token) => {
  const updatedProducts = [];
  const imageErrors = [];

  for (const product of catalog.products) {
    if (!isDataImage(product.image)) {
      updatedProducts.push(product);
      continue;
    }

    try {
      const compressed = await compressDataUrlForPublish(product.image);
      const extension = "jpg";
      const filePath = `assets/produtos/${product.id}.${extension}`;
      await uploadGitHubFile(
        token,
        filePath,
        dataUrlToBase64(compressed),
        `feat: adicionar imagem do produto ${product.name}`
      );
      updatedProducts.push({ ...product, image: filePath });
    } catch (error) {
      imageErrors.push(`${product.name}: ${error.message}`);
      updatedProducts.push({ ...product, image: undefined });
    }
  }

  let hero = catalog.hero || {};
  if (hero.image && isDataImage(hero.image)) {
    try {
      const compressed = await compressDataUrlForPublish(hero.image);
      const heroPath = "assets/hero-destaque.jpg";
      await uploadGitHubFile(
        token,
        heroPath,
        dataUrlToBase64(compressed),
        "feat: atualizar foto em destaque da página inicial"
      );
      hero = { ...hero, image: heroPath };
    } catch (error) {
      imageErrors.push(`Foto em destaque: ${error.message}`);
    }
  }

  return {
    catalog: { ...catalog, hero, products: updatedProducts },
    imageErrors,
  };
};

const stripEmbeddedImages = (catalog) => ({
  ...catalog,
  hero: catalog.hero?.image && isDataImage(catalog.hero.image)
    ? { ...catalog.hero, image: undefined }
    : catalog.hero,
  products: catalog.products.map((product) => ({
    ...product,
    image: isDataImage(product.image) ? undefined : product.image,
  })),
});

const uploadCatalogJson = async (catalog, token) => {
  const path = "data/catalog.json";
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const content = encodeBase64(JSON.stringify(catalog, null, 2));

  let sha;
  const current = await fetch(apiBase, { headers: githubHeaders(token) });

  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    const detail = await parseGitHubError(current);
    throw new Error(`Falha ao acessar o catálogo no GitHub. ${detail}`);
  }

  const response = await fetch(apiBase, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "chore: atualizar catálogo via painel admin TNJ 3D",
      content,
      sha,
    }),
  });

  if (!response.ok) {
    const detail = await parseGitHubError(response);
    throw new Error(`Não foi possível publicar no GitHub. ${detail}`);
  }

  return response.json();
};

export const publishToGitHub = async (catalog, token) => {
  await uploadCatalogJson(stripEmbeddedImages(catalog), token);

  const { catalog: catalogWithFiles, imageErrors } = await publishImages(catalog, token);
  await uploadCatalogJson(catalogWithFiles, token);

  saveCatalog(catalogWithFiles);
  return { imageErrors };
};

export const testGitHubToken = async (token) => {
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new Error("Informe o token GitHub antes de testar.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
    { headers: githubHeaders(trimmed) }
  );

  if (!response.ok) {
    const detail = await parseGitHubError(response);
    throw new Error(`Token inválido ou sem acesso ao repositório. ${detail}`);
  }

  const repo = await response.json();
  return repo.full_name;
};

export const compressImageFile = (file, maxWidth = 1200) =>
  new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = outputType === "image/jpeg" ? 0.88 : undefined;
        resolve(canvas.toDataURL(outputType, quality));
      };
      img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
