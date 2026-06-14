// Typed wrappers around the UniPlus REST API.
// Endpoint shapes follow the published OpenAPI spec.

import { api } from "./client";
import { API_BASE_URL } from "@/lib/api/client";

// ---------- Auth ----------
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api<{ success: boolean; accessToken: string; refreshToken?: string; user: any }>(`/auth/login`, { method: "POST", body: data }),
  register: (data: { email: string; password: string; nom?: string; prenom?: string }) =>
    api(`/auth/register`, { method: "POST", body: data }),
  refresh: (refreshToken: string) =>
    api<{ success: boolean; accessToken: string }>(`/auth/refresh`, { method: "POST", body: { refreshToken } }),
  profile: () => api<any>(`/auth/profile`),
};

// ---------- Etudiants ----------
export const etudiantsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; statut?: string }) =>
    api<any>(`/etudiants`, { query: params }),
  get: (id: string | number) => api<any>(`/etudiants/${id}`),
  create: (data: any) => api<any>(`/etudiants`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/etudiants/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/etudiants/${id}`, { method: "DELETE" }),
};

// ---------- Departements ----------
export const departementsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api<any>(`/departements`, { query: params }),
  get: (id: string | number) => api<any>(`/departements/${id}`),
  create: (data: any) => api<any>(`/departements`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/departements/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/departements/${id}`, { method: "DELETE" }),
};

// ---------- Filieres ----------
export const filieresApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api<any>(`/filieres`, { query: params }),
  get: (id: string | number) => api<any>(`/filieres/${id}`),
  create: (data: any) => api<any>(`/filieres`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/filieres/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/filieres/${id}`, { method: "DELETE" }),
};

// ---------- Annees scolaires ----------
export const anneesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api<any>(`/annees-scolaires`, { query: params }),
  active: () => api<any>(`/annees-scolaires/active`),
  get: (id: string | number) => api<any>(`/annees-scolaires/${id}`),
  create: (data: any) => api<any>(`/annees-scolaires`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/annees-scolaires/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/annees-scolaires/${id}`, { method: "DELETE" }),
};

// ---------- Semestres ----------
export const semestresApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api<any>(`/semestres`, { query: params }),
  get: (id: string | number) => api<any>(`/semestres/${id}`),
  create: (data: any) => api<any>(`/semestres`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/semestres/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/semestres/${id}`, { method: "DELETE" }),
};

// ---------- Groupes ----------
export const groupesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api<any>(`/groupes`, { query: params }),
  get: (id: string | number) => api<any>(`/groupes/${id}`),
  create: (data: any) => api<any>(`/groupes`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/groupes/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/groupes/${id}`, { method: "DELETE" }),
};

// ---------- Enseignants ----------
export const enseignantsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api<any>(`/enseignants`, { query: params }),
  get: (id: string | number) => api<any>(`/enseignants/${id}`),
  create: (data: any) => api<any>(`/enseignants`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/enseignants/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/enseignants/${id}`, { method: "DELETE" }),
};

// ---------- Unites d'enseignement ----------
export const ueApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api<any>(`/unites-enseignement`, { query: params }),
  get: (id: string | number) => api<any>(`/unites-enseignement/${id}`),
  create: (data: any) => api<any>(`/unites-enseignement`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/unites-enseignement/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/unites-enseignement/${id}`, { method: "DELETE" }),
};

// ---------- Matieres ----------
export const matieresApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api<any>(`/matieres`, { query: params }),
  get: (id: string | number) => api<any>(`/matieres/${id}`),
  create: (data: any) => api<any>(`/matieres`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`/matieres/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`/matieres/${id}`, { method: "DELETE" }),
};

// ---------- Inscriptions ----------
export const inscriptionsApi = {
  list: (params?: { page?: number; limit?: number }) => api<any>(`${API_BASE_URL}/inscriptions`, { query: params }),
  get: (id: string | number) => api<any>(`${API_BASE_URL}/inscriptions/${id}`),
  byGroup: (groupeId: string | number) => api<any>(`${API_BASE_URL}/inscriptions/group/${groupeId}`),
  create: (data: any) => api<any>(`${API_BASE_URL}/inscriptions`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`${API_BASE_URL}/inscriptions/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`${API_BASE_URL}/inscriptions/${id}`, { method: "DELETE" }),
  semesterResult: (inscriptionId: string | number, semestreId: string | number) =>
    api<any>(`${API_BASE_URL}/inscriptions/${inscriptionId}/result/semester/${semestreId}`, { method: "POST" }),
  annualResult: (inscriptionId: string | number, anneeId: string | number) =>
    api<any>(`${API_BASE_URL}/inscriptions/${inscriptionId}/result/annual/${anneeId}`, { method: "POST" }),
};

// ---------- Notes ----------
export const notesApi = {
  create: (data: any) => api<any>(`${API_BASE_URL}/notes`, { method: "POST", body: data }),
  forSemester: (inscriptionId: string | number, semestreId: string | number) =>
    api<any>(`${API_BASE_URL}/notes/inscription/${inscriptionId}/semester/${semestreId}`),
  update: (id: string | number, data: any) => api<any>(`${API_BASE_URL}/notes/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`${API_BASE_URL}/notes/${id}`, { method: "DELETE" }),
  bulkUpsert: (data: any) => api<any>(`${API_BASE_URL}/notes/bulk-upsert`, { method: "POST", body: data }),
};

// ---------- Presences ----------
export const presencesApi = {
  createSheet: (data: any) => api<any>(`${API_BASE_URL}/feuilles-presence`, { method: "POST", body: data }),
  bulk: (data: any) => api<any>(`${API_BASE_URL}/feuilles-presence/bulk-presence`, { method: "POST", body: data }),
  forSheet: (feuilleId: string | number) => api<any>(`${API_BASE_URL}/feuilles-presence/${feuilleId}/presences`),
};

// ---------- Stages ----------
export const stagesApi = {
  list: () => api<any>(`${API_BASE_URL}/stages`),
  get: (id: string | number) => api<any>(`${API_BASE_URL}/stages/${id}`),
  create: (data: any) => api<any>(`${API_BASE_URL}/stages`, { method: "POST", body: data }),
  update: (id: string | number, data: any) => api<any>(`${API_BASE_URL}/stages/${id}`, { method: "PUT", body: data }),
  remove: (id: string | number) => api<void>(`${API_BASE_URL}/stages/${id}`, { method: "DELETE" }),
};

// ---------- Bulletin ----------
export const reportsApi = {
  bulletin: (inscriptionId: string | number, semestreId: string | number) =>
    api<any>(`${API_BASE_URL}/reports/bulletin-semestre/${inscriptionId}/${semestreId}`),
};
