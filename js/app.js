import { loadPublicCatalog, isProductPublished } from "./catalog-store.js";
import {
  normalizeAudienceTags,
  getAudienceTagLabel,
  renderAudienceTagChip,
} from "./tags.js";
import {
  formatProductPrice,
  getListingActionLabel,
  buildListingQuoteMessage,
} from "./listing.js";
import { getCatalogCategories } from "./categories.js";
import { trackProductClick } from "./analytics.js";
import { DEFAULT_GESTAO_API_URL } from "./gestao-sync.js";

let company = {};
let products = [];
let hero = {};
let defaultCategory = "Brinquedos Sensoriais";
let analyticsEndpoint = "";
let featuredProduct = null;

const state = {
  search: "",
  category: defaultCategory,
  sort: "featured",
};

const formatPrice = (value) => {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const buildWhatsAppLink = (message, phone = company.whatsapp) => {
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
};

const getCategories = () => getCatalogCategories({ products, defaultCategory });

const filterProducts = () => {
  let list = [...products];

  if (state.category !== "all") {
    list = list.filter((product) => {
      const key = (value) =>
        String(value || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{M}/gu, "");
      return key(product.category) === key(state.category);
    });
  }

  if (state.search.trim()) {
    const term = state.search.trim().toLowerCase();
    list = list.filter((product) => {
      const haystack = [
        product.name,
        product.subtitle,
        product.code,
        product.description,
        product.benefit,
        product.category,
        ...(product.audienceTags || []).map((tag) => getAudienceTagLabel(tag)),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  switch (state.sort) {
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      break;
    case "name-desc":
      list.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
      break;
    case "price-asc":
      list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case "price-desc":
      list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      break;
    default:
      list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  return list;
};

const productImageFallback = (name) => {
  const label = encodeURIComponent(name.slice(0, 24));
  return `https://placehold.co/640x480/181c27/5cff8a?text=${label}`;
};

const buildQuoteMessage = (product) => buildListingQuoteMessage(product, formatPrice);

const renderAudienceTags = (tags = []) => {
  const normalized = normalizeAudienceTags(tags);
  if (!normalized.length) return "";

  const chips = normalized.map((tag) => renderAudienceTagChip(tag)).join("");

  return `
    <div class="product-card__tags">
      <span class="product-card__tags-label">Bom para:</span>
      <div class="product-card__tags-list">${chips}</div>
    </div>
  `;
};

const renderOfferBadge = (product) => {
  if (product.listingType === "aluguel") {
    const unitLabels = { hora: "Aluguel / hora", dia: "Aluguel / dia", kit: "Kit para alugar" };
    const label = unitLabels[product.rentalUnit] || "Aluguel";
    return `<span class="product-card__offer product-card__offer--kit">${label}</span>`;
  }

  if (!product.offerType) return "";

  const label =
    product.offerLabel ||
    (product.offerType === "kit" ? "Kit" : "Promoção");

  return `<span class="product-card__offer product-card__offer--${product.offerType}">${label}</span>`;
};

const renderModalPriceBlock = (product) => {
  const modifier = product.offerType ? `modal__price-block--${product.offerType}` : "";
  const offerLabel =
    product.offerLabel ||
    (product.offerType === "kit" ? "Kit especial" : product.offerType === "promocao" ? "Em promoção" : "");

  const offerBanner = product.offerType
    ? `<span class="modal__offer-banner modal__offer-banner--${product.offerType}">${offerLabel}</span>`
    : "";

  return `
    <div class="modal__price-block ${modifier}">
      ${offerBanner}
      <span class="modal__price-label">${product.listingType === "aluguel" ? "Aluguel" : "Valor"}</span>
      <p class="modal__price">${formatProductPrice(product, formatPrice)}</p>
    </div>
  `;
};

const renderProductCard = (product) => {
  const imageSrc = product.image || productImageFallback(product.name);
  const quoteMessage = buildQuoteMessage(product);
  const cardModifier = product.offerType === "promocao" ? " product-card--promocao" : "";
  const priceClass =
    product.listingType === "aluguel"
      ? "product-card__price product-card__price--rental"
      : product.offerType === "promocao"
      ? "product-card__price product-card__price--promo"
      : product.offerType === "kit"
        ? "product-card__price product-card__price--kit"
        : "product-card__price";

  return `
    <article class="product-card${cardModifier}" data-id="${product.id}">
      <div class="product-card__media">
        ${product.badge ? `<span class="product-card__badge">${product.badge}</span>` : ""}
        ${renderOfferBadge(product)}
        <img src="${imageSrc}" alt="${product.name}" loading="lazy" onerror="this.src='${productImageFallback(product.name)}'" />
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__title">${product.name}</h3>
        ${product.subtitle ? `<p class="product-card__subtitle">${product.subtitle}</p>` : ""}
        <p class="product-card__description">${product.description}</p>
        ${renderAudienceTags(product.audienceTags)}
        <div class="product-card__footer">
          <div>
            <span class="${priceClass}">${formatProductPrice(product, formatPrice)}</span>
            <span class="product-card__code">${product.code}</span>
          </div>
          <div class="product-card__actions">
            <button class="icon-btn js-details" data-id="${product.id}" title="Ver detalhes" aria-label="Ver detalhes de ${product.name}">👁</button>
            <a class="btn btn--primary btn--sm" href="${buildWhatsAppLink(quoteMessage)}" target="_blank" rel="noopener noreferrer">${getListingActionLabel(product)}</a>
          </div>
        </div>
      </div>
    </article>
  `;
};

const renderProducts = () => {
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-filters");
  const filtered = filterProducts();

  const hasFilters =
    state.search.trim() !== "" ||
    state.category !== defaultCategory ||
    state.sort !== "featured";

  clearBtn.hidden = !hasFilters;
  count.textContent = `${filtered.length} produto${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = filtered.map(renderProductCard).join("");
};

const openModal = (productId, source = "modal") => {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  trackProductClick(product.id, source, { analyticsEndpoint });

  const modal = document.getElementById("product-modal");
  const body = document.getElementById("modal-body");
  const imageSrc = product.image || productImageFallback(product.name);
  const quoteMessage = buildQuoteMessage(product);

  const modalModifier = product.offerType === "promocao" ? " modal__body--promocao" : "";

  body.innerHTML = `
    <div class="modal__image">
      <img src="${imageSrc}" alt="${product.name}" onerror="this.src='${productImageFallback(product.name)}'" />
    </div>
    <div class="modal__details">
      <span class="eyebrow">${product.category}</span>
      <h3>${product.name}</h3>
      ${product.subtitle ? `<p class="modal__subtitle">${product.subtitle}</p>` : ""}
      <div class="modal__meta">
        <span class="tag">${product.code}</span>
        ${product.badge ? `<span class="tag">${product.badge}</span>` : ""}
        ${
          product.offerType
            ? `<span class="tag tag--${product.offerType}">${product.offerLabel || (product.offerType === "kit" ? "Kit" : "Promoção")}</span>`
            : ""
        }
      </div>
      ${
        product.audienceTags?.length
          ? `<div class="modal__audience-tags">
              <span class="product-card__tags-label">Bom para:</span>
              <div class="product-card__tags-list">
                ${normalizeAudienceTags(product.audienceTags)
                  .map((tag) => renderAudienceTagChip(tag))
                  .join("")}
              </div>
            </div>`
          : ""
      }
      <p class="modal__description">${product.description}</p>
      ${
        product.benefit
          ? `<div class="modal__benefit">
              <h4>Para que serve?</h4>
              <p>${product.benefit}</p>
            </div>`
          : ""
      }
      ${renderModalPriceBlock(product)}
      <a class="btn btn--whatsapp" href="${buildWhatsAppLink(quoteMessage)}" target="_blank" rel="noopener noreferrer">${product.listingType === "aluguel" ? "Solicitar aluguel" : "Solicitar orçamento"}</a>
    </div>
  `;

  body.className = `modal__body${modalModifier}`;
  modal.showModal();
};

const setupCategoryFilters = () => {
  const select = document.getElementById("category-filter");
  const pills = document.getElementById("category-pills");
  const categories = getCategories();

  select.innerHTML = `<option value="all">Todas</option>${categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("")}`;
  select.value = state.category;

  pills.innerHTML = [
    `<button class="pill${state.category === "all" ? " is-active" : ""}" data-category="all" type="button">Todas</button>`,
    ...categories.map(
      (category) =>
        `<button class="pill${state.category === category ? " is-active" : ""}" data-category="${category}" type="button">${category}</button>`
    ),
  ].join("");

  pills.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.category = button.dataset.category;
    select.value = state.category;

    pills.querySelectorAll(".pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.category === state.category);
    });

    renderProducts();
  });
};

const setupHero = () => {
  const stats = document.getElementById("hero-stats");
  featuredProduct =
    products.find((product) => product.id === hero.featuredProductId) ||
    products.find((product) => product.featured) ||
    products[0] ||
    null;

  document.getElementById("hero-eyebrow").textContent = hero.eyebrow || "";
  document.getElementById("hero-title").textContent = hero.title || "";
  document.getElementById("hero-description").textContent = hero.description || "";
  document.getElementById("hero-cta-primary").textContent = hero.ctaPrimary || "Ver catálogo";
  document.getElementById("hero-cta-secondary").textContent = hero.ctaSecondary || "Solicitar orçamento";

  const heroImage = document.getElementById("hero-image");
  const useProductImage = hero.useProductImage !== false;
  const imageSrc =
    useProductImage && featuredProduct?.image
      ? featuredProduct.image
      : hero.image || "assets/logo.png";

  heroImage.src = imageSrc;
  heroImage.alt = featuredProduct?.name || hero.title || "TNJ 3D";
  heroImage.onerror = () => {
    heroImage.src = hero.image || "assets/logo.png";
  };

  const featuredCard = document.getElementById("featured-card");
  const featuredLabel = document.getElementById("featured-label");
  const featuredName = document.getElementById("featured-name");
  const featuredPrice = document.getElementById("featured-price");

  if (featuredProduct) {
    featuredCard.hidden = false;
    featuredLabel.textContent = hero.featuredLabel || "Destaque";
    featuredName.textContent = featuredProduct.name;
    featuredPrice.textContent = formatPrice(featuredProduct.price);
    featuredCard.dataset.productId = featuredProduct.id;
  } else {
    featuredCard.hidden = true;
    featuredLabel.textContent = hero.featuredLabel || "Destaque";
    featuredName.textContent = "—";
    featuredPrice.textContent = "—";
    featuredCard.removeAttribute("data-product-id");
  }

  stats.innerHTML = `
    <div><dt>Produtos</dt><dd>${products.length}</dd></div>
    <div><dt>Categorias</dt><dd>${getCategories().length}</dd></div>
    <div><dt>Atendimento</dt><dd>WhatsApp</dd></div>
  `;
};

const setupContactLinks = () => {
  const message = company.whatsappMessage;
  const customMessage =
    company.customProjectMessage ||
    "Olá! Tenho um projeto personalizado que não está no catálogo TNJ 3D. Gostaria de solicitar um orçamento.";

  document.getElementById("whatsapp-main").href = buildWhatsAppLink(message, company.whatsapp);

  const secondary = document.getElementById("whatsapp-secondary");
  if (company.whatsapp2) {
    secondary.href = buildWhatsAppLink(message, company.whatsapp2);
    secondary.hidden = false;
  } else {
    secondary.hidden = true;
  }

  const customProjectLink = buildWhatsAppLink(customMessage, company.whatsapp);
  document.getElementById("custom-project-btn")?.setAttribute("href", customProjectLink);
  document.getElementById("custom-project-btn")?.setAttribute("target", "_blank");
  document.getElementById("custom-project-btn")?.setAttribute("rel", "noopener noreferrer");

  const customProjectContact = document.getElementById("custom-project-contact");
  if (customProjectContact) {
    customProjectContact.href = customProjectLink;
  }

  document.getElementById("header-cta").href = "#contato";

  const email = company.email || "tnj.3dimpressoes@gmail.com";
  const emailButton = document.getElementById("email-main");
  if (emailButton) {
    emailButton.href = `mailto:${email}`;
    emailButton.textContent = email;
  }
};

const setupMenu = () => {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("mobile-nav");

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    nav.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  });
};

const setupEvents = () => {
  document.getElementById("search-input").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProducts();
  });

  document.getElementById("category-filter").addEventListener("change", (event) => {
    state.category = event.target.value;
    document.querySelectorAll("#category-pills .pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.category === state.category);
    });
    renderProducts();
  });

  document.getElementById("sort-filter").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    state.search = "";
    state.category = defaultCategory;
    state.sort = "featured";
    document.getElementById("search-input").value = "";
    document.getElementById("category-filter").value = defaultCategory;
    document.getElementById("sort-filter").value = "featured";
    document.querySelectorAll("#category-pills .pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.category === defaultCategory);
    });
    renderProducts();
  });

  document.getElementById("product-grid").addEventListener("click", (event) => {
    const button = event.target.closest(".js-details");
    if (!button) return;
    openModal(button.dataset.id, "card");
  });

  document.getElementById("featured-card")?.addEventListener("click", () => {
    if (!featuredProduct) return;
    openModal(featuredProduct.id, "hero");
  });

  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("product-modal").close();
  });
};

const init = async () => {
  try {
    const catalog = await loadPublicCatalog();
    company = catalog.company;
    products = catalog.products.filter(isProductPublished);
    hero = catalog.hero || {};
    defaultCategory = catalog.defaultCategory || "Brinquedos Sensoriais";
    analyticsEndpoint =
      catalog.company?.analyticsEndpoint || catalog.analyticsEndpoint || DEFAULT_GESTAO_API_URL;
    state.category = defaultCategory;
  } catch (error) {
    document.getElementById("results-count").textContent = "Erro ao carregar catálogo.";
    console.error(error);
    return;
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
  setupCategoryFilters();
  setupHero();
  setupContactLinks();
  setupMenu();
  setupEvents();
  renderProducts();
};

init();
