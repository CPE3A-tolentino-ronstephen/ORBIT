import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 20_000, 
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("orbit_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const OWID_DISEASES = new Set([
  "tuberculosis",
  "malaria",
  "hiv",
  "mpox",
  "cholera",
  "measles",
]);

export function isOwidDisease(disease) {
  return OWID_DISEASES.has(disease?.toLowerCase());
}

export const DiseaseAPI = {
  getSources: () =>
    http.get("/disease/sources").then((r) => r.data),

  getGlobal: (disease) =>
    http.get(`/disease/${disease}/global`).then((r) => r.data),

  getCountries: (disease) =>
    http.get(`/disease/${disease}/countries`).then((r) => r.data),

  getCountry: (disease, countryId) =>
    http.get(`/disease/${disease}/country/${countryId}`).then((r) => r.data),

  getHistorical: (disease, options = {}) => {
    if (isOwidDisease(disease)) {
      const entity = options.entity ?? "World";
      return http
        .get(`/disease/${disease}/historical?entity=${encodeURIComponent(entity)}`)
        .then((r) => r.data);
    }
    const days = options.days ?? 30;
    return http
      .get(`/disease/${disease}/historical?days=${days}`)
      .then((r) => r.data);
  },
  getDeathRate: (disease) => {
    if (!isOwidDisease(disease)) return Promise.resolve(null);
    return http
      .get(`/disease/${disease}/deathrate`)
      .then((r) => r.data)
      .catch((err) => {
        if (err.response?.status === 404) return null;
        throw err;
      });
  },

  getContinents: (disease) => {
    if (isOwidDisease(disease)) return Promise.resolve([]);
    return http.get(`/disease/${disease}/continents`).then((r) => r.data);
  },
};

export const AuthAPI = {
  verify: (idToken) =>
    http.post("/auth/verify", { idToken }).then((r) => r.data),
  me: () =>
    http.get("/auth/me").then((r) => r.data),
};