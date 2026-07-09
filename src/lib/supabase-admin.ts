/** @deprecated Use `db` from `@/lib/db` instead. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env vars not configured")
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return client
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as any)[prop]
  },
})
