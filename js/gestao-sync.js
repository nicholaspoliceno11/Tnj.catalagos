export const DEFAULT_GESTAO_API_URL =
  "https://script.google.com/macros/s/AKfycbw0ExZh2Y-TEl9UU1mvaAiUDhKDoHlKlaE0hOPwTeUcvnm6_NXkgLX9dT5Qzjs7ZvoJpQ/exec";

const gestaoJsonp = (apiUrl, action, params = {}) =>
  new Promise((resolve, reject) => {
    const callbackName = `tnjGestaoCb${Date.now()}`;
    const url = new URL(apiUrl);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    url.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao conectar com a gestão TNJ 3D."));
    }, 30000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível conectar com a API da gestão."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });

const parseGestaoResponse = (data) => {
  if (!data?.ok) {
    throw new Error(data?.erro || "A gestão retornou um erro ao listar projetos.");
  }
  return data.projetos || [];
};

export const fetchGestaoProjetos = async (apiUrl) => {
  const url = new URL(apiUrl);
  url.searchParams.set("action", "projetos");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return parseGestaoResponse(data);
    }
  } catch (error) {
    console.warn("Fetch da gestão falhou, tentando JSONP:", error);
  }

  const data = await gestaoJsonp(apiUrl, "projetos");
  return parseGestaoResponse(data);
};

const slugifyProjetoId = (projetoId) =>
  `prj-${String(projetoId).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export const syncProjetosToCatalog = (catalog, projetos) => {
  const byProjetoId = new Map();
  const byCode = new Map();

  catalog.products.forEach((product) => {
    if (product.projetoId) byProjetoId.set(product.projetoId, product);
    if (product.code) byCode.set(product.code, product);
  });

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const projeto of projetos) {
    const projetoId = projeto.projetoId;
    if (!projetoId) continue;

    const existing = byProjetoId.get(projetoId) || byCode.get(projetoId);
    const price = projeto.precoSugeridoUnit ?? projeto.precoSugerido ?? null;
    const name = (projeto.nomeObjeto || projetoId).trim();

    if (existing) {
      if (existing.projetoId === projetoId && existing.active === false) {
        if (price != null) existing.price = price;
        if (name) existing.name = name;
        if (projeto.filamento) existing.subtitle = projeto.filamento;
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const newProduct = {
      id: slugifyProjetoId(projetoId),
      projetoId,
      name,
      code: projetoId,
      category: catalog.defaultCategory || "Impressão 3D",
      price,
      active: false,
      description: `Projeto ${projetoId} importado da gestão TNJ 3D. Edite foto, tags e descrição, depois ative para publicar.`,
      subtitle: projeto.filamento || undefined,
      featured: false,
    };

    catalog.products.push(newProduct);
    byProjetoId.set(projetoId, newProduct);
    byCode.set(projetoId, newProduct);
    added += 1;
  }

  return { added, updated, skipped, total: projetos.length };
};
