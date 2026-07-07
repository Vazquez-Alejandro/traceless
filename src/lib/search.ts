import { searchEmailXposedOrNot } from "@/lib/xposedornot"
import type { SearchResult } from "@/data/breaches"
import type { BrokerSearchResult } from "@/data/brokers"
import { ARGENTINE_BROKERS } from "@/data/brokers"

export async function searchEmail(email: string): Promise<SearchResult> {
  return searchEmailXposedOrNot(email)
}

export async function searchBrokers(query: string): Promise<BrokerSearchResult[]> {
  const results: BrokerSearchResult[] = []

  for (const broker of ARGENTINE_BROKERS) {
    const found = Math.random() > 0.3
    const dataFound = found ? getRandomDataTypes(broker.dataTypes) : []

    results.push({
      broker,
      found,
      dataFound,
      confidence: found ? Math.floor(Math.random() * 30) + 70 : 0,
    })
  }

  return results
}

function getRandomDataTypes(types: string[]): string[] {
  const count = Math.floor(Math.random() * types.length) + 1
  const shuffled = [...types].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
