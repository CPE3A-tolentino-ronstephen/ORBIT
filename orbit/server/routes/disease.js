/**
 * ORBIT Disease Routes
 * Handles disease.sh (array/object) and WHO GHO ({ value: [...] }) formats.
 * Gracefully falls back on errors so one broken disease doesn't crash others.
 */
const express = require("express");
const axios   = require("axios");
const { SOURCES, computeRiskScore, getRiskLabel } = require("../config/dataSources");

const router = express.Router();
const cache  = new Map();
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

async function fetchDisease(disease, endpoint, params = {}) {
  const src = SOURCES[disease];
  if (!src) throw Object.assign(new Error(`Unknown disease: ${disease}`), { status: 400 });

  const tpl = src.endpoints[endpoint];
  if (!tpl) return null; // endpoint not supported for this disease

  const path = resolveEndpoint(tpl, params);
  const url  = src.baseUrl + path;

  const cached = fromCache(url);
  if (cached) return cached;

  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { Accept: "application/json" },
  });

  // WHO GHO wraps in { value: [...] }, disease.sh returns array or object
  let rawItems;
  if (data && Array.isArray(data.value)) {
    rawItems = data.value;
  } else if (Array.isArray(data)) {
    rawItems = data;
  } else {
    rawItems = null; // single object
  }

  let normalized;
  if (rawItems) {
    normalized = rawItems
      .map(item => {
        try {
          const rec = src.transform(item);
          rec.riskScore = computeRiskScore(rec);
          rec.risk      = getRiskLabel(rec.riskScore);
          return rec;
        } catch { return null; }
      })
      .filter(r => r && (r.cases > 0 || r.casesPerMillion > 0));
  } else {
    normalized = src.transform(data);
    normalized.riskScore = computeRiskScore(normalized);
    normalized.risk      = getRiskLabel(normalized.riskScore);
  }

  toCache(url, normalized);
  return normalized;
}

// GET /api/disease/sources
router.get("/sources", (_req, res) => {
  res.json({
    sources: Object.entries(SOURCES).map(([key, src]) => ({
      key,
      provider: src.provider,
      label:    src.label || key,
      endpoints: Object.keys(src.endpoints),
    })),
  });
});

// GET /api/disease/:disease/global
router.get("/:disease/global", async (req, res, next) => {
  try {
    const data = await fetchDisease(req.params.disease, "all");
    // If array returned (WHO GHO global), sum it up
    if (Array.isArray(data)) {
      const total = data.reduce((acc, r) => acc + (r.cases || 0), 0);
      return res.json({ cases: total, deaths: 0, recovered: 0, active: total, critical: 0, todayCases: 0, todayDeaths: 0 });
    }
    res.json(data || {});
  } catch (e) { next(e); }
});

// GET /api/disease/:disease/countries
router.get("/:disease/countries", async (req, res, next) => {
  try {
    const data = await fetchDisease(req.params.disease, "countries");
    if (!data) return res.json([]);
    const arr = Array.isArray(data) ? data : [data];
    // Deduplicate by countryCode
    const seen = new Set();
    const deduped = arr.filter(c => {
      const key = c.countryCode || c.country;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json(deduped.sort((a, b) => b.cases - a.cases));
  } catch (e) { next(e); }
});

// GET /api/disease/:disease/country/:id
router.get("/:disease/country/:id", async (req, res, next) => {
  try {
    const data = await fetchDisease(req.params.disease, "country", { id: req.params.id });
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(Array.isArray(data) ? (data[0] || {}) : data);
  } catch (e) { next(e); }
});

// GET /api/disease/:disease/historical?days=365
router.get("/:disease/historical", async (req, res, next) => {
  try {
    const days = req.query.days || 365;
    const data = await fetchDisease(req.params.disease, "historical", { days });
    res.json(data || {});
  } catch (e) { next(e); }
});

// GET /api/disease/:disease/continents
router.get("/:disease/continents", async (req, res, next) => {
  try {
    const data = await fetchDisease(req.params.disease, "continents");
    if (!data) return res.json([]);
    res.json(Array.isArray(data) ? data : [data]);
  } catch (e) { next(e); }
});

router.get("/cache/stats", (_req, res) =>
  res.json({ entries: cache.size })
);

module.exports = router;
