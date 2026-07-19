import { Link } from "react-router-dom";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="font-bold text-xl">TraceLess</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Volver</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-invert">
        <h1>Política de Privacidad</h1>
        <p className="text-gray-400">Última actualización: julio 2026</p>

        <h2>1. Datos que recopilamos</h2>
        <p>Recopilamos la siguiente información:</p>
        <ul>
          <li>Nombre, email y CUIT del usuario</li>
          <li>Datos de clientes que el usuario registra (nombre, CUIT, teléfono, dirección)</li>
          <li>Comprobantes electrónicos emitidos</li>
        </ul>

        <h2>2. Almacenamiento</h2>
        <p>Todos los datos se almacenan en Supabase, plataforma cloud con servidores en Estados Unidos y certificación SOC 2. Los certificados digitales de ARCA se almacenan en variables de entorno cifradas en Vercel.</p>

        <h2>3. Uso de datos</h2>
        <p>Los datos se utilizan exclusivamente para:</p>
        <ul>
          <li>Generar facturas electrónicas ante ARCA</li>
          <li>Enviar comprobantes por WhatsApp al cliente</li>
          <li>Mantener un historial de facturación del usuario</li>
        </ul>
        <p>No utilizamos los datos para publicidad, machine learning ni los compartimos con terceros no esenciales para el servicio.</p>

        <h2>4. WhatsApp</h2>
        <p>Los números de teléfono registrados se utilizan únicamente para enviar comprobantes de facturación mediante WhatsApp Cloud API (Meta). No almacenamos conversaciones ni compartimos los números con Meta más allá del envío del mensaje.</p>

        <h2>5. ARCA/AFIP</h2>
        <p>Los datos de facturación se envían a los servicios web oficiales de ARCA para la emisión de comprobantes electrónicos, según lo requerido por la normativa fiscal argentina.</p>

        <h2>6. Derechos del usuario</h2>
        <p>Podés solicitar la exportación o eliminación de tus datos en cualquier momento escribiendo a nuestro contacto. Damos de baja los datos en un plazo máximo de 30 días hábiles.</p>

        <h2>7. Retención de datos</h2>
        <p>Conservamos los datos mientras la cuenta esté activa. Al cancelar la suscripción, los datos se conservan por 90 días antes de ser eliminados definitivamente.</p>
      </main>
      <footer className="border-t border-gray-800/30 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-600">
          TraceLess — © 2026
        </div>
      </footer>
    </div>
  );
}
