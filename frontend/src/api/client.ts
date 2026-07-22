const BASE_URL = import.meta.env.DEV ? "/api" : "/api";

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

  if (res.status === 401) {
    localStorage.removeItem("token");
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
    list: () => request("/clientes"),
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
    list: () => request("/facturas"),
    create: (data: { cliente_id: string; tipo: number; importe: number; descripcion: string }) =>
      request("/facturas", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request(`/facturas/${id}`),
  },
};
