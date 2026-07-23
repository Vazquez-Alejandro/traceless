import { Link } from "react-router-dom";

export default function Terminos() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="text-2xl font-bold">TraceLess</Link>
        
        <h1 className="text-3xl font-bold mt-8 mb-6">Términos y Condiciones</h1>
        <p className="text-sm text-gray-500 mb-8">Última actualización: 23 de julio de 2026</p>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Aceptación</h2>
            <p>Al usar TraceLess, aceptás estos términos. Si no estás de acuerdo, no uses la plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Descripción del servicio</h2>
            <p>TraceLess es una plataforma de facturación electrónica para contribuyentes argentinos. Permite emitir facturas con validez ARCA, enviarlas por WhatsApp y gestionar cobranzas.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Cuentas</h2>
            <p>Te registrás con tu email y contraseña. Sos responsable de mantener la seguridad de tu cuenta. Cada cuenta es para uso personal o de tu negocio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Planes y pagos</h2>
            <p>Los planes gratuitos y pagos se detallan en la página de precios. Los pagos se procesan a través de MercadoPago. Podés cancelar tu suscripción en cualquier momento.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Uso aceptable</h2>
            <p>No podés usar la plataforma para actividades ilegales, enviar spam, o intentar acceder a sistemas ajenos. Nos reservamos el derecho de suspender cuentas que violen estos términos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Datos y privacidad</h2>
            <p>Tus datos de facturación se almacenan de forma segura. No compartimos tu información con terceros excepto cuando es necesario para prestar el servicio (ej: conexión con ARCA).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Disponibilidad</h2>
            <p>Hacemos todo lo posible para que el servicio esté disponible 24/7, pero no garantizamos uptime absoluto. Mantenimientos programados se avisarán con anticipación.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitación de responsabilidad</h2>
            <p>TraceLess no es responsable por pérdidas derivadas del uso de la plataforma. La facturación electrónica depende de ARCA y puede tener intermitencias fuera de nuestro control.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Cambios</h2>
            <p>Podemos actualizar estos términos. Te avisaremos por email o en la plataforma si hay cambios importantes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contacto</h2>
            <p>Para consultas, escribinos a <a href="mailto:soporte@traceless.com.ar" className="text-blue-400 hover:underline">soporte@traceless.com.ar</a></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800">
          <Link to="/register" className="text-blue-400 hover:underline text-sm">← Volver al registro</Link>
        </div>
      </div>
    </div>
  );
}
