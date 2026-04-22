const express = require("express");
const axios   = require("axios");
const {
  SOURCES,
  computeRiskScore,
  getRiskLabel,
} = require("../config/dataSources");
 
const router = express.Router();
const cache    = new Map();
const CACHE_TTL = 5 * 60 * 1000;
 
function fromCache(key) {
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiry) return hit.data;
  return null;
}
function toCache(key, data) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}
 
function resolveEndpoint(template, params = {}) {
  return Object.entries(params).reduce(
    (url, [k, v]) => url.replace(`:${k}`, encodeURIComponent(String(v))),
    template
  );
}

function isLegacySource(disease) {
  return disease === "covid19";
}
 
async function fetchLegacy(disease, endpoint, params = {}) {
  const src = SOURCES[disease];
  if (!src?.endpoints) {
    throw Object.assign(new Error(`No legacy endpoints for: ${disease}`), { status: 400 });
  }
 
  const tpl = src.endpoints[endpoint];
  if (!tpl) return null;
 
  const path = resolveEndpoint(tpl, params);
  const url  = src.baseUrl + path;
 
  const cached = fromCache(url);
  if (cached) return cached;
 
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { Accept: "application/json" },
  });
 
  let rawItems;
  if (data && Array.isArray(data.value)) rawItems = data.value;
  else if (Array.isArray(data))           rawItems = data;
  else                                    rawItems = null;
 
  let normalized;
  if (rawItems) {
    normalized = rawItems
      .map(item => {
        try {
          const rec      = src.transform(item);
          rec.riskScore  = computeRiskScore(rec);
          rec.risk       = getRiskLabel(rec.riskScore);
          return rec;
        } catch { return null; }
      })
      .filter(r => r && (r.cases > 0 || r.casesPerMillion > 0));
  } else {
    normalized            = src.transform(data);
    normalized.riskScore  = computeRiskScore(normalized);
    normalized.risk       = getRiskLabel(normalized.riskScore);
  }
 
  toCache(url, normalized);
  return normalized;
}
 
async function fetchOwid(disease, method, arg) {
  const src = SOURCES[disease];
  if (!src) throw Object.assign(new Error(`Unknown disease: ${disease}`), { status: 400 });
  if (typeof src[method] !== "function") return null;
 
  const data = await src[method](arg);
 
  if (Array.isArray(data)) {
    return data.map(r => ({ ...r, riskScore: computeRiskScore(r), risk: getRiskLabel(computeRiskScore(r)) }));
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const riskScore = computeRiskScore(data);
    return { ...data, riskScore, risk: getRiskLabel(riskScore) };
  }
  return data;
}
 
