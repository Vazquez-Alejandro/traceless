import { neon } from "@neondatabase/serverless"

let _sql: any = null
function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL not configured")
    _sql = neon(url)
  }
  return _sql
}

interface QueryBuilder {
  _table: string
  _operation: "select" | "insert" | "update" | "upsert" | "delete"
  _data?: any
  _filters: { column: string; op: string; value: any }[]
  _single: boolean
  _columns: string
  _order?: { column: string; ascending: boolean }
  _limit?: number
  _onConflict?: string
  _count?: string
  _head?: boolean
}

function createBuilder(table: string, operation: "select" | "insert" | "update" | "upsert" | "delete"): QueryBuilder {
  return {
    _table: table,
    _operation: operation,
    _filters: [],
    _single: false,
    _columns: "*",
    _onConflict: "id",
    _head: false,
  }
}

function buildQuery(builder: QueryBuilder): { text: string; values: any[] } {
  const values: any[] = []
  let paramIndex = 1

  const whereClause = builder._filters.length > 0
    ? " WHERE " + builder._filters.map(f => {
        if (f.op === "is" && f.value === null) {
          return `${f.column} IS NULL`
        }
        if (f.op === "neq") {
          values.push(f.value)
          return `${f.column} != $${paramIndex++}`
        }
        if (f.op === "gt") {
          values.push(f.value)
          return `${f.column} > $${paramIndex++}`
        }
        if (f.op === "lt") {
          values.push(f.value)
          return `${f.column} < $${paramIndex++}`
        }
        if (f.op === "gte") {
          values.push(f.value)
          return `${f.column} >= $${paramIndex++}`
        }
        if (f.op === "lte") {
          values.push(f.value)
          return `${f.column} <= $${paramIndex++}`
        }
        if (f.op === "like") {
          values.push(f.value)
          return `${f.column} LIKE $${paramIndex++}`
        }
        if (f.op === "in") {
          const placeholders = f.value.map(() => `$${paramIndex++}`).join(", ")
          values.push(...f.value)
          return `${f.column} IN (${placeholders})`
        }
        values.push(f.value)
        return `${f.column} = $${paramIndex++}`
      }).join(" AND ")
    : ""

  switch (builder._operation) {
    case "select": {
      const orderClause = builder._order
        ? ` ORDER BY ${builder._order.column} ${builder._order.ascending ? "ASC" : "DESC"}`
        : ""
      const limitClause = builder._limit ? ` LIMIT ${builder._limit}` : ""
      if (builder._head) {
        return {
          text: `SELECT COUNT(*)::int as count FROM ${builder._table}${whereClause}`,
          values,
        }
      }
      return {
        text: `SELECT ${builder._columns} FROM ${builder._table}${whereClause}${orderClause}${limitClause}`,
        values,
      }
    }
    case "insert": {
      const keys = Object.keys(builder._data)
      const placeholders = keys.map(() => `$${paramIndex++}`).join(", ")
      values.push(...Object.values(builder._data))
      return {
        text: `INSERT INTO ${builder._table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values,
      }
    }
    case "update": {
      const keys = Object.keys(builder._data)
      const setClause = keys.map(k => `${k} = $${paramIndex++}`).join(", ")
      values.push(...Object.values(builder._data))
      return {
        text: `UPDATE ${builder._table} SET ${setClause}${whereClause} RETURNING *`,
        values,
      }
    }
    case "upsert": {
      const keys = Object.keys(builder._data)
      const placeholders = keys.map(() => `$${paramIndex++}`).join(", ")
      const updateClause = keys.map(k => `${k} = EXCLUDED.${k}`).join(", ")
      values.push(...Object.values(builder._data))
      const conflictCols = builder._onConflict || "id"
      return {
        text: `INSERT INTO ${builder._table} (${keys.join(", ")}) VALUES (${placeholders}) ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateClause} RETURNING *`,
        values,
      }
    }
    case "delete": {
      return {
        text: `DELETE FROM ${builder._table}${whereClause} RETURNING *`,
        values,
      }
    }
  }
}

function chainMethods(builder: QueryBuilder) {
  const chain = {
    select(columns = "*", options?: { count?: string; head?: boolean }) {
      builder._operation = "select"
      builder._columns = columns
      if (options?.count) builder._count = options.count
      if (options?.head) builder._head = true
      return chain
    },
    eq(column: string, value: any) {
      builder._filters.push({ column, op: "eq", value })
      return chain
    },
    neq(column: string, value: any) {
      builder._filters.push({ column, op: "neq", value })
      return chain
    },
    gt(column: string, value: any) {
      builder._filters.push({ column, op: "gt", value })
      return chain
    },
    lt(column: string, value: any) {
      builder._filters.push({ column, op: "lt", value })
      return chain
    },
    gte(column: string, value: any) {
      builder._filters.push({ column, op: "gte", value })
      return chain
    },
    lte(column: string, value: any) {
      builder._filters.push({ column, op: "lte", value })
      return chain
    },
    like(column: string, value: any) {
      builder._filters.push({ column, op: "like", value })
      return chain
    },
    in(column: string, values: any[]) {
      builder._filters.push({ column, op: "in", value: values })
      return chain
    },
    is(column: string, value: null) {
      builder._filters.push({ column, op: "is", value })
      return chain
    },
    order(column: string, opts?: { ascending?: boolean }) {
      builder._order = { column, ascending: opts?.ascending ?? true }
      return chain
    },
    limit(n: number) {
      builder._limit = n
      return chain
    },
    single() {
      builder._single = true
      return chain
    },
    maybeSingle() {
      builder._single = true
      return chain
    },
    async then(resolve: (value: { data: any; error: any; count?: number }) => void, reject?: (reason: any) => void) {
      try {
        const { text, values } = buildQuery(builder)
        const result = await getSql()(text, values)
        if (builder._head) {
          resolve({ data: null, error: null, count: result[0]?.count ?? 0 })
        } else if (builder._single) {
          resolve({ data: result[0] || null, error: null })
        } else {
          resolve({ data: result, error: null })
        }
      } catch (error: any) {
        if (reject) reject(error)
        else resolve({ data: null, error: { message: error.message } })
      }
    },
  }
  return chain
}

export const db = {
  from(table: string) {
    return {
      select(columns = "*", options?: { count?: string; head?: boolean }) {
        const builder = createBuilder(table, "select")
        builder._columns = columns
        if (options?.count) builder._count = options.count
        if (options?.head) builder._head = true
        return chainMethods(builder)
      },
      insert(data: any) {
        const builder = createBuilder(table, "insert")
        builder._data = data
        return chainMethods(builder)
      },
      update(data: any) {
        const builder = createBuilder(table, "update")
        builder._data = data
        return chainMethods(builder)
      },
      upsert(data: any, options?: { onConflict?: string }) {
        const builder = createBuilder(table, "upsert")
        builder._data = data
        if (options?.onConflict) {
          builder._onConflict = options.onConflict
        }
        return chainMethods(builder)
      },
      delete() {
        return chainMethods(createBuilder(table, "delete"))
      },
    }
  },
  raw: (...args: any[]) => getSql()(...args),
}
