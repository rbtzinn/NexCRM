import api from "./api";

export const tasksService = {
  list: (params) => api.get("/tasks", { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};
