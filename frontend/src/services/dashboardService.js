import api from "./api";

export const dashboardService = {
  stats: () => api.get("/dashboard/stats"),
  revenue: () => api.get("/dashboard/revenue"),
  pipeline: () => api.get("/dashboard/pipeline"),
  recentDeals: () => api.get("/dashboard/recent-deals"),
  activity: () => api.get("/dashboard/activity"),
};
