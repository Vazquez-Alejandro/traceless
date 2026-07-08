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
    priceId: process.env.STRIPE_BASICO_PRICE_ID,
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
    priceId: process.env.STRIPE_PRO_PRICE_ID,
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
    priceId: process.env.STRIPE_FAMILIAR_PRICE_ID,
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
    priceId: process.env.STRIPE_CORPORATIVO_PRICE_ID,
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
