import { searchEmailXposedOrNot } from "@/lib/xposedornot"
import type { SearchResult } from "@/data/breaches"

export async function searchEmail(email: string): Promise<SearchResult> {
  return searchEmailXposedOrNot(email)
}
