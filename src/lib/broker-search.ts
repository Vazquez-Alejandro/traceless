import { type BrokerSearchResult, ARGENTINE_BROKERS, type DataBroker } from "@/data/brokers"

async function scrapeDateas(query: string): Promise<{ found: boolean; dataFound: string[] }> {
  try {
    const response = await fetch("https://www.dateas.com/es/explore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return { found: false, dataFound: [] }

    const html = await response.text()

    // Check if results contain personal data indicators
    const hasResults = html.includes("resultados") || html.includes("información encontrada")
    const hasDNI = html.includes("DNI") || html.includes("documento")
    const hasPhone = html.includes("teléfono") || html.includes("celular")
    const hasAddress = html.includes("domicilio") || html.includes("dirección")
    const hasDeudas = html.includes("deuda") || html.includes("moroso")

    if (hasResults) {
      const dataFound: string[] = []
      if (hasDNI) dataFound.push("DNI")
      if (hasPhone) dataFound.push("Teléfono")
      if (hasAddress) dataFound.push("Domicilio")
      if (hasDeudas) dataFound.push("Deudas")
      return { found: true, dataFound: dataFound.length > 0 ? dataFound : ["Datos personales"] }
    }

    return { found: false, dataFound: [] }
  } catch {
    return { found: false, dataFound: [] }
  }
}

async function scrapeDatacels(query: string): Promise<{ found: boolean; dataFound: string[] }> {
  try {
    const response = await fetch("https://www.datacels.com.ar/buscar.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: `buscar=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return { found: false, dataFound: [] }

    const html = await response.text()

    const hasResults = html.includes("resultado") || html.includes("encontrado")
    const hasDNI = html.includes("DNI")
    const hasCUIL = html.includes("CUIL") || html.includes("CUIT")
    const hasPhone = html.includes("teléfono")

    if (hasResults && !html.includes("No se encontraron")) {
      const dataFound: string[] = []
      if (hasDNI) dataFound.push("DNI")
      if (hasCUIL) dataFound.push("CUIL/CUIT")
      if (hasPhone) dataFound.push("Teléfono")
      return { found: true, dataFound: dataFound.length > 0 ? dataFound : ["Datos personales"] }
    }

    return { found: false, dataFound: [] }
  } catch {
    return { found: false, dataFound: [] }
  }
}

async function scrapeBuscaDatos(query: string): Promise<{ found: boolean; dataFound: string[] }> {
  try {
    const response = await fetch("https://www.busca-datos.com.ar/buscar.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return { found: false, dataFound: [] }

    const html = await response.text()

    const hasResults = html.includes("resultado") || html.includes("registro")
    const hasPropiedades = html.includes("propiedad") || html.includes("inmueble")
    const hasJudiciales = html.includes("causa") || html.includes("judicial")

    if (hasResults && !html.includes("sin resultados")) {
      const dataFound: string[] = []
      if (hasPropiedades) dataFound.push("Propiedades")
      if (hasJudiciales) dataFound.push("Causas judiciales")
      return { found: true, dataFound: dataFound.length > 0 ? dataFound : ["Datos personales"] }
    }

    return { found: false, dataFound: [] }
  } catch {
    return { found: false, dataFound: [] }
  }
}

async function scrapeBuscadatos(query: string): Promise<{ found: boolean; dataFound: string[] }> {
  try {
    const response = await fetch("https://www.buscadatos.com.ar/consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: `documento=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return { found: false, dataFound: [] }

    const html = await response.text()

    const hasResults = html.includes("resultado") || html.includes("datos encontrados")
    const hasDeudas = html.includes("deuda") || html.includes("negativo")
    const hasCreditos = html.includes("crédito") || html.includes("banco")

    if (hasResults && !html.includes("no se encontraron")) {
      const dataFound: string[] = []
      if (hasDeudas) dataFound.push("Deudas")
      if (hasCreditos) dataFound.push("Historial crediticio")
      return { found: true, dataFound: dataFound.length > 0 ? dataFound : ["Datos personales"] }
    }

    return { found: false, dataFound: [] }
  } catch {
    return { found: false, dataFound: [] }
  }
}

const SCRAPERS: Record<string, (query: string) => Promise<{ found: boolean; dataFound: string[] }>> = {
  "dateas": scrapeDateas,
  "datacels": scrapeDatacels,
  "busca-datos": scrapeBuscaDatos,
  "buscadatos": scrapeBuscadatos,
}

export async function searchBrokersReal(query: string): Promise<BrokerSearchResult[]> {
  const results: BrokerSearchResult[] = []

  for (const broker of ARGENTINE_BROKERS) {
    const scraper = SCRAPERS[broker.id]
    let found = false
    let dataFound: string[] = []

    if (scraper) {
      try {
        const result = await scraper(query)
        found = result.found
        dataFound = result.dataFound
      } catch {
        // Scraping failed, mark as unknown
        found = false
        dataFound = []
      }
    }

    results.push({
      broker,
      found,
      dataFound,
      confidence: found ? 85 : 0,
    })
  }

  return results
}

// Keep the simulate function as fallback
export function simulateBrokerSearch(query: string): BrokerSearchResult[] {
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
