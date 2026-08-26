export const formatProductPrice = (product, formatPrice) => {
  if (product?.listingType === "aluguel") {
    if (product.price == null) return "Aluguel sob consulta";

    const unitLabels = {
      hora: "hora",
      dia: "dia",
      kit: "kit",
    };
    const unit = unitLabels[product.rentalUnit] || "período";
    return `${formatPrice(product.price)} / ${unit}`;
  }

  return formatPrice(product?.price);
};

export const getListingActionLabel = (product) =>
  product?.listingType === "aluguel" ? "Alugar" : "Orçamento";

export const buildListingQuoteMessage = (product, formatPrice) => {
  const isRental = product.listingType === "aluguel";
  const priceText = product.price != null ? ` — ${formatProductPrice(product, formatPrice)}` : "";
  const intent = isRental ? "alugar" : "comprar";
  return `Olá! Tenho interesse em ${intent} *${product.name}* (${product.code})${priceText}. Poderia me enviar um orçamento?`;
};
