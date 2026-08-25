import { login, logout, isAuthenticated } from "./auth.js";
import {
  loadCatalog,
  saveCatalog,
  downloadCatalog,
  publishToGitHub,
} from "./catalog-store.js";

const TOKEN_KEY = "tnj3d_github_token";
let catalog = null;
let editingProductId = null;
let appReady = false;

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
  document.getElementById("company-email").value = catalog.company.email;
  document.getElementById("company-message").value = catalog.company.whatsappMessage || "";
  document.getElementById("default-category").value = catalog.defaultCategory || "";
};

const openProductModal = (product = null) => {
  editingProductId = product?.id || null;
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
  document.getElementById("product-image").value = product?.image || "";
  document.getElementById("product-featured").checked = Boolean(product?.featured);
  document.getElementById("product-description").value = product?.description || "";
  document.getElementById("product-benefit").value = product?.benefit || "";
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
    image: document.getElementById("product-image").value.trim() || null,
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
  document.getElementById("admin-product-modal").close();
  showAlert("Produto salvo localmente. Clique em Publicar catálogo para atualizar o site.");
};

const showAdminView = () => {
  document.getElementById("login-view").hidden = true;
  document.getElementById("admin-view").hidden = false;
  renderProductsTable();
  fillCompanyForm();
};

const showLoginView = () => {
  document.getElementById("login-view").hidden = false;
  document.getElementById("admin-view").hidden = true;
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
      document.getElementById("settings-panel").hidden = panel !== "settings";
      document.getElementById("panel-title").textContent =
        panel === "products" ? "Produtos" : "Configurações";
      document.getElementById("panel-subtitle").textContent =
        panel === "products"
          ? "Edite preços, descrições e adicione novos itens."
          : "Dados da empresa e publicação no GitHub.";
    });
  });

  document.getElementById("new-product-btn").addEventListener("click", () => openProductModal());
  document.getElementById("product-form").addEventListener("submit", saveProductFromForm);
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
      email: document.getElementById("company-email").value.trim(),
      whatsappMessage: document.getElementById("company-message").value.trim(),
    };
    catalog.defaultCategory = document.getElementById("default-category").value.trim();
    saveCatalog(catalog);
    showAlert("Configurações salvas localmente.");
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
