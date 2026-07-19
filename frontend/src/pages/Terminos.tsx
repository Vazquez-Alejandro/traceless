import { Link } from "react-router-dom";

export default function Terminos() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="font-bold text-xl">TraceLess</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Volver</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-invert">
        <h1>Términos y Condiciones</h1>
        <p className="text-gray-400">Última actualización: julio 2026</p>

        <h2>1. Servicio</h2>
        <p>TraceLess es una herramienta de facturación electrónica que permite generar comprobantes válidos ante ARCA y enviarlos por WhatsApp. El uso de la plataforma implica la aceptación de estos términos.</p>

        <h2>2. Responsabilidad</h2>
        <p>El usuario es el único responsable por la veracidad de los datos ingresados (CUIT, importes, condiciones fiscales). TraceLess actúa como intermediario técnico y no se responsabiliza por errores en la emisión de comprobantes.</p>

        <h2>3. Facturación ante ARCA</h2>
        <p>TraceLess utiliza los servicios web oficiales de ARCA (WSAA + WSFE) para la emisión de facturas electrónicas. No almacenamos ni retransmitimos datos sensibles de facturación más allá de lo necesario para el funcionamiento del servicio.</p>

        <h2>4. Privacidad de datos</h2>
        <p>Los datos personales de clientes y usuarios se almacenan en Supabase (proveedor cloud con certificación SOC 2). No compartimos datos con terceros ni utilizamos la información para fines publicitarios.</p>

        <h2>5. Cancelaciones y reembolsos</h2>
        <p>Las suscripciones se gestionan a través de Lemon Squeezy. Los reembolsos se rigen por la política de dicha plataforma. Ante cualquier inconveniente, contactanos por los canales habilitados.</p>

        <h2>6. Limitación de responsabilidad</h2>
        <p>TraceLess no se responsabiliza por daños directos o indirectos derivados del uso de la plataforma, incluyendo pero no limitado a multas fiscales por uso incorrecto del sistema.</p>
      </main>
      <footer className="border-t border-gray-800/30 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-600">
          TraceLess — © 2026
        </div>
      </footer>
    </div>
  );
}
