const axios = require("axios");
const Papa  = require("papaparse");

const _cache    = new Map();
const _inFlight = new Map();
const CACHE_TTL = 10 * 60 * 1000;  

function _fromCache(key) {
  const hit = _cache.get(key);
  if (hit && Date.now() < hit.expiry) return hit.data;
  return null;
}
function _toCache(key, data) {
  _cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function _deduped(key, producer) {
  const cached = _fromCache(key);
  if (cached) return cached;
  if (_inFlight.has(key)) return _inFlight.get(key);

  const promise = producer()
    .then(data => { _toCache(key, data); _inFlight.delete(key); return data; })
    .catch(err  => { _inFlight.delete(key); throw err; });

  _inFlight.set(key, promise);
  return promise;
}

const OWID_BASE = "https://ourworldindata.org/grapher";
const SKIP_COLS = new Set(["entity", "code", "year"]);

async function fetchOwidCsv(slug) {
  if (!slug) return [];
  const url = `${OWID_BASE}/${slug}.csv?v=1&csvType=full&useColumnShortNames=true`;

  return _deduped(url, async () => {
    try {
      const { data: raw } = await axios.get(url, {
        timeout: 20000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "ORBIT-disease-tracker/1.0",
          Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
        },
        responseType: "text",
        validateStatus: s => s === 200,
      });

      if (typeof raw === "string" && raw.trimStart().startsWith("<!")) {
        console.error(`[OWID] HTML received for slug "${slug}" — slug likely renamed on OWID.`);
        return [];
      }

      const { data: rows, errors } = Papa.parse(raw, {
        header: true, skipEmptyLines: true, dynamicTyping: true,
      });
      if (errors.length) {
        console.warn(`[OWID] Parse warnings for "${slug}":`, errors.slice(0, 3));
      }

      return rows.map(row => {
        const valueKey = Object.keys(row).find(k => !SKIP_COLS.has(k.toLowerCase()));
        const rawVal   = valueKey ? row[valueKey] : null;
        const value =
          rawVal === null || rawVal === undefined || (typeof rawVal === "number" && isNaN(rawVal))
            ? null
            : Number(rawVal);
        return {
          entity: row.Entity ?? row.entity ?? "",
          code:   row.Code   ?? row.code   ?? "",
          year:   row.Year   ?? row.year   ?? 0,
          value,
        };
      }).filter(r => r.entity && r.year);

    } catch (err) {
      console.error(`[OWID] Failed to fetch slug "${slug}": ${err.message}`);
      return [];
    }
  });
}

const GHO_BASE = "https://ghoapi.azureedge.net/api";

async function fetchGhoIndicator(indicatorCode) {
  if (!indicatorCode) return [];

  const url =
    `${GHO_BASE}/${indicatorCode}` +
    `?$filter=SpatialDimType eq 'COUNTRY'` +
    `&$select=SpatialDim,TimeDim,NumericValue,Dim1`;

  return _deduped(url, async () => {
    try {
      const { data } = await axios.get(url, {
        timeout: 25000,
        headers: {
          "User-Agent": "ORBIT-disease-tracker/1.0",
          Accept: "application/json",
        },
        validateStatus: s => s === 200,
      });

      if (!data || !Array.isArray(data.value)) {
        console.error(`[GHO] Unexpected response shape for indicator "${indicatorCode}"`);
        return [];
      }

      const best = new Map();

      for (const row of data.value) {
        const code = row.SpatialDim;
        const year = row.TimeDim;
        const dim1 = row.Dim1;
        const raw  = row.NumericValue;

        if (!code || !year) continue;
        if (dim1 === "MLE" || dim1 === "FMLE") continue;

        const value =
          raw === null || raw === undefined || (typeof raw === "number" && isNaN(raw))
            ? null
            : Number(raw);

        const key      = `${code}|${year}`;
        const existing = best.get(key);

        if (
          !existing ||
          (value !== null && (existing.value === null || value > existing.value))
        ) {
          best.set(key, { code, year: Number(year), value });
        }
      }

      const nameMap = await _fetchGhoCountryNames();

      return Array.from(best.values())
        .map(r => ({
          entity: nameMap.get(r.code) ?? r.code,
          code:   r.code,
          year:   r.year,
          value:  r.value,
        }))
        .filter(r => r.entity && r.year);

    } catch (err) {
      console.error(`[GHO] Failed to fetch indicator "${indicatorCode}": ${err.message}`);
      return [];
    }
  });
}

