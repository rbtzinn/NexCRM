import api from "./api";

export const searchService = {
  global: (query) => api.get("/search/global", { params: { q: query } }),
};
