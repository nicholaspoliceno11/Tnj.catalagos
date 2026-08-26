import { login, logout, isAuthenticated } from "./auth.js?v=20260826o";
import {
  loadCatalog,
  saveCatalog,
  downloadCatalog,
  publishToGitHub,
  compressImageFile,
  clearCatalogCache,
  restoreCatalogBackup,
  hasCatalogBackup,
  getCatalogBackupInfo,
  isProductPublished,
  getCatalogUrl,
  testGitHubToken,
  normalizeGitHubToken,
  mergeCatalogPrices,
  fetchServerCatalog,
} from "./catalog-store.js?v=20260826o";
import {
  DEFAULT_GESTAO_API_URL,
  fetchGestaoProjetos,
  syncProjetosToCatalog,
} from "./gestao-sync.js?v=20260826o";
import {
  PRESET_AUDIENCE_TAGS,
  normalizeAudienceTags,
  audienceTagToStorage,
  getAudienceTagKey,
  isPresetAudienceTag,
  escapeHtml,
  getAudienceTagStyle,
} from "./tags.js?v=20260826o";

const PUBLIC_SITE_URL = "https://nicholaspoliceno11.github.io/Tnj.catalagos/";
const GESTAO_API_KEY = "tnj3d_gestao_api_url";
const GESTAO_AUTO_SYNC_KEY = "tnj3d_gestao_auto_sync";

const getGitHubToken = () => {
  const inputToken = normalizeGitHubToken(document.getElementById("github-token")?.value);
  const savedToken = normalizeGitHubToken(sessionStorage.getItem(TOKEN_KEY));
  const token = inputToken || savedToken || "";
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    const input = document.getElementById("github-token");
    if (input && input.value !== token) {
      input.value = token;
    }
  }
  return token;
};

const clearGitHubToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  const input = document.getElementById("github-token");
  if (input) {
    input.value = "";
  }
};
let catalog = null;
let editingProductId = null;
let appReady = false;
let uploadedImageData = null;
let heroUploadedImageData = null;
let productFilter = "all";
let productSearchQuery = "";
let customAudienceTags = [];