async function _fetchGhoCountryNames() {
  const url = `${GHO_BASE}/DIMENSION/COUNTRY/DimensionValues`;
  return _deduped(url, async () => {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "ORBIT-disease-tracker/1.0", Accept: "application/json" },
        validateStatus: s => s === 200,
      });
      const map = new Map();
      if (data?.value) {
        for (const c of data.value) {
          if (c.Code && c.Title) map.set(c.Code, c.Title);
        }
      }
      return map;
    } catch (err) {
      console.warn(`[GHO] Country name lookup failed: ${err.message} — using ISO codes as fallback`);
      return new Map();
    }
  });
}

const GHO_CODES = {
  hiv: {
    cases:     "HIV_0000000026",
    deaths:    "HIV_0000000006",
    deathRate: "HIV_0000000007",
  },
  malaria: {
    cases:     "MALARIA_EST_CASES",
    deaths:    "MALARIA_EST_DEATHS",
    deathRate: "MALARIA_MORT_RATE_POIS",
  },
};

const OWID_SLUGS = {
  tuberculosis: {
    cases:     "number-of-tuberculosis-cases",
    deaths:    "tuberculosis-deaths-who",
    deathRate: "tuberculosis-death-rates",
  },
  hiv: {
    cases:     "number-of-new-hiv-infections",
    deaths:    "number-of-deaths-from-hivaids",
    deathRate: "hiv-death-rates",
  },
  malaria: {
    cases:     "malaria-cases-ihme",
    deaths:    "number-of-malaria-deaths",
    deathRate: "malaria-death-rates",
  },
  mpox: {
    cases:     null,
    deaths:    null,
    deathRate: null,
  },
  cholera: {
    cases:     "number-reported-cases-of-cholera",
    deaths:    "number-of-reported-cholera-deaths",
    deathRate: null,
  },
  measles: {
    cases:     "reported-cases-of-measles",
    deaths:    "measles-deaths",
    deathRate: "measles-death-rates",
  },
};

function latestYear(rows) {
  if (!rows.length) return { year: null, rows: [] };
  const max = Math.max(...rows.map(r => r.year));
  return { year: max, rows: rows.filter(r => r.year === max) };
}

const AGGREGATE_ENTITIES = new Set([
  "World", "Africa", "Asia", "Europe", "North America",
  "South America", "Oceania", "Americas",
  "Sub-Saharan Africa", "South Asia", "East Asia & Pacific",
  "High-income countries", "Low-income countries",
  "Middle-income countries", "Upper-middle-income countries",
  "Lower-middle-income countries",
]);

function buildGlobal(casesRows, deathsRows) {
  const countryFilter = r => !AGGREGATE_ENTITIES.has(r.entity);
  const { year, rows: cRows } = latestYear(casesRows.filter(countryFilter));

  const dRows = (deathsRows || []).filter(
    r => countryFilter(r) && r.year === year
  );

  const totalCases  = cRows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totalDeaths = dRows.reduce((s, r) => s + (r.value ?? 0), 0);
  const cfr         = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;

  return {
    year,
    cases:            Math.round(totalCases),
    deaths:           Math.round(totalDeaths),
    recovered:        0,
    active:           Math.round(totalCases),
    critical:         0,
    todayCases:       0,
    todayDeaths:      0,
    caseFatalityRate: parseFloat(cfr.toFixed(4)),
    source:           "WHO GHO / OWID",
  };
}

function buildCountries(casesRows, deathsRows) {
  const countryFilter = r => !AGGREGATE_ENTITIES.has(r.entity) && r.code;
  const { year, rows: cRows } = latestYear(casesRows.filter(countryFilter));

  const dRows    = (deathsRows || []).filter(r => countryFilter(r) && r.year === year);
  const deathMap = new Map(dRows.map(r => [r.code, r.value ?? 0]));

  return cRows
    .map(r => {
      const cases  = Math.round(r.value  ?? 0);
      const deaths = Math.round(deathMap.get(r.code) ?? 0);
      const cfr    = cases > 0 ? (deaths / cases) * 100 : 0;
      return {
        country:          r.entity,
        countryCode:      r.code,
        cases,
        deaths,
        recovered:        0,
        active:           cases,
        critical:         0,
        todayCases:       0,
        todayDeaths:      0,
        caseFatalityRate: parseFloat(cfr.toFixed(4)),
        casesPerMillion:  0,
        year:             r.year,
        source:           "WHO GHO / OWID",
      };
    })
    .filter(r => r.cases > 0)
    .sort((a, b) => b.cases - a.cases);
}

