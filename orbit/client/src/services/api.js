import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("orbit_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const DiseaseAPI = {
  getSources: () => http.get("/disease/sources").then((r) => r.data),

  getGlobal: (disease) =>
    http.get(`/disease/${disease}/global`).then((r) => r.data),

  getCountries: (disease) =>
    http.get(`/disease/${disease}/countries`).then((r) => r.data),

  getCountry: (disease, countryId) =>
    http.get(`/disease/${disease}/country/${countryId}`).then((r) => r.data),

  getHistorical: (disease, days = 30) =>
    http.get(`/disease/${disease}/historical?days=${days}`).then((r) => r.data),

  getContinents: (disease) =>
    http.get(`/disease/${disease}/continents`).then((r) => r.data),
};

export const AuthAPI = {
  verify: (idToken) =>
    http.post("/auth/verify", { idToken }).then((r) => r.data),
  me: () =>
    http.get("/auth/me").then((r) => r.data),
};
