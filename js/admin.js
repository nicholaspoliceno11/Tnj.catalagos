import { login, logout, isAuthenticated } from "./auth.js";
import {
  loadCatalog,
  saveCatalog,
  downloadCatalog,
  publishToGitHub,
  compressImageFile,
} from "./catalog-store.js";

const TOKEN_KEY = "tnj3d_github_token";
let catalog = null;
let editingProductId = null;
let appReady = false;
let uploadedImageData = null;
let heroUploadedImageData = null;

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

const renderProductsTable = () => {
  const tbody = document.getElementById("products-table");
  if (!tbody || !catalog) return;

  tbody.innerHTML = catalog.products
    .map(
      (product) => `
      <tr>
        <td><strong>${product.name}</strong></td>
        <td>${product.code}</td>
        <td>${product.category}</td>
        <td>${formatPrice(product.price)}</td>
        <td>
          <div class="admin-table__actions">
            <button class="btn btn--ghost btn--sm js-edit" data-id="${product.id}">Editar</button>
            <button class="btn btn--outline btn--sm js-delete" data-id="${product.id}">Excluir</button>
          </div>
        </td>
      </tr>`
    )
    .join("");
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

const resetImagePreview = () => {
  uploadedImageData = null;
  document.getElementById("product-image-file").value = "";
  document.getElementById("product-image-preview").hidden = true;
  document.getElementById("product-image-preview-img").removeAttribute("src");
};

const showImagePreview = (src) => {
  const preview = document.getElementById("product-image-preview");
  const image = document.getElementById("product-image-preview-img");
  image.src = src;
  preview.hidden = false;
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
  document.getElementById("product-badge").value = product?.badge || "";
  document.getElementById("product-image").value =
    product?.image && !product.image.startsWith("data:image/") ? product.image : "";
  document.getElementById("product-featured").checked = Boolean(product?.featured);
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
  const productData = {
    id: editingProductId || `item-${Date.now()}`,
    name: document.getElementById("product-name").value.trim(),
    code: document.getElementById("product-code").value.trim(),
    subtitle: document.getElementById("product-subtitle").value.trim() || undefined,
    category: document.getElementById("product-category").value.trim(),
    price: priceRaw ? Number(priceRaw) : null,
    badge: document.getElementById("product-badge").value.trim() || undefined,
    image:
      uploadedImageData ||
      document.getElementById("product-image").value.trim() ||
      null,
    featured: document.getElementById("product-featured").checked,
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
  document.getElementById("admin-product-modal").close();
  showAlert("Produto salvo localmente. Clique em Publicar catálogo para atualizar o site.");
};

const showAdminView = () => {
  const loginView = document.getElementById("login-view");
  const adminView = document.getElementById("admin-view");

  loginView.hidden = true;
  loginView.style.display = "none";
  adminView.hidden = false;
  adminView.style.display = "";

  if (catalog) {
    renderProductsTable();
    fillCompanyForm();
    fillHeroForm();
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
      showAdminView();
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
        products: "Edite preços, descrições e adicione novos itens.",
        hero: "Altere textos, foto em destaque e produto do card.",
        settings: "Dados da empresa e publicação no GitHub.",
      };

      document.getElementById("panel-title").textContent = titles[panel] || "Admin";
      document.getElementById("panel-subtitle").textContent = subtitles[panel] || "";
    });
  });

  document.getElementById("new-product-btn").addEventListener("click", () => openProductModal());
  document.getElementById("product-form").addEventListener("submit", saveProductFromForm);
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

    if (editBtn) {
      const product = catalog.products.find((item) => item.id === editBtn.dataset.id);
      openProductModal(product);
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
    const token = document.getElementById("github-token").value.trim();
    if (!token) {
      showAlert("Informe um token válido.", "error");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    showAlert("Token salvo nesta sessão do navegador.");
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    downloadCatalog(catalog);
    showAlert("Arquivo catalog.json baixado.");
  });

  document.getElementById("publish-btn").addEventListener("click", async () => {
    saveCatalog(catalog);
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (token) {
      try {
        await publishToGitHub(catalog, token);
        showAlert("Catálogo publicado no GitHub! O site atualiza em 1–2 minutos.");
        return;
      } catch (error) {
        showAlert(error.message, "error");
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
    appReady = true;
    setupAdminEvents();

    if (isAuthenticated()) {
      showAdminView();
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