function buildHistorical(casesRows, deathsRows, entity = "World") {
  const countryFilter = r => !AGGREGATE_ENTITIES.has(r.entity) && r.code;
  const deathByYear = new Map();
  const dWorldRows  = (deathsRows || []).filter(r => r.entity === entity);

  if (dWorldRows.length) {
    for (const r of dWorldRows) {
      deathByYear.set(r.year, (deathByYear.get(r.year) || 0) + (r.value ?? 0));
    }
  } else {
    for (const r of (deathsRows || []).filter(countryFilter)) {
      deathByYear.set(r.year, (deathByYear.get(r.year) || 0) + (r.value ?? 0));
    }
  }

  let cSeries = casesRows.filter(r => r.entity === entity);
  if (!cSeries.length) {
    const byYear = {};
    casesRows
      .filter(countryFilter)
      .forEach(r => { byYear[r.year] = (byYear[r.year] || 0) + (r.value ?? 0); });
    cSeries = Object.entries(byYear).map(([year, value]) => ({ year: +year, value }));
  }

  return cSeries
    .map(r => {
      const cases  = Math.round(r.value ?? 0);
      const deaths = Math.round(deathByYear.get(r.year) ?? 0);
      const cfr    = cases > 0 ? (deaths / cases) * 100 : 0;
      return { year: r.year, cases, deaths, caseFatalityRate: parseFloat(cfr.toFixed(4)) };
    })
    .sort((a, b) => a.year - b.year);
}

function owidSource(label, slugs) {
  return {
    provider: "Our World in Data (OWID)",
    label,
    baseUrl: OWID_BASE,
    slugs,

    async fetchGlobal() {
      const [cRows, dRows] = await Promise.all([
        fetchOwidCsv(slugs.cases),
        slugs.deaths ? fetchOwidCsv(slugs.deaths) : Promise.resolve([]),
      ]);
      return buildGlobal(cRows, dRows);
    },
    async fetchCountries() {
      const [cRows, dRows] = await Promise.all([
        fetchOwidCsv(slugs.cases),
        slugs.deaths ? fetchOwidCsv(slugs.deaths) : Promise.resolve([]),
      ]);
      return buildCountries(cRows, dRows);
    },
    async fetchCountry(id) {
      const countries = await this.fetchCountries();
      const upper = id.toUpperCase();
      return (
        countries.find(c => c.countryCode === upper) ||
        countries.find(c => c.country.toLowerCase() === id.toLowerCase()) ||
        null
      );
    },
    async fetchHistorical(entity = "World") {
      const [cRows, dRows] = await Promise.all([
        fetchOwidCsv(slugs.cases),
        slugs.deaths ? fetchOwidCsv(slugs.deaths) : Promise.resolve([]),
      ]);
      return buildHistorical(cRows, dRows, entity);
    },
    async fetchDeathRate() {
      if (!slugs.deathRate) return null;
      return fetchOwidCsv(slugs.deathRate);
    },
  };
}

