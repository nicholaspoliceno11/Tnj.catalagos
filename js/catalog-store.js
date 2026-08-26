const STORAGE_KEY = "tnj3d_catalog_v1";
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

const githubHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
});

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
    throw new Error(`Não foi possível enviar ${path}.`);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCatalog(catalog)));
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

const publishImages = async (catalog, token) => {
  const updatedProducts = [];

  for (const product of catalog.products) {
    if (!isDataImage(product.image)) {
      updatedProducts.push(product);
      continue;
    }

    const extension = getImageExtension(product.image);
    const filePath = `assets/produtos/${product.id}.${extension}`;
    await uploadGitHubFile(
      token,
      filePath,
      dataUrlToBase64(product.image),
      `feat: adicionar imagem do produto ${product.name}`
    );
    updatedProducts.push({ ...product, image: filePath });
  }

  let hero = catalog.hero || {};
  if (hero.image && isDataImage(hero.image)) {
    const extension = getImageExtension(hero.image);
    const heroPath = `assets/hero-destaque.${extension}`;
    await uploadGitHubFile(
      token,
      heroPath,
      dataUrlToBase64(hero.image),
      "feat: atualizar foto em destaque da página inicial"
    );
    hero = { ...hero, image: heroPath };
  }

  return { ...catalog, hero, products: updatedProducts };
};

export const publishToGitHub = async (catalog, token) => {
  const catalogWithFiles = await publishImages(catalog, token);
  const path = "data/catalog.json";
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const content = encodeBase64(JSON.stringify(catalogWithFiles, null, 2));

  let sha;
  const current = await fetch(apiBase, { headers: githubHeaders(token) });

  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error("Falha ao acessar o repositório no GitHub.");
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
    throw new Error("Não foi possível publicar no GitHub. Verifique o token de acesso.");
  }

  saveCatalog(catalogWithFiles);
  return response.json();
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
