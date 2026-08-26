export const PRESET_AUDIENCE_TAGS = [
  { key: "TDAH", label: "TDAH", color: "#5cff8a" },
  { key: "TEA", label: "TEA", color: "#5ca8ff" },
  { key: "ANSIEDADE", label: "Ansiedade", color: "#c49bff" },
];

const PRESET_BY_KEY = Object.fromEntries(
  PRESET_AUDIENCE_TAGS.map((tag) => [tag.key, tag])
);

const PRESET_BY_LABEL = Object.fromEntries(
  PRESET_AUDIENCE_TAGS.map((tag) => [tag.label.toLowerCase(), tag])
);

export const normalizeAudienceTag = (tag) => {
  if (!tag) return null;

  if (typeof tag === "string") {
    const trimmed = tag.trim();
    if (!trimmed) return null;

    const upper = trimmed.toUpperCase();
    if (PRESET_BY_KEY[upper]) {
      return { ...PRESET_BY_KEY[upper] };
    }

    const byLabel = PRESET_BY_LABEL[trimmed.toLowerCase()];
    if (byLabel) {
      return { ...byLabel };
    }

    return { label: trimmed, color: "#9aa3b2" };
  }

  const label = String(tag.label || "").trim();
  if (!label) return null;

  const preset =
    PRESET_BY_KEY[String(tag.key || "").toUpperCase()] ||
    PRESET_BY_LABEL[label.toLowerCase()];

  return {
    key: preset?.key,
    label: preset?.label || label,
    color: tag.color || preset?.color || "#9aa3b2",
  };
};

export const normalizeAudienceTags = (tags = []) => {
  const seen = new Set();
  const normalized = [];

  for (const tag of tags) {
    const item = normalizeAudienceTag(tag);
    if (!item) continue;

    const dedupeKey = item.key || item.label.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(item);
  }

  return normalized;
};

export const getAudienceTagLabel = (tag) => normalizeAudienceTag(tag)?.label || "";

export const getAudienceTagKey = (tag) => {
  const normalized = normalizeAudienceTag(tag);
  if (!normalized) return "";
  return normalized.key || normalized.label.toLowerCase();
};

export const isPresetAudienceTag = (tag) => Boolean(normalizeAudienceTag(tag)?.key);

export const audienceTagToStorage = (tag) => {
  const normalized = normalizeAudienceTag(tag);
  if (!normalized) return null;

  if (normalized.key) {
    return { key: normalized.key, label: normalized.label, color: normalized.color };
  }

  return { label: normalized.label, color: normalized.color };
};

export const hexToRgba = (hex, alpha = 1) => {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) {
    return `rgba(154, 163, 178, ${alpha})`;
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getAudienceTagStyle = (tag) => {
  const normalized = normalizeAudienceTag(tag);
  if (!normalized) return "";

  const color = normalized.color || "#9aa3b2";
  return [
    `color: ${color}`,
    `border-color: ${hexToRgba(color, 0.45)}`,
    `background: ${hexToRgba(color, 0.14)}`,
  ].join("; ");
};

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const renderAudienceTagChip = (tag) => {
  const normalized = normalizeAudienceTag(tag);
  if (!normalized) return "";

  const className = normalized.key
    ? `product-tag product-tag--${normalized.key.toLowerCase()}`
    : "product-tag product-tag--custom";

  return `<span class="${className}" style="${getAudienceTagStyle(normalized)}">${escapeHtml(normalized.label)}</span>`;
};