function handleError(err, _req, res, _next) {
  console.error("[disease.js]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}
 
router.get("/sources", (_req, res) => {
  const sources = Object.entries(SOURCES).map(([key, src]) => {
    const isLegacy = isLegacySource(key);
    return {
      key,
      provider:     src.provider,
      label:        src.label || key,
      dataType:     isLegacy ? "real-time" : "annual",
      endpoints:    isLegacy
        ? Object.keys(src.endpoints)
        : ["global", "countries", "country", "historical", "deathrate"],
      hasDeathRate: isLegacy ? false : !!src.slugs?.deathRate,
    };
  });
  res.json({ sources });
});
 
router.get("/cache/stats", (_req, res) => {
  res.json({ legacyCacheEntries: cache.size });
});
 
router.get("/:disease/global", async (req, res, next) => {
  try {
    const { disease } = req.params;
 
    if (isLegacySource(disease)) {
      const [data, hist] = await Promise.all([
        fetchLegacy(disease, "all"),
        fetchLegacy(disease, "historical", { days: 7 }).catch(() => null),
      ]);

      if (Array.isArray(data)) {
        const total = data.reduce((s, r) => s + (r.cases || 0), 0);
        return res.json({ cases: total, deaths: 0, recovered: 0, active: total,
                          critical: 0, todayCases: 0, todayDeaths: 0 });
      }

      let dataYear = null;
      if (hist?.cases && typeof hist.cases === "object") {
        const dates = Object.keys(hist.cases).sort();
        const lastDateStr = dates[dates.length - 1]; 
        if (lastDateStr) {
          const parsed = new Date(lastDateStr.replace(/\//g, "-"));
          if (!isNaN(parsed.getTime())) dataYear = parsed.getFullYear();
        }
      }

      return res.json({ ...(data || {}), dataYear });
    }
 
    const data = await fetchOwid(disease, "fetchGlobal");
    if (!data) return res.status(404).json({ error: `No global data for: ${disease}` });
    res.json(data);
  } catch (e) { next(e); }
});
 
router.get("/:disease/countries", async (req, res, next) => {
  try {
    const { disease } = req.params;
 
    if (isLegacySource(disease)) {
      const [data, hist] = await Promise.all([
        fetchLegacy(disease, "countries"),
        fetchLegacy(disease, "historical", { days: 7 }).catch(() => null),
      ]);

      if (!data) return res.json([]);

      let dataYear = null;
      if (hist?.cases && typeof hist.cases === "object") {
        const dates = Object.keys(hist.cases).sort();
        const lastDateStr = dates[dates.length - 1];
        if (lastDateStr) {
          const parsed = new Date(lastDateStr.replace(/\//g, "-"));
          if (!isNaN(parsed.getTime())) dataYear = parsed.getFullYear();
        }
      }

      const arr    = Array.isArray(data) ? data : [data];
      const seen   = new Set();
      const deduped = arr
        .filter(c => {
          const key = c.countryCode || c.country;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(c => ({ ...c, dataYear }));

      return res.json(deduped.sort((a, b) => b.cases - a.cases));
    }
 
    const data = await fetchOwid(disease, "fetchCountries");
    res.json(data || []);
  } catch (e) { next(e); }
});
 
router.get("/:disease/country/:id", async (req, res, next) => {
  try {
    const { disease, id } = req.params;
 
    if (isLegacySource(disease)) {
      const data = await fetchLegacy(disease, "country", { id });
      if (!data) return res.status(404).json({ error: "Not found" });
      return res.json(Array.isArray(data) ? (data[0] || {}) : data);
    }
 
    const data = await fetchOwid(disease, "fetchCountry", id);
    if (!data) return res.status(404).json({ error: `Country not found: ${id}` });
    res.json(data);
  } catch (e) { next(e); }
});
 
router.get("/:disease/historical", async (req, res, next) => {
  try {
    const { disease } = req.params;
 
    if (isLegacySource(disease)) {
      const days = req.query.days || 365;
      const data = await fetchLegacy(disease, "historical", { days });
      return res.json(data || {});
    }
 
    const entity = req.query.entity || "World";
    const data   = await fetchOwid(disease, "fetchHistorical", entity);
    res.json(data || []);
  } catch (e) { next(e); }
});
 
router.get("/:disease/continents", async (req, res, next) => {
  try {
    const { disease } = req.params;
 
    if (!isLegacySource(disease)) {
      return res.status(404).json({
        error: "Continent aggregation is not available for OWID diseases. Use /countries.",
      });
    }
 
    const data = await fetchLegacy(disease, "continents");
    if (!data) return res.json([]);
    res.json(Array.isArray(data) ? data : [data]);
  } catch (e) { next(e); }
});
 
router.get("/:disease/deathrate", async (req, res, next) => {
  try {
    const { disease } = req.params;
 
    if (isLegacySource(disease)) {
      return res.status(404).json({ error: "Death rate endpoint not available for COVID-19." });
    }
 
    const src = SOURCES[disease];
    if (!src) return res.status(400).json({ error: `Unknown disease: ${disease}` });
    if (!src.slugs?.deathRate) {
      return res.status(404).json({
        error: `No death rate data available for ${src.label}. ` +
               `Calculate it from /global or /countries (caseFatalityRate field).`,
      });
    }
 
    const data = await src.fetchDeathRate();
    res.json(data || []);
  } catch (e) { next(e); }
});
 
router.use(handleError);
 
module.exports = router;