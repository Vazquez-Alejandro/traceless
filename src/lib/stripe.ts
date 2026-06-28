import Stripe from "stripe"

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY no está configurada en el entorno")
    }
    stripeInstance = new Stripe(apiKey, {
      typescript: true,
    })
  }
  return stripeInstance
}

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    searchesPerMonth: 3,
    lettersPerMonth: 2,
    batchDeletion: false,
    monitoring: false,
    maxClients: 1,
  },
  premium: {
    name: "Premium",
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    maxClients: 1,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    searchesPerMonth: Infinity,
    lettersPerMonth: Infinity,
    batchDeletion: true,
    monitoring: true,
    maxClients: Infinity,
  },
} as const

export type PlanType = keyof typeof PLANS
