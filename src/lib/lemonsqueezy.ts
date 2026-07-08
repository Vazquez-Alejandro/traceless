const LEMONSQUEEZY_API = "https://api.lemonsqueezy.com/v1"

export async function createCheckout(variantId: string, customData: Record<string, string>) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    throw new Error("LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_STORE_ID not configured")
  }

  const response = await fetch(`${LEMONSQUEEZY_API}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: { embed: true },
          custom_data: customData,
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Lemon Squeezy API error: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  return result.data.attributes.url
}

export const PLANS = {
  free: {
    name: "Free",
    variantId: null,
    searchesPerMonth: 2,
    lettersPerMonth: 0,
    batchDeletion: false,
    monitoring: false,
    darkWebMonitoring: false,
    brokerRemovals: 0,
    maxClients: 1,
    familyMembers: 1,
    corporateSeats: 1,
  },
  basico: {
    name: "Básico",
    variantId: process.env.LEMONSQUEEZY_VARIANT_BASICO,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    darkWebMonitoring: false,
    brokerRemovals: 3,
    maxClients: 1,
    familyMembers: 1,
    corporateSeats: 1,
  },
  pro: {
    name: "Pro",
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    darkWebMonitoring: true,
    brokerRemovals: Infinity,
    maxClients: Infinity,
    familyMembers: 1,
    corporateSeats: 1,
  },
  familia: {
    name: "Familia",
    variantId: process.env.LEMONSQUEEZY_VARIANT_FAMILIAR,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    darkWebMonitoring: true,
    brokerRemovals: Infinity,
    maxClients: 1,
    familyMembers: 5,
    corporateSeats: 1,
  },
  corporativo: {
    name: "Corporativo",
    variantId: process.env.LEMONSQUEEZY_VARIANT_CORPORATIVO,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    darkWebMonitoring: true,
    brokerRemovals: Infinity,
    maxClients: Infinity,
    familyMembers: 1,
    corporateSeats: 25,
  },
} as const

export type PlanType = keyof typeof PLANS
