const products = [
  {
    name: "Kit promocional TNJ",
    category: "Kits",
    code: "KIT-001",
    description: "Conjunto ideal para ações comerciais, brindes e campanhas sazonais.",
    price: "Sob consulta",
    highlight: "Mais pedido",
    initials: "KP",
  },
  {
    name: "Item institucional premium",
    category: "Institucional",
    code: "INS-102",
    description: "Produto de apresentação para clientes estratégicos e parceiros.",
    price: "Sob consulta",
    highlight: "Destaque",
    initials: "IP",
  },
  {
    name: "Pacote para revenda",
    category: "Revenda",
    code: "REV-210",
    description: "Opção com volume maior para negociação comercial e distribuição.",
    price: "Sob consulta",
    highlight: "Atacado",
    initials: "PR",
  },
  {
    name: "Solução corporativa",
    category: "Corporativo",
    code: "COR-330",
    description: "Item recomendado para empresas que precisam de compra recorrente.",
    price: "Sob consulta",
    highlight: "Empresas",
    initials: "SC",
  },
  {
    name: "Combo lançamento",
    category: "Kits",
    code: "KIT-024",
    description: "Seleção de itens para divulgar novidades e aumentar conversões.",
    price: "Sob consulta",
    highlight: "Novo",
    initials: "CL",
  },
  {
    name: "Produto sob encomenda",
    category: "Corporativo",
    code: "COR-415",
    description: "Alternativa personalizável conforme necessidade do pedido.",
    price: "Sob consulta",
    highlight: "Personalizado",
    initials: "PE",
  },
];

const state = {
  category: "Todos",
  search: "",
};

const catalogGrid = document.querySelector("#catalogGrid");
const categoryFilters = document.querySelector("#categoryFilters");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const totalProducts = document.querySelector("[data-total-products]");
const totalCategories = document.querySelector("[data-total-categories]");

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildWhatsAppLink(productName) {
  const message = `Olá, tenho interesse no item "${productName}" do catálogo TNJ. Pode me enviar mais informações?`;
  return `https://wa.me/5500000000000?text=${encodeURIComponent(message)}`;
}

function renderFilters() {
  const categories = ["Todos", ...new Set(products.map((product) => product.category))];

  categoryFilters.innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter-button ${category === state.category ? "is-active" : ""}"
          type="button"
          data-category="${category}"
        >
          ${category}
        </button>
      `,
    )
    .join("");
}

function productMatches(product) {
  const query = normalize(state.search);
  const searchableContent = normalize(
    `${product.name} ${product.category} ${product.code} ${product.description} ${product.highlight}`,
  );

  const categoryMatches = state.category === "Todos" || product.category === state.category;
  const searchMatches = !query || searchableContent.includes(query);

  return categoryMatches && searchMatches;
}

function renderProducts() {
  const filteredProducts = products.filter(productMatches);

  catalogGrid.innerHTML = filteredProducts
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-image" aria-hidden="true">${product.initials}</div>
          <div class="product-meta">
            <span class="tag">${product.category}</span>
            <span class="tag">${product.highlight}</span>
          </div>
          <div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
          </div>
          <div class="product-meta">
            <span class="tag">${product.code}</span>
            <span class="price">${product.price}</span>
          </div>
          <a
            class="button"
            href="${buildWhatsAppLink(product.name)}"
            target="_blank"
            rel="noreferrer"
          >
            Tenho interesse
          </a>
        </article>
      `,
    )
    .join("");

  emptyState.hidden = filteredProducts.length > 0;
}

function setMissingImageFallbacks() {
  const logo = document.querySelector("[data-fallback-logo]");
  const infographic = document.querySelector("[data-fallback-infographic]");

  const markAsMissing = (image, parentSelector) => {
    image.closest(parentSelector).classList.add("is-missing");
  };

  if (logo) {
    logo.addEventListener("error", () => markAsMissing(logo, ".logo-shell"));

    if (logo.complete && logo.naturalWidth === 0) {
      markAsMissing(logo, ".logo-shell");
    }
  }

  if (infographic) {
    infographic.addEventListener("error", () => markAsMissing(infographic, ".infographic-card"));

    if (infographic.complete && infographic.naturalWidth === 0) {
      markAsMissing(infographic, ".infographic-card");
    }
  }
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProducts();
  });

  categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");

    if (!button) {
      return;
    }

    state.category = button.dataset.category;
    renderFilters();
    renderProducts();
  });
}

function init() {
  const categoryCount = new Set(products.map((product) => product.category)).size;

  totalProducts.textContent = products.length;
  totalCategories.textContent = categoryCount;
  setMissingImageFallbacks();
  renderFilters();
  renderProducts();
  bindEvents();
}

init();