function ghoSource(label, ghoCodes, fallbackSlugs) {
  return {
    provider: "WHO Global Health Observatory (GHO)",
    label,
    baseUrl: GHO_BASE,
    ghoCodes,
    fallbackSlugs,

    async _fetchRows() {
      let [cRows, dRows] = await Promise.all([
        fetchGhoIndicator(ghoCodes.cases),
        ghoCodes.deaths ? fetchGhoIndicator(ghoCodes.deaths) : Promise.resolve([]),
      ]);

      if (cRows.length === 0) {
        console.warn(`[GHO] "${label}" cases empty — falling back to OWID`);
        [cRows, dRows] = await Promise.all([
          fetchOwidCsv(fallbackSlugs.cases),
          fallbackSlugs.deaths
            ? fetchOwidCsv(fallbackSlugs.deaths)
            : Promise.resolve([]),
        ]);
      } else if (dRows.length === 0 && fallbackSlugs.deaths) {
        console.warn(`[GHO] "${label}" deaths empty — falling back to OWID for deaths only`);
        dRows = await fetchOwidCsv(fallbackSlugs.deaths);
      }

      return { cRows, dRows };
    },

    async fetchGlobal() {
      const { cRows, dRows } = await this._fetchRows();
      return buildGlobal(cRows, dRows);
    },
    async fetchCountries() {
      const { cRows, dRows } = await this._fetchRows();
      return buildCountries(cRows, dRows);
    },
    async fetchCountry(id) {
      const countries = await this.fetchCountries();
      const upper = id.toUpperCase();
      return (
        countries.find(c => c.countryCode === upper) ||
        countries.find(c => c.country.toLowerCase() === id.toLowerCase()) ||
        null
      );
    },
    async fetchHistorical(entity = "World") {
      const { cRows, dRows } = await this._fetchRows();
      return buildHistorical(cRows, dRows, entity);
    },
    async fetchDeathRate() {
      if (!ghoCodes.deathRate) return null;
      let rows = await fetchGhoIndicator(ghoCodes.deathRate);
      if (!rows.length && fallbackSlugs.deathRate) {
        rows = await fetchOwidCsv(fallbackSlugs.deathRate);
      }
      return rows;
    },
  };
}

const MPOX_CSV_URL =
  "https://raw.githubusercontent.com/owid/monkeypox/main/owid-monkeypox-data.csv";

async function fetchMpoxData() {
  return _deduped(MPOX_CSV_URL, async () => {
    const { data: raw } = await axios.get(MPOX_CSV_URL, {
      timeout: 20000,
      headers: { "User-Agent": "ORBIT-disease-tracker/1.0" },
      responseType: "text",
      validateStatus: s => s === 200,
    });

    const { data: rows } = Papa.parse(raw, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
    });

    const byCountryYear = {};
    for (const row of rows) {
      const iso = row.iso_code;
      if (!iso || iso.startsWith("OWID_") || !row.date) continue;
      const year = Number(String(row.date).slice(0, 4));
      if (!year || isNaN(year)) continue;
      const key    = `${iso}|${year}`;
      const cases  = row.total_cases  ?? 0;
      const deaths = row.total_deaths ?? 0;
      const ex     = byCountryYear[key];
      if (!ex || cases > ex.cases) {
        byCountryYear[key] = { iso, location: row.location, year, cases, deaths };
      }
    }

    return Object.values(byCountryYear);
  });
}

async function warmMpoxCache() {
  console.log("[ORBIT] Warming Mpox cache...");
  try {
    const records = await fetchMpoxData();
    console.log(`[ORBIT] Mpox cache warm — ${records.length} country-year records loaded.`);
  } catch (err) {
    console.warn(`[ORBIT] Mpox cache warm failed: ${err.message}`);
  }
}

async function fetchMpoxCases() {
  const r = await fetchMpoxData();
  return r.map(x => ({ entity: x.location, code: x.iso, year: x.year, value: x.cases }));
}
async function fetchMpoxDeaths() {
  const r = await fetchMpoxData();
  return r.map(x => ({ entity: x.location, code: x.iso, year: x.year, value: x.deaths }));
}

