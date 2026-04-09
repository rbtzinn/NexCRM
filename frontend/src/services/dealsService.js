import api from "./api";

export const dealsService = {
  list: (params) => api.get("/deals", { params }),
  get: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post("/deals", data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  delete: (id) => api.delete(`/deals/${id}`),
};
