import { useState, useEffect, useCallback } from "react";
import { DiseaseAPI, isOwidDisease }         from "../services/api";

function normaliseOwidHistorical(data) {
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    label:            String(row.year),
    cases:            row.cases            ?? 0,
    deaths:           row.deaths           ?? 0,
    caseFatalityRate: row.caseFatalityRate  ?? 0,
  }));
}

function normaliseCovidHistorical(data) {
  if (!data?.cases || typeof data.cases !== "object") return [];

  const dates      = Object.keys(data.cases).sort();
  const casesMap   = data.cases;
  const deathsMap  = data.deaths ?? {};

  return dates.map((dateStr, i) => {
    const prevDate   = dates[i - 1];
    const rawCases   = casesMap[dateStr]  ?? 0;
    const rawDeaths  = deathsMap[dateStr] ?? 0;
    const prevCases  = prevDate ? (casesMap[prevDate]  ?? 0) : 0;
    const prevDeaths = prevDate ? (deathsMap[prevDate] ?? 0) : 0;

    const cases  = Math.max(0, rawCases  - prevCases);
    const deaths = Math.max(0, rawDeaths - prevDeaths);
    const cfr    = cases > 0 ? parseFloat(((deaths / cases) * 100).toFixed(4)) : 0;
    const d     = new Date(dateStr.replace(/\//g, "-"));
    const label = isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return { label, cases, deaths, caseFatalityRate: cfr };
  });
}

export function useDisease(disease = "covid19", options = {}) {
  const [global,     setGlobal]     = useState(null);
  const [countries,  setCountries]  = useState([]);
  const [historical, setHistorical] = useState([]);  
  const [continents, setContinents] = useState([]);
  const [deathRate,  setDeathRate]  = useState(null); 
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const owid = isOwidDisease(disease) || disease === "covid19_yearly";

  const days   = options.days   ?? 30;
  const entity = options.entity ?? "World";

  const fetchAll = useCallback(async () => {
    if (!disease) return;

    setLoading(true);
    setError(null);

    try {
      const [g, c, h] = await Promise.all([
        DiseaseAPI.getGlobal(disease).catch(() => null),

        DiseaseAPI.getCountries(disease).catch(() => []),

        owid
          ? DiseaseAPI.getHistorical(disease, { entity }).catch(() => null)
          : DiseaseAPI.getHistorical(disease, { days   }).catch(() => null),
      ]);

      setGlobal(g);
      setCountries(Array.isArray(c) ? c : []);

      if (owid) {
        setHistorical(normaliseOwidHistorical(h));
      } else {
        setHistorical(normaliseCovidHistorical(h));
      }

      DiseaseAPI.getContinents(disease)
        .then((d) => setContinents(Array.isArray(d) ? d : []))
        .catch(() => setContinents([]));

      DiseaseAPI.getDeathRate(disease)
        .then((d) => setDeathRate(d))
        .catch(() => setDeathRate(null));

    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load disease data");
      setCountries([]);
      setHistorical([]);
    } finally {
      setLoading(false);
    }
  }, [disease, owid, days, entity]); 
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectCountry = useCallback(
    async (countryId) => {
      if (!disease) return;
      try {
        const data = await DiseaseAPI.getCountry(disease, countryId);
        setSelected(data);
      } catch (e) {
        console.error("selectCountry:", e.message);
      }
    },
    [disease]
  );

  const selectHistorical = useCallback(
    async (entityOrCountryId) => {
      if (!disease) return;
      try {
        const h = owid
          ? await DiseaseAPI.getHistorical(disease, { entity: entityOrCountryId })
          : await DiseaseAPI.getHistorical(disease, { days });

        setHistorical(
          owid
            ? normaliseOwidHistorical(h)
            : normaliseCovidHistorical(h)
        );
      } catch (e) {
        console.error("selectHistorical:", e.message);
      }
    },
    [disease, owid, days]
  );

  return {
    global,
    countries,
    historical,    
    continents,
    deathRate,     
    selected,
    loading,
    error,
    isOwid: owid,
    dataType: owid ? "annual" : "real-time",
    selectCountry,
    selectHistorical,
    refetch:       fetchAll,
    clearSelected: () => setSelected(null),
  };
}