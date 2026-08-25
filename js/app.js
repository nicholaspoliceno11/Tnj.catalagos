import { loadCatalog } from "./catalog-store.js";

let company = {};
let products = [];
let hero = {};
let defaultCategory = "Brinquedos Sensoriais";

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

const getCategories = () =>
  [...new Set(products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

const filterProducts = () => {
  let list = [...products];

  if (state.category !== "all") {
    list = list.filter((product) => product.category === state.category);
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
        ...(product.audienceTags || []),
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

const buildQuoteMessage = (product) => {
  const priceText = product.price != null ? ` — ${formatPrice(product.price)}` : "";
  return `Olá! Tenho interesse no produto *${product.name}* (${product.code})${priceText}. Poderia me enviar um orçamento?`;
};

const AUDIENCE_TAG_LABELS = {
  TDAH: "TDAH",
  TEA: "TEA",
  ANSIEDADE: "Ansiedade",
};

const renderAudienceTags = (tags = []) => {
  if (!tags.length) return "";

  const chips = tags
    .map(
      (tag) =>
        `<span class="product-tag product-tag--${tag.toLowerCase()}">${AUDIENCE_TAG_LABELS[tag] || tag}</span>`
    )
    .join("");

  return `
    <div class="product-card__tags">
      <span class="product-card__tags-label">Bom para:</span>
      <div class="product-card__tags-list">${chips}</div>
    </div>
  `;
};

const renderOfferBadge = (product) => {
  if (!product.offerType) return "";

  const label =
    product.offerLabel ||
    (product.offerType === "kit" ? "Kit" : "Promoção");

  return `<span class="product-card__offer product-card__offer--${product.offerType}">${label}</span>`;
};

const renderProductCard = (product) => {
  const imageSrc = product.image || productImageFallback(product.name);
  const quoteMessage = buildQuoteMessage(product);

  return `
    <article class="product-card" data-id="${product.id}">
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
            <span class="product-card__price">${formatPrice(product.price)}</span>
            <span class="product-card__code">${product.code}</span>
          </div>
          <div class="product-card__actions">
            <button class="icon-btn js-details" data-id="${product.id}" title="Ver detalhes" aria-label="Ver detalhes de ${product.name}">👁</button>
            <a class="btn btn--primary btn--sm" href="${buildWhatsAppLink(quoteMessage)}" target="_blank" rel="noopener noreferrer">Orçamento</a>
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

const openModal = (productId) => {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const modal = document.getElementById("product-modal");
  const body = document.getElementById("modal-body");
  const imageSrc = product.image || productImageFallback(product.name);
  const quoteMessage = buildQuoteMessage(product);

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
                ${product.audienceTags
                  .map(
                    (tag) =>
                      `<span class="product-tag product-tag--${tag.toLowerCase()}">${AUDIENCE_TAG_LABELS[tag] || tag}</span>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      <p>${product.description}</p>
      ${
        product.benefit
          ? `<div class="modal__benefit">
              <h4>Para que serve?</h4>
              <p>${product.benefit}</p>
            </div>`
          : ""
      }
      <p class="product-card__price">${formatPrice(product.price)}</p>
      <a class="btn btn--whatsapp" href="${buildWhatsAppLink(quoteMessage)}" target="_blank" rel="noopener noreferrer">Solicitar orçamento</a>
    </div>
  `;

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
  const featuredProduct =
    products.find((product) => product.id === hero.featuredProductId) ||
    products.find((product) => product.featured) ||
    products[0];

  document.getElementById("hero-eyebrow").textContent = hero.eyebrow || "";
  document.getElementById("hero-title").textContent = hero.title || "";
  document.getElementById("hero-description").textContent = hero.description || "";
  document.getElementById("hero-cta-primary").textContent = hero.ctaPrimary || "Ver catálogo";
  document.getElementById("hero-cta-secondary").textContent = hero.ctaSecondary || "Solicitar orçamento";

  const heroImage = document.getElementById("hero-image");
  if (hero.image) {
    heroImage.src = hero.image;
    heroImage.alt = hero.title || "TNJ 3D";
  }

  document.getElementById("featured-label").textContent = hero.featuredLabel || "Destaque";
  document.getElementById("featured-name").textContent = featuredProduct?.name || "—";
  document.getElementById("featured-price").textContent = formatPrice(featuredProduct?.price);

  stats.innerHTML = `
    <div><dt>Produtos</dt><dd>${products.length}</dd></div>
    <div><dt>Categorias</dt><dd>${getCategories().length}</dd></div>
    <div><dt>Atendimento</dt><dd>WhatsApp</dd></div>
  `;
};

const setupContactLinks = () => {
  const message = company.whatsappMessage;
  document.getElementById("whatsapp-main").href = buildWhatsAppLink(message, company.whatsapp);

  const secondary = document.getElementById("whatsapp-secondary");
  if (company.whatsapp2) {
    secondary.href = buildWhatsAppLink(message, company.whatsapp2);
    secondary.hidden = false;
  } else {
    secondary.hidden = true;
  }

  document.getElementById("header-cta").href = "#contato";
  document.getElementById("email-main").href = `mailto:${company.email}`;
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
    openModal(button.dataset.id);
  });

  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("product-modal").close();
  });
};

const init = async () => {
  try {
    const catalog = await loadCatalog();
    company = catalog.company;
    products = catalog.products;
    hero = catalog.hero || {};
    defaultCategory = catalog.defaultCategory || "Brinquedos Sensoriais";
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
