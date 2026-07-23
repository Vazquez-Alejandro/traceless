import { Link } from "react-router-dom";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="text-2xl font-bold">TraceLess</Link>
        
        <h1 className="text-3xl font-bold mt-8 mb-6">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-8">Última actualización: 23 de julio de 2026</p>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Información que recopilamos</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Email y nombre (al registrarte)</li>
              <li>Datos de tus clientes (nombre, CUIT, teléfono)</li>
              <li>Información de facturación (montos, fechas, estados)</li>
              <li>Datos de uso (qué funciones usás, frecuencia)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Cómo usamos tu información</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Para prestar el servicio (emitir facturas, enviar WhatsApp)</li>
              <li>Para enviarte notificaciones importantes</li>
              <li>Para mejorar la plataforma</li>
              <li>Para procesar pagos (a través de MercadoPago)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Compartición de datos</h2>
            <p>No vendemos tu información. Compartimos datos solo cuando:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Es necesario para prestar el servicio (ej: conexión con ARCA)</li>
              <li>Lo requiera la ley</li>
              <li>Uses servicios de terceros integrados (MercadoPago, WhatsApp)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Seguridad</h2>
            <p>Usamos encriptación TLS, autenticación segura y acceso restringido. Ningún sistema es 100% seguro, pero tomamos todas las precauciones razonables.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Retención de datos</h2>
            <p>Mantenemos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, borramos tus datos personales en 30 días. Algunos datos de facturación pueden retenerse por obligación legal.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Tus derechos</h2>
            <p>Podés:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Acceder a tus datos</li>
              <li>Corregir información incorrecta</li>
              <li>Solicitar la eliminación de tu cuenta</li>
              <li>Exportar tus datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies</h2>
            <p>Usamos cookies para mantener tu sesión activa. No usamos cookies de rastreo publicitario.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contacto</h2>
            <p>Para consultas sobre privacidad, escribinos a <a href="mailto:soporte@traceless.com.ar" className="text-blue-400 hover:underline">soporte@traceless.com.ar</a></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800">
          <Link to="/register" className="text-blue-400 hover:underline text-sm">← Volver al registro</Link>
        </div>
      </div>
    </div>
  );
}