const SOURCES = {
  covid19: {
    provider: "disease.sh",
    label: "COVID-19",
    baseUrl: "https://disease.sh/v3/covid-19",
    endpoints: {
      all:        "/all",
      countries:  "/countries?sort=cases",
      country:    "/countries/:id",
      historical: "/historical/all?lastdays=:days",
      continents: "/continents",
    },
    transform: (raw) => ({
      country:          raw.country             ?? raw.continent ?? "Global",
      countryCode:      raw.countryInfo?.iso2   ?? raw.countryCode ?? "XX",
      lat:              raw.countryInfo?.lat     ?? raw.lat        ?? 0,
      lng:              raw.countryInfo?.long    ?? raw.lng        ?? 0,
      cases:            raw.cases               ?? 0,
      deaths:           raw.deaths              ?? 0,
      recovered:        raw.recovered           ?? 0,
      active:           raw.active              ?? 0,
      critical:         raw.critical            ?? 0,
      casesPerMillion:  raw.casesPerOneMillion  ?? 0,
      deathsPerMillion: raw.deathsPerOneMillion ?? 0,
      updated:          raw.updated             ?? Date.now(),
      todayCases:       raw.todayCases          ?? 0,
      todayDeaths:      raw.todayDeaths         ?? 0,
      flag:             raw.countryInfo?.flag   ?? null,
      continent:        raw.continent           ?? null,
    }),
  },
  covid19_yearly: {
    provider: "disease.sh",
    label: "COVID-19 (Yearly)",
    baseUrl: "https://disease.sh/v3/covid-19",

    async fetchGlobal()      { return null; },
    async fetchCountries()   { return [];   },
    async fetchCountry()     { return null; },
    async fetchDeathRate()   { return null; },
    async fetchHistorical() {
      return _deduped("covid19_yearly_historical", async () => {
        try {
          const { data } = await axios.get(
            "https://disease.sh/v3/covid-19/historical/all?lastdays=all",
            {
              timeout: 20000,
              headers: {
                "User-Agent": "ORBIT-disease-tracker/1.0",
                Accept: "application/json",
              },
              validateStatus: s => s === 200,
            }
          );

          const casesObj  = data?.cases  ?? {};
          const deathsObj = data?.deaths ?? {};
          const byYear = {};

          for (const [dateStr, val] of Object.entries(casesObj)) {
            const year = new Date(dateStr.replace(/\//g, "-")).getFullYear();
            if (!year || isNaN(year)) continue;
            if (!byYear[year]) byYear[year] = { cases: 0, deaths: 0 };
            byYear[year].cases = Math.max(byYear[year].cases, val ?? 0);
          }

          for (const [dateStr, val] of Object.entries(deathsObj)) {
            const year = new Date(dateStr.replace(/\//g, "-")).getFullYear();
            if (!year || isNaN(year)) continue;
            if (!byYear[year]) byYear[year] = { cases: 0, deaths: 0 };
            byYear[year].deaths = Math.max(byYear[year].deaths, val ?? 0);
          }

          return Object.entries(byYear)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, { cases, deaths }]) => ({
              year:             Number(year),
              cases,
              deaths,
              caseFatalityRate: cases > 0
                ? parseFloat(((deaths / cases) * 100).toFixed(4))
                : 0,
            }));

        } catch (err) {
          console.error(`[COVID Yearly] Failed to fetch: ${err.message}`);
          return [];
        }
      });
    },
  },
  tuberculosis: owidSource("Tuberculosis", OWID_SLUGS.tuberculosis),
  hiv: ghoSource("HIV / AIDS", GHO_CODES.hiv, OWID_SLUGS.hiv),
  malaria: ghoSource("Malaria", GHO_CODES.malaria, OWID_SLUGS.malaria),
  mpox: {
    ...owidSource("Mpox", OWID_SLUGS.mpox),
    async fetchGlobal() {
      const [cRows, dRows] = await Promise.all([fetchMpoxCases(), fetchMpoxDeaths()]);
      return buildGlobal(cRows, dRows);
    },
    async fetchCountries() {
      const [cRows, dRows] = await Promise.all([fetchMpoxCases(), fetchMpoxDeaths()]);
      return buildCountries(cRows, dRows);
    },
    async fetchCountry(id) {
      const countries = await this.fetchCountries();
      const upper = id.toUpperCase();
      return (
        countries.find(c => c.countryCode === upper) ||
        countries.find(c => c.country.toLowerCase() === id.toLowerCase()) ||
        null
      );
    },
    async fetchHistorical(entity = "World") {
      const [cRows, dRows] = await Promise.all([fetchMpoxCases(), fetchMpoxDeaths()]);
      return buildHistorical(cRows, dRows, entity);
    },
    async fetchDeathRate() { return null; },
  },
  cholera: owidSource("Cholera", OWID_SLUGS.cholera),
  measles: owidSource("Measles", OWID_SLUGS.measles),
};

function computeRiskScore(record = {}) {
  let score = 0;
  const { cases = 0, deaths = 0, caseFatalityRate = 0 } = record;
  if (cases > 0)  score += Math.min(40, (Math.log10(cases)  / 8) * 40);
  if (deaths > 0) score += Math.min(40, (Math.log10(deaths) / 7) * 40);
  score += Math.min(20, (caseFatalityRate / 10) * 20);
  return Math.round(Math.min(100, score));
}

function getRiskLabel(score) {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Low";
}

module.exports = {
  SOURCES,
  computeRiskScore,
  getRiskLabel,
  fetchOwidCsv,
  fetchGhoIndicator,
  warmMpoxCache,
};