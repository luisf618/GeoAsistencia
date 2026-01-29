const EC_TZ = "America/Guayaquil";

// Cache formatters by option key to avoid recreating them every render.
const _cache = new Map();

function _getFormatter({ hour12 = true, showSeconds = true } = {}) {
  const key = `${hour12 ? "12" : "24"}-${showSeconds ? "s" : "m"}`;
  if (_cache.has(key)) return _cache.get(key);

  const fmt = new Intl.DateTimeFormat("es-EC", {
    timeZone: EC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12,
  });

  _cache.set(key, fmt);
  return fmt;
}

export function formatDateTimeEC(iso, opts = {}) {
  if (!iso) return "—";
  try {
    return _getFormatter(opts).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export const EC_TIMEZONE = EC_TZ;


// Date only (EC)
const _cacheDate = new Map();
function _getDateFormatter() {
  const key = "date";
  if (_cacheDate.has(key)) return _cacheDate.get(key);
  const fmt = new Intl.DateTimeFormat("es-EC", {
    timeZone: EC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  _cacheDate.set(key, fmt);
  return fmt;
}

export function formatDateEC(iso) {
  if (!iso) return "—";
  try {
    return _getDateFormatter().format(new Date(iso));
  } catch {
    return String(iso);
  }
}

// Time only (EC)
const _cacheTime = new Map();
function _getTimeFormatter({ hour12 = true, showSeconds = true } = {}) {
  const key = `${hour12 ? "12" : "24"}-${showSeconds ? "s" : "m"}-time`;
  if (_cacheTime.has(key)) return _cacheTime.get(key);
  const fmt = new Intl.DateTimeFormat("es-EC", {
    timeZone: EC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12,
  });
  _cacheTime.set(key, fmt);
  return fmt;
}

export function formatTimeEC(iso, opts = {}) {
  if (!iso) return "—";
  try {
    return _getTimeFormatter(opts).format(new Date(iso));
  } catch {
    return String(iso);
  }
}