const formatPrice = (value) => {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const showAlert = (message, type = "success") => {
  const alert = document.getElementById("admin-alert");
  if (!alert) return;
  alert.textContent = message;
  alert.className = `admin-alert admin-alert--${type}`;
  alert.hidden = false;
  setTimeout(() => {
    alert.hidden = true;
  }, 5000);
};

const setLoginLoading = (loading) => {
  const button = document.getElementById("login-submit-btn");
  if (!button) return;
  button.disabled = loading || !appReady;
  button.textContent = loading ? "Entrando..." : "Entrar";
};

const showLoginError = (message) => {
  const errorEl = document.getElementById("login-error");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
};

const clearLoginError = () => {
  const errorEl = document.getElementById("login-error");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.hidden = true;
};

const isProductActive = (product) => product.active !== false;

const matchesProductSearch = (product, query) => {
  const term = query.trim().toLowerCase();
  if (!term) return true;

  const haystack = [
    product.name,
    product.code,
    product.projetoId,
    product.subtitle,
    product.category,
    product.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
};

const getFilteredProducts = () => {
  if (!catalog) return [];

  let list = catalog.products;

  if (productFilter === "inactive") {
    list = list.filter((product) => !isProductActive(product));
  } else if (productFilter === "active") {
    list = list.filter((product) => isProductActive(product));
  }

  if (productSearchQuery.trim()) {
    list = list.filter((product) => matchesProductSearch(product, productSearchQuery));
  }

  return list;
};

const updateProductSearchCount = (visibleCount = getFilteredProducts().length) => {
  const counter = document.getElementById("product-search-count");
  if (!counter || !catalog) return;

  const total = catalog.products.length;
  const query = productSearchQuery.trim();

  if (query) {
    counter.textContent = `${visibleCount} projeto(s) encontrado(s) de ${total}`;
    return;
  }

  counter.textContent = `${total} projeto(s)`;
};

const renderProductsTable = () => {
  const tbody = document.getElementById("products-table");
  if (!tbody || !catalog) return;

  const sorted = [...getFilteredProducts()].sort((a, b) => {
    const aInactive = !isProductActive(a);
    const bInactive = !isProductActive(b);
    if (aInactive !== bInactive) return aInactive ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  if (!sorted.length) {
    const hasSearch = Boolean(productSearchQuery.trim());
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="admin-table__empty">
          ${
            hasSearch
              ? `Nenhum projeto encontrado para <strong>${escapeHtml(productSearchQuery.trim())}</strong>.`
              : productFilter === "inactive"
                ? "Nenhum produto inativo. Clique em <strong>Importar da gestão</strong> para trazer projetos do Empresa_TNJ.3D."
                : "Nenhum produto encontrado neste filtro."
          }
        </td>
      </tr>`;
    updateGestaoSyncHint();
    updateProductSearchCount(0);
    return;
  }

  tbody.innerHTML = sorted
    .map(
      (product) => `
      <tr class="${isProductActive(product) ? "" : "admin-table__row--inactive"}">
        <td><strong>${product.name}</strong>${product.projetoId ? `<br><span class="admin-table__meta">Gestão: ${product.projetoId}</span>` : ""}</td>
        <td>${product.code}</td>
        <td>${product.category}</td>
        <td>${formatPrice(product.price)}</td>
        <td>
          <span class="admin-status admin-status--${isProductActive(product) ? "active" : "inactive"}">
            ${isProductActive(product) ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td>
          <div class="admin-table__actions">
            <button class="btn btn--ghost btn--sm js-edit" data-id="${product.id}">Editar</button>
            ${
              isProductActive(product)
                ? `<button class="btn btn--outline btn--sm js-toggle-active" data-id="${product.id}">Desativar</button>`
                : `<button class="btn btn--primary btn--sm js-toggle-active" data-id="${product.id}">Ativar</button>`
            }
            <button class="btn btn--outline btn--sm js-delete" data-id="${product.id}">Excluir</button>
          </div>
        </td>
      </tr>`
    )
    .join("");

  updateGestaoSyncHint();
  updateProductSearchCount(sorted.length);
  updatePublishHint();
};

const updatePublishHint = async () => {
  const hint = document.getElementById("publish-hint");
  if (!hint || !catalog) return;

  try {
    const response = await fetch(`${getCatalogUrl()}?t=${Date.now()}`);
    if (!response.ok) throw new Error("fetch failed");
    const published = await response.json();
    const localTotal = catalog.products.length;
    const publishedTotal = (published.products || []).length;
    const localActive = catalog.products.filter(isProductPublished).length;
    const publishedActive = (published.products || []).filter(isProductPublished).length;

    const totalsDiffer = localTotal !== publishedTotal;
    const activeDiffer = localActive !== publishedActive;

    if (totalsDiffer || activeDiffer) {
      hint.hidden = false;
      hint.innerHTML = `
        <strong>Alterações ainda não publicadas no site.</strong>
        Painel: <strong>${localTotal} produto(s)</strong> (${localActive} ativo(s)).
        Site público: <strong>${publishedTotal} produto(s)</strong> (${publishedActive} ativo(s)).
        Clique em <strong>Publicar catálogo</strong> para enviar ao GitHub e atualizar o site.
      `;
    } else {
      hint.hidden = true;
      hint.innerHTML = "";
    }
  } catch {
    hint.hidden = false;
    hint.innerHTML = `
      <strong>Alterações salvas apenas neste navegador.</strong>
      Clique em <strong>Publicar catálogo</strong> para atualizar o site público.
    `;
  }
};

const updateBackupButton = () => {
  const button = document.getElementById("restore-backup-btn");
  const hint = document.getElementById("backup-hint");
  if (!button || !hint) return;

  const info = getCatalogBackupInfo();
  if (!info) {
    button.disabled = true;
    hint.textContent =
      "Nenhum backup salvo ainda. O backup é criado automaticamente quando você edita ou salva produtos.";
    return;
  }

  button.disabled = false;
  const when = info.savedAt
    ? new Date(info.savedAt).toLocaleString("pt-BR")
    : "data desconhecida";
  hint.textContent = `Backup disponível: ${info.productCount} produto(s), salvo em ${when}.`;
};

const restoreCatalogFromBackup = () => {
  const restored = restoreCatalogBackup();
  if (!restored) {
    showAlert("Nenhum backup encontrado nesta sessão.", "error");
    return;
  }

  catalog = restored;
  saveCatalog(catalog);
  renderProductsTable();
  populateFeaturedProductSelect();
  updatePublishHint();
  updateBackupButton();
  showAlert(`Backup restaurado com ${catalog.products.length} produto(s).`);
};

const updateGestaoSyncHint = () => {
  const hint = document.getElementById("gestao-sync-hint");
  if (!hint || !catalog) return;
  const inactive = catalog.products.filter((product) => !isProductActive(product)).length;
  const gestaoCount = catalog.products.filter((product) => product.projetoId).length;
  hint.innerHTML =
    inactive > 0
      ? `<strong>${inactive} produto(s) inativo(s)</strong> aguardando revisão (${gestaoCount} vindo(s) da gestão). Eles <strong>não aparecem no site público</strong> até você clicar em <strong>Ativar</strong>.`
      : "Todos os produtos estão ativos no catálogo público.";
};

const setProductFilter = (filter) => {
  productFilter = filter;
  document.querySelectorAll("[data-product-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.productFilter === filter);
  });
  renderProductsTable();
};

const focusProductsPanel = () => {
  document.querySelectorAll(".admin-nav__item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.panel === "products");
  });
  document.getElementById("products-panel").hidden = false;
  document.getElementById("hero-panel").hidden = true;
  document.getElementById("settings-panel").hidden = true;
  document.getElementById("panel-title").textContent = "Produtos";
  document.getElementById("panel-subtitle").textContent =
    "Edite preços, importe da gestão e ative itens para publicar.";
};

const fillCompanyForm = () => {
  if (!catalog) return;
  document.getElementById("company-name").value = catalog.company.name;
  document.getElementById("company-tagline").value = catalog.company.tagline || "";
  document.getElementById("company-whatsapp").value = catalog.company.whatsapp;
  document.getElementById("company-whatsapp2").value = catalog.company.whatsapp2 || "";
  document.getElementById("company-email").value = catalog.company.email;
  document.getElementById("company-message").value = catalog.company.whatsappMessage || "";
  document.getElementById("default-category").value = catalog.defaultCategory || "";
};

const populateFeaturedProductSelect = () => {
  const select = document.getElementById("hero-featured-product");
  if (!select || !catalog) return;

  select.innerHTML = catalog.products
    .filter(isProductActive)
    .map(
      (product) =>
        `<option value="${product.id}">${product.name} (${product.code})</option>`
    )
    .join("");
};

const resetHeroImagePreview = () => {
  heroUploadedImageData = null;
  document.getElementById("hero-image-file").value = "";
  document.getElementById("hero-image-preview").hidden = true;
  document.getElementById("hero-image-preview-img").removeAttribute("src");
};

const showHeroImagePreview = (src) => {
  const preview = document.getElementById("hero-image-preview");
  const image = document.getElementById("hero-image-preview-img");
  image.src = src;
  preview.hidden = false;
};

const fillHeroForm = () => {
  if (!catalog) return;
  const hero = catalog.hero || {};

  populateFeaturedProductSelect();
  document.getElementById("hero-eyebrow").value = hero.eyebrow || "";
  document.getElementById("hero-title").value = hero.title || "";
  document.getElementById("hero-description").value = hero.description || "";
  document.getElementById("hero-cta-primary").value = hero.ctaPrimary || "";
  document.getElementById("hero-cta-secondary").value = hero.ctaSecondary || "";
  document.getElementById("hero-image-url").value =
    hero.image && !hero.image.startsWith("data:image/") ? hero.image : "";
  document.getElementById("hero-featured-label").value = hero.featuredLabel || "Destaque";
  document.getElementById("hero-featured-product").value =
    hero.featuredProductId || catalog.products[0]?.id || "";

  resetHeroImagePreview();
  if (hero.image) {
    showHeroImagePreview(hero.image);
    if (hero.image.startsWith("data:image/")) {
      heroUploadedImageData = hero.image;
    }
  }
};

const getSelectedPresetAudienceKeys = () =>
  [...document.querySelectorAll('input[name="audience-tag-preset"]:checked')].map(
    (input) => input.value
  );

const setSelectedPresetAudienceKeys = (keys = []) => {
  document.querySelectorAll('input[name="audience-tag-preset"]').forEach((input) => {
    input.checked = keys.includes(input.value);
  });
};

const resetCustomTagForm = () => {
  const labelInput = document.getElementById("custom-tag-label");
  const colorInput = document.getElementById("custom-tag-color");
  if (labelInput) labelInput.value = "";
  if (colorInput) colorInput.value = "#ff9f43";
};

const renderCustomAudienceTags = () => {
  const list = document.getElementById("custom-audience-tags");
  if (!list) return;

  if (!customAudienceTags.length) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }

  list.hidden = false;
  list.innerHTML = customAudienceTags
    .map(
      (tag, index) => `
      <span class="admin-tag-custom__item" style="${getAudienceTagStyle(tag)}">
        <span>${escapeHtml(tag.label)}</span>
        <button
          type="button"
          class="admin-tag-custom__remove"
          data-custom-tag-index="${index}"
          aria-label="Remover tag ${escapeHtml(tag.label)}"
        >×</button>
      </span>`
    )
    .join("");
};

const setCustomAudienceTags = (tags = []) => {
  customAudienceTags = normalizeAudienceTags(tags).filter((tag) => !isPresetAudienceTag(tag));
  renderCustomAudienceTags();
};

const addCustomAudienceTag = () => {
  const labelInput = document.getElementById("custom-tag-label");
  const colorInput = document.getElementById("custom-tag-color");
  const label = labelInput?.value.trim() || "";
  const color = colorInput?.value || "#ff9f43";

  if (!label) {
    showAlert("Digite o nome da tag personalizada.", "error");
    labelInput?.focus();
    return;
  }

  const nextTag = { label, color };
  const nextKey = getAudienceTagKey(nextTag);
  const presetKeys = getSelectedPresetAudienceKeys();
  const presetConflict = PRESET_AUDIENCE_TAGS.some(
    (preset) =>
      preset.key === nextKey.toUpperCase() ||
      preset.label.toLowerCase() === label.toLowerCase()
  );

  if (presetConflict) {
    showAlert("Use as opções em destaque para TDAH, TEA ou Ansiedade.", "error");
    return;
  }

  if (
    customAudienceTags.some((tag) => getAudienceTagKey(tag) === nextKey) ||
    presetKeys.includes(nextKey.toUpperCase())
  ) {
    showAlert("Essa tag já foi adicionada.", "error");
    return;
  }

  customAudienceTags.push(nextTag);
  renderCustomAudienceTags();
  resetCustomTagForm();
  labelInput?.focus();
};

const removeCustomAudienceTag = (index) => {
  customAudienceTags = customAudienceTags.filter((_, itemIndex) => itemIndex !== index);
  renderCustomAudienceTags();
};

const getSelectedAudienceTags = () => {
  const presetTags = getSelectedPresetAudienceKeys().map((key) => {
    const preset = PRESET_AUDIENCE_TAGS.find((item) => item.key === key);
    return audienceTagToStorage(preset);
  });

  const customTags = customAudienceTags.map((tag) => audienceTagToStorage(tag));
  return normalizeAudienceTags([...presetTags, ...customTags]).map((tag) =>
    audienceTagToStorage(tag)
  );
};

const setSelectedAudienceTags = (tags = []) => {
  const normalized = normalizeAudienceTags(tags);
  const presetKeys = normalized
    .filter((tag) => isPresetAudienceTag(tag))
    .map((tag) => tag.key);
  setSelectedPresetAudienceKeys(presetKeys);
  setCustomAudienceTags(normalized.filter((tag) => !isPresetAudienceTag(tag)));
  resetCustomTagForm();
};

const updateOfferLabelVisibility = () => {
  const offerType = document.getElementById("product-offer-type").value;
  const wrap = document.getElementById("product-offer-label-wrap");
  wrap.hidden = !offerType;
};

const resetImagePreview = () => {
  uploadedImageData = null;
  document.getElementById("product-image-file").value = "";
  document.getElementById("product-image-preview").hidden = true;
  document.getElementById("product-image-preview-img").removeAttribute("src");
};

const showImagePreview = (src) => {
  if (!src) {
    resetImagePreview();
    return;
  }
  const preview = document.getElementById("product-image-preview");
  const image = document.getElementById("product-image-preview-img");
  image.src = src;
  image.onerror = () => resetImagePreview();
  preview.hidden = false;
};

const updateProductPriceHint = (product = null) => {
  const hint = document.getElementById("product-price-hint");
  if (!hint) return;
  hint.hidden = !product?.projetoId;
};

const openProductModal = (product = null) => {
  editingProductId = product?.id || null;
  resetImagePreview();
  document.getElementById("product-form-title").textContent = product
    ? "Editar produto"
    : "Novo produto";
  document.getElementById("product-name").value = product?.name || "";
  document.getElementById("product-code").value = product?.code || "";
  document.getElementById("product-subtitle").value = product?.subtitle || "";
  document.getElementById("product-category").value =
    product?.category || catalog.defaultCategory || "Brinquedos Sensoriais";
  document.getElementById("product-price").value =
    product?.price != null ? product.price : "";
  updateProductPriceHint(product);
  document.getElementById("product-badge").value = product?.badge || "";
  document.getElementById("product-image").value =
    product?.image && !product.image.startsWith("data:image/") ? product.image : "";
  document.getElementById("product-featured").checked = Boolean(product?.featured);
  document.getElementById("product-active").checked = product ? isProductActive(product) : true;
  setSelectedAudienceTags(product?.audienceTags || []);
  document.getElementById("product-offer-type").value = product?.offerType || "";
  document.getElementById("product-offer-label").value = product?.offerLabel || "";
  updateOfferLabelVisibility();
  document.getElementById("product-description").value = product?.description || "";
  document.getElementById("product-benefit").value = product?.benefit || "";

  if (product?.image) {
    showImagePreview(product.image);
    if (product.image.startsWith("data:image/")) {
      uploadedImageData = product.image;
    }
  }

  document.getElementById("admin-product-modal").showModal();
};

const saveProductFromForm = (event) => {
  event.preventDefault();
  const priceRaw = document.getElementById("product-price").value.trim();
  const audienceTags = getSelectedAudienceTags();
  const offerType = document.getElementById("product-offer-type").value;
  const offerLabel = document.getElementById("product-offer-label").value.trim();

  const existing = editingProductId
    ? catalog.products.find((item) => item.id === editingProductId)
    : null;

  const productData = {
    id: editingProductId || `item-${Date.now()}`,
    projetoId: existing?.projetoId,
    name: document.getElementById("product-name").value.trim(),
    code: document.getElementById("product-code").value.trim(),
    subtitle: document.getElementById("product-subtitle").value.trim() || undefined,
    category: document.getElementById("product-category").value.trim(),
    price: priceRaw ? Number(priceRaw) : null,
    badge: document.getElementById("product-badge").value.trim() || undefined,
    audienceTags: audienceTags.length ? audienceTags : undefined,
    offerType: offerType || undefined,
    offerLabel: offerType && offerLabel ? offerLabel : undefined,
    image:
      uploadedImageData ||
      document.getElementById("product-image").value.trim() ||
      null,
    featured: document.getElementById("product-featured").checked,
    active: document.getElementById("product-active").checked,
    description: document.getElementById("product-description").value.trim(),
    benefit: document.getElementById("product-benefit").value.trim() || undefined,
  };

  if (editingProductId) {
    catalog.products = catalog.products.map((item) =>
      item.id === editingProductId ? productData : item
    );
  } else {
    catalog.products.push(productData);
  }

  saveCatalog(catalog);
  renderProductsTable();
  populateFeaturedProductSelect();
  updateBackupButton();
  document.getElementById("admin-product-modal").close();
  showAlert("Produto salvo localmente. Clique em Publicar catálogo para atualizar o site.");
};

const getGestaoApiUrl = () =>
  localStorage.getItem(GESTAO_API_KEY) || DEFAULT_GESTAO_API_URL;

const fillGestaoForm = () => {
  const apiInput = document.getElementById("gestao-api-url");
  const autoSync = document.getElementById("gestao-auto-sync");
  if (apiInput) apiInput.value = getGestaoApiUrl();
  if (autoSync) autoSync.checked = localStorage.getItem(GESTAO_AUTO_SYNC_KEY) === "1";
};

const runGestaoSync = async ({ silent = false } = {}) => {
  const apiUrl = getGestaoApiUrl().trim();
  if (!apiUrl) {
    showAlert("Configure a URL da API da gestão em Configurações.", "error");
    return null;
  }

  const button = document.getElementById("sync-gestao-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Importando...";
  }

  try {
    const projetos = await fetchGestaoProjetos(apiUrl);
    const result = syncProjetosToCatalog(catalog, projetos);
    saveCatalog(catalog);
    setProductFilter("inactive");
    focusProductsPanel();
    renderProductsTable();
    populateFeaturedProductSelect();

    const message = `${result.total} projeto(s) na gestão. ${result.added} importado(s) com preço de venda, ${result.updated} atualizado(s), ${result.skipped} já existente(s).`;

    if (result.added > 0) {
      showAlert(`${message} Veja na lista com filtro "Inativos".`);
    } else if (!silent) {
      showAlert(message);
    } else if (result.added === 0 && result.updated === 0) {
      showAlert(
        `${result.total} projeto(s) encontrado(s), mas todos já estavam no catálogo. Use o filtro "Inativos" para revisar.`,
        "error"
      );
    }

    return result;
  } catch (error) {
    showAlert(error.message, "error");
    console.error("Erro na importação da gestão:", error);
    return null;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "↻ Importar da gestão";
    }
  }
};

const maybeAutoSyncGestao = async () => {
  if (localStorage.getItem(GESTAO_AUTO_SYNC_KEY) !== "1") return;
  await runGestaoSync({ silent: true });
};

const showAdminView = async () => {
  const loginView = document.getElementById("login-view");
  const adminView = document.getElementById("admin-view");

  loginView.hidden = true;
  loginView.style.display = "none";
  adminView.hidden = false;
  adminView.style.display = "";

  if (catalog) {
    fillGestaoForm();
    await maybeAutoSyncGestao();
    renderProductsTable();
    fillCompanyForm();
    fillHeroForm();
    updatePublishHint();
    updateBackupButton();
  }
};

const showLoginView = () => {
  const loginView = document.getElementById("login-view");
  const adminView = document.getElementById("admin-view");

  loginView.hidden = false;
  loginView.style.display = "";
  adminView.hidden = true;
  adminView.style.display = "none";
};

const setupLoginForm = () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearLoginError();

    if (!appReady) {
      showLoginError("Aguarde o carregamento do painel e tente novamente.");
      return;
    }

    setLoginLoading(true);

    try {
      await login(
        document.getElementById("login-email").value,
        document.getElementById("login-password").value
      );
      await showAdminView();
    } catch (error) {
      showLoginError(error.message || "Não foi possível entrar.");
    } finally {
      setLoginLoading(false);
    }
  });
};

const setupAdminEvents = () => {
  document.getElementById("logout-btn").addEventListener("click", () => {
    logout();
    showLoginView();
  });

  document.querySelectorAll(".admin-nav__item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav__item").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      const panel = button.dataset.panel;
      document.getElementById("products-panel").hidden = panel !== "products";
      document.getElementById("hero-panel").hidden = panel !== "hero";
      document.getElementById("settings-panel").hidden = panel !== "settings";

      const titles = {
        products: "Produtos",
        hero: "Página inicial",
        settings: "Configurações",
      };
      const subtitles = {
        products: "Edite preços, importe da gestão e ative itens para publicar.",
        hero: "Altere textos, foto em destaque e produto do card.",
        settings: "Dados da empresa, gestão TNJ 3D e publicação no GitHub.",
      };

      document.getElementById("panel-title").textContent = titles[panel] || "Admin";
      document.getElementById("panel-subtitle").textContent = subtitles[panel] || "";
    });
  });

  document.getElementById("new-product-btn").addEventListener("click", () => openProductModal());
  document.getElementById("sync-gestao-btn").addEventListener("click", () => runGestaoSync());

  document.querySelectorAll("[data-product-filter]").forEach((button) => {
    button.addEventListener("click", () => setProductFilter(button.dataset.productFilter));
  });

  document.getElementById("product-search").addEventListener("input", (event) => {
    productSearchQuery = event.target.value;
    renderProductsTable();
  });

  document.getElementById("product-form").addEventListener("submit", saveProductFromForm);
  document.getElementById("product-offer-type").addEventListener("change", updateOfferLabelVisibility);
  document.getElementById("add-custom-tag-btn").addEventListener("click", addCustomAudienceTag);
  document.getElementById("custom-tag-label").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomAudienceTag();
    }
  });
  document.getElementById("custom-audience-tags").addEventListener("click", (event) => {
    const button = event.target.closest("[data-custom-tag-index]");
    if (!button) return;
    removeCustomAudienceTag(Number(button.dataset.customTagIndex));
  });
  document.getElementById("product-image-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      uploadedImageData = await compressImageFile(file);
      showImagePreview(uploadedImageData);
      document.getElementById("product-image").value = "";
    } catch (error) {
      resetImagePreview();
      showAlert(error.message, "error");
    }
  });
  document.getElementById("remove-image-btn").addEventListener("click", () => {
    resetImagePreview();
    document.getElementById("product-image").value = "";
  });
  document.getElementById("cancel-product-btn").addEventListener("click", () => {
    document.getElementById("admin-product-modal").close();
  });
  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("admin-product-modal").close();
  });

  document.getElementById("products-table").addEventListener("click", (event) => {
    const editBtn = event.target.closest(".js-edit");
    const deleteBtn = event.target.closest(".js-delete");
    const toggleBtn = event.target.closest(".js-toggle-active");

    if (editBtn) {
      const product = catalog.products.find((item) => item.id === editBtn.dataset.id);
      openProductModal(product);
    }

    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      catalog.products = catalog.products.map((item) =>
        item.id === id ? { ...item, active: !isProductActive(item) } : item
      );
      saveCatalog(catalog);
      renderProductsTable();
      populateFeaturedProductSelect();
      showAlert(isProductActive(catalog.products.find((item) => item.id === id))
        ? "Produto ativado no catálogo."
        : "Produto desativado. Não aparece no site público.");
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!confirm("Excluir este produto?")) return;
      catalog.products = catalog.products.filter((item) => item.id !== id);
      saveCatalog(catalog);
      renderProductsTable();
      showAlert("Produto removido. Publique para atualizar o site.");
    }
  });

  document.getElementById("company-form").addEventListener("submit", (event) => {
    event.preventDefault();
    catalog.company = {
      name: document.getElementById("company-name").value.trim(),
      tagline: document.getElementById("company-tagline").value.trim(),
      whatsapp: document.getElementById("company-whatsapp").value.trim(),
      whatsapp2: document.getElementById("company-whatsapp2").value.trim() || undefined,
      email: document.getElementById("company-email").value.trim(),
      whatsappMessage: document.getElementById("company-message").value.trim(),
    };
    catalog.defaultCategory = document.getElementById("default-category").value.trim();
    saveCatalog(catalog);
    showAlert("Configurações salvas localmente.");
  });

  document.getElementById("hero-form").addEventListener("submit", (event) => {
    event.preventDefault();
    catalog.hero = {
      eyebrow: document.getElementById("hero-eyebrow").value.trim(),
      title: document.getElementById("hero-title").value.trim(),
      description: document.getElementById("hero-description").value.trim(),
      ctaPrimary: document.getElementById("hero-cta-primary").value.trim(),
      ctaSecondary: document.getElementById("hero-cta-secondary").value.trim(),
      image:
        heroUploadedImageData ||
        document.getElementById("hero-image-url").value.trim() ||
        "assets/logo.png",
      featuredProductId: document.getElementById("hero-featured-product").value,
      featuredLabel: document.getElementById("hero-featured-label").value.trim() || "Destaque",
    };
    saveCatalog(catalog);
    showAlert("Página inicial salva. Clique em Publicar catálogo para atualizar o site.");
  });

  document.getElementById("hero-image-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      heroUploadedImageData = await compressImageFile(file);
      showHeroImagePreview(heroUploadedImageData);
      document.getElementById("hero-image-url").value = "";
    } catch (error) {
      resetHeroImagePreview();
      showAlert(error.message, "error");
    }
  });

  document.getElementById("hero-remove-image-btn").addEventListener("click", () => {
    resetHeroImagePreview();
    document.getElementById("hero-image-url").value = "";
  });

  document.getElementById("save-token-btn").addEventListener("click", () => {
    const token = getGitHubToken();
    if (!token) {
      showAlert("Informe um token válido.", "error");
      return;
    }
    showAlert("Token salvo nesta sessão do navegador.");
  });

  document.getElementById("test-github-btn").addEventListener("click", async () => {
    const token = getGitHubToken();
    try {
      const repo = await testGitHubToken(token);
      showAlert(`Token OK! Leitura e escrita confirmadas no repositório ${repo}.`);
    } catch (error) {
      showAlert(error.message, "error");
    }
  });

  document.getElementById("clear-token-btn")?.addEventListener("click", () => {
    clearGitHubToken();
    showAlert("Token removido desta sessão. Cole um token novo e teste novamente.");
  });

  document.getElementById("save-gestao-btn").addEventListener("click", () => {
    const apiUrl = document.getElementById("gestao-api-url").value.trim();
    if (!apiUrl) {
      showAlert("Informe a URL da API da gestão.", "error");
      return;
    }
    localStorage.setItem(GESTAO_API_KEY, apiUrl);
    localStorage.setItem(
      GESTAO_AUTO_SYNC_KEY,
      document.getElementById("gestao-auto-sync").checked ? "1" : "0"
    );
    showAlert("Integração com a gestão salva neste navegador.");
  });

  document.getElementById("test-gestao-btn").addEventListener("click", async () => {
    const apiUrl = document.getElementById("gestao-api-url").value.trim() || getGestaoApiUrl();
    try {
      const projetos = await fetchGestaoProjetos(apiUrl);
      showAlert(`Conexão OK. ${projetos.length} projeto(s) encontrado(s) na gestão.`);
    } catch (error) {
      showAlert(error.message, "error");
    }
  });

  document.getElementById("clear-cache-btn").addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Isso apaga as alterações locais e recarrega o catálogo publicado no site. Deseja continuar?"
    );
    if (!confirmed) return;

    clearCatalogCache();
    catalog = await loadCatalog({ useCache: false });
    renderProductsTable();
    populateFeaturedProductSelect();
    updatePublishHint();
    updateBackupButton();
    showAlert("Cache local limpo. Dados recarregados do arquivo do site.");
  });

  document.getElementById("restore-backup-btn").addEventListener("click", restoreCatalogFromBackup);

  document.getElementById("export-btn").addEventListener("click", () => {
    downloadCatalog(catalog);
    showAlert("Arquivo catalog.json baixado.");
  });

  document.getElementById("publish-btn").addEventListener("click", async () => {
    saveCatalog(catalog);
    const token = getGitHubToken();

    if (token) {
      try {
        const includeInactiveImages = document.getElementById("publish-include-images")?.checked === true;
        const { imageErrors, activeCount, productCount, imagesUploaded } = await publishToGitHub(catalog, token, {
          includeInactiveImages,
        });

        if (imageErrors?.length) {
          showAlert(
            `Catálogo publicado (${activeCount} ativo(s) de ${productCount})! ${imagesUploaded} foto(s) enviada(s), ${imageErrors.length} falhou(aram). O site atualiza sozinho em 1–2 min em ${PUBLIC_SITE_URL}`,
            "success"
          );
        } else {
          showAlert(
            `Catálogo publicado (${activeCount} ativo(s) de ${productCount})! ${imagesUploaded} foto(s) enviada(s). O site atualiza sozinho em 1–2 min — aguarde e atualize a página (Ctrl+Shift+R).`,
            "success"
          );
        }
        updatePublishHint();
        return;
      } catch (error) {
        showAlert(error.message || "Falha ao publicar no GitHub.", "error");
        return;
      }
    }

    downloadCatalog(catalog);
    showAlert(
      "Sem token GitHub: arquivo baixado. Configure o token em Configurações para publicar automaticamente.",
      "error"
    );
  });

  const savedToken = sessionStorage.getItem(TOKEN_KEY);
  if (savedToken) {
    document.getElementById("github-token").value = savedToken;
  }
};

const init = async () => {
  setupLoginForm();
  setLoginLoading(true);

  try {
    catalog = await loadCatalog();
    const serverCatalog = await fetchServerCatalog();
    if (serverCatalog) {
      mergeCatalogPrices(catalog, serverCatalog);
      saveCatalog(catalog);
    }
    appReady = true;
    setupAdminEvents();

    if (isAuthenticated()) {
      await showAdminView();
    } else {
      showLoginView();
    }
  } catch (error) {
    appReady = true;
    showLoginError("Erro ao carregar catálogo. Recarregue a página.");
    console.error(error);
  } finally {
    setLoginLoading(false);
  }
};

init();
