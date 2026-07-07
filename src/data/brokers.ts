export interface DataBroker {
  id: string
  name: string
  domain: string
  country: string
  dataTypes: string[]
  removalMethod: "form" | "email" | "phone"
  removalUrl?: string
  removalEmail?: string
  estimatedTime: string
  price: string
  description: string
}

export interface BrokerSearchResult {
  broker: DataBroker
  found: boolean
  dataFound: string[]
  confidence: number
}

export const ARGENTINE_BROKERS: DataBroker[] = [
  {
    id: "dateas",
    name: "Dateas",
    domain: "dateas.com",
    country: "Argentina",
    dataTypes: ["DNI", "CUIL/CUIT", "Domicilio", "Teléfono", "Deudas", "Expedientes judiciales", "Facturas apócrifas", "Beneficios PAMI", "Marcas registradas", "Boletines oficiales"],
    removalMethod: "form",
    removalUrl: "https://www.dateas.com/es/remove/argentina",
    estimatedTime: "24-48 horas",
    price: "$12-15 USD por informe completo",
    description: "Base de datos argentina con información de personas, empresas y expedientes judiciales. 4,714+ búsquedas diarias."
  },
  {
    id: "datacels",
    name: "Datacels",
    domain: "datacels.com.ar",
    country: "Argentina",
    dataTypes: ["DNI", "CUIL/CUIT", "Domicilio", "Teléfono", "Ingresos", "Deudas", "Historial crediticio"],
    removalMethod: "email",
    removalEmail: "baja@datacels.com.ar",
    estimatedTime: "3-5 días hábiles",
    price: "$10-14 USD por informe",
    description: "Base de datos de personas y empresas argentinas. Informes de titularidad, domicilios y situación crediticia."
  },
  {
    id: "busca-datos",
    name: "Busca-datos",
    domain: "busca-datos.com.ar",
    country: "Argentina",
    dataTypes: ["DNI", "CUIL/CUIT", "Domicilio", "Teléfono", "Propiedades", "Causas judiciales", "Infracciones"],
    removalMethod: "email",
    removalEmail: "privacidad@busca-datos.com.ar",
    estimatedTime: "5-10 días hábiles",
    price: "$15,000 ARS por informe",
    description: "Plataforma de búsqueda de datos personales en Argentina. Informes de dominio, personas y empresas."
  },
  {
    id: "buscadatos",
    name: "Buscadatos",
    domain: "buscadatos.com.ar",
    country: "Argentina",
    dataTypes: ["DNI", "CUIL/CUIT", "Domicilio", "Teléfono", "Deudas", "Informes crediticios", "Situación tributaria"],
    removalMethod: "email",
    removalEmail: "contacto@buscadatos.com.ar",
    estimatedTime: "5-10 días hábiles",
    price: "$14,000 ARS por informe",
    description: "Base de datos de personas y empresas. Consultas de deudas, domicilios y situación impositiva."
  }
]

export function getBrokerById(id: string): DataBroker | undefined {
  return ARGENTINE_BROKERS.find(b => b.id === id)
}

export function getBrokerRemovalInstructions(broker: DataBroker): string {
  switch (broker.removalMethod) {
    case "form":
      return `Completá el formulario de baja en ${broker.removalUrl}. Necesitás tu DNI y nombre completo.`
    case "email":
      return `Enviá un email a ${broker.removalEmail} solicitando la eliminación de tus datos personales bajo la Ley 25.326.`
    case "phone":
      return `Llamá al número de contacto de ${broker.name} y solicitá la baja de tus datos.`
    default:
      return `Contactá a ${broker.name} para solicitar la eliminación de tus datos.`
  }
}
