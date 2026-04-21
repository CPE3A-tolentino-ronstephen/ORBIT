import { useState, useEffect, useCallback } from "react";
import { DiseaseAPI } from "../services/api";

export function useDisease(disease = "covid19") {
  const [global,     setGlobal]     = useState(null);
  const [countries,  setCountries]  = useState([]);
  const [historical, setHistorical] = useState(null);
  const [continents, setContinents] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, c, h] = await Promise.all([
        DiseaseAPI.getGlobal(disease).catch(() => null),
        DiseaseAPI.getCountries(disease),
        DiseaseAPI.getHistorical(disease, 30).catch(() => null),
      ]);
      setGlobal(g);
      setCountries(Array.isArray(c) ? c : []);
      setHistorical(h);
      DiseaseAPI.getContinents(disease)
        .then(d => setContinents(Array.isArray(d) ? d : []))
        .catch(() => setContinents([]));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, [disease]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectCountry = useCallback(async (countryId) => {
    try {
      const data = await DiseaseAPI.getCountry(disease, countryId);
      setSelected(data);
    } catch (e) {
      console.error("selectCountry:", e.message);
    }
  }, [disease]);

  return {
    global, countries, historical, continents,
    selected, loading, error,
    selectCountry, refetch: fetchAll,
    clearSelected: () => setSelected(null),
  };
}
