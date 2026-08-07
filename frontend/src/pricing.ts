export type PlanPrices = {
  pro: { usd: number; ars: number; name: string; label: string; label_ars: string };
  team: { usd: number; ars: number; name: string; label: string; label_ars: string };
};

export type Pricing = {
  prices: PlanPrices | null;
  tipo_cambio: number | null;
  dolar: string;
};

const BASE_URL = import.meta.env.DEV ? "http://localhost:8002" : "";

let cached: Pricing | null = null;
let cachedAt = 0;
const CACHE_TTL = 1800000; // 30 min

export async function getPricing(): Promise<Pricing> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL) {
    return cached;
  }
  try {
    const res = await fetch(`${BASE_URL}/api/mercadopago/prices`);
    if (res.ok) {
      const data = await res.json();
      cached = data;
      cachedAt = now;
      return data;
    }
  } catch (e) {
    void e;
  }
  return cached ?? { prices: null, tipo_cambio: null, dolar: "oficial" };
}

export function formatARS(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

export function formatUSD(n: number): string {
  return `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}