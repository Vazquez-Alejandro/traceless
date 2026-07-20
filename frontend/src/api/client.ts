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
    return { error: "No autorizado" };
  }

  try {
    const data = await res.json();
    if (!res.ok) {
      return { error: data.detail || `Error ${res.status}` };
    }
    return data;
  } catch {
    const text = await res.text();
    return { error: text || `Error ${res.status}` };
  }
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; name: string }) =>
      request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request("/auth/me"),
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
