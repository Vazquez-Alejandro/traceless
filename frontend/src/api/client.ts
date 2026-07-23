const BASE_URL = import.meta.env.DEV ? "/api" : "/api";

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yhulfvhdjezoyuxaxtpn.supabase.co";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && localStorage.getItem("token")) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(`${BASE_URL}${path}`, { ...options, headers }).then((r) => r.json());
      });
    }

    isRefreshing = true;

    const newToken = await refreshAccessToken();
    processQueue(null, newToken);

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      isRefreshing = false;
      if (!retryRes.ok) {
        const errData = await retryRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${retryRes.status}`);
      }
      return retryRes.json();
    }

    isRefreshing = false;
    processQueue(new Error("Token refresh failed"), null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data.detail || `Error ${res.status}`);
  }

  return data;
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; name: string }) =>
      request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request("/auth/me"),
    forgotPassword: (email: string) =>
      request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  },
  clientes: {
    list: (limit = 20, offset = 0) => request(`/clientes?limit=${limit}&offset=${offset}`),
    create: (data: any) =>
      request("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/clientes/${id}`, { method: "DELETE" }),
    importBulk: (data: any[]) =>
      request("/clientes/import", { method: "POST", body: JSON.stringify(data) }),
  },
  facturas: {
    list: (limit = 20, offset = 0, filters?: { cliente_id?: string; estado?: string }) => {
      let url = `/facturas?limit=${limit}&offset=${offset}`;
      if (filters?.cliente_id) url += `&cliente_id=${filters.cliente_id}`;
      if (filters?.estado) url += `&estado=${filters.estado}`;
      return request(url);
    },
    create: (data: { cliente_id: string; tipo: number; importe: number; descripcion: string }) =>
      request("/facturas", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request(`/facturas/${id}`),
    delete: (id: string) =>
      request(`/facturas/${id}`, { method: "DELETE" }),
  },
  notificaciones: {
    list: (limit = 50, offset = 0) => request(`/notificaciones?limit=${limit}&offset=${offset}`),
    count: () => request("/notificaciones/count"),
    markRead: (id: string) => request(`/notificaciones/${id}/read`, { method: "PUT" }),
    markAllRead: () => request("/notificaciones/read-all", { method: "PUT" }),
    delete: (id: string) => request(`/notificaciones/${id}`, { method: "DELETE" }),
  },
};
