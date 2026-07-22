import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(r => r.json());
      if (res.ok) {
        setToast("Mensaje enviado correctamente. Te responderemos a la brevedad.");
        setForm({ nombre: "", email: "", asunto: "", mensaje: "" });
      } else {
        setError(res.detail || "Error al enviar el mensaje");
      }
    } catch {
      setError("Error de conexión");
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">TraceLess</Link>
          <p className="text-gray-400 text-sm mt-2">Contacto y soporte</p>
        </div>

        {toast && (
          <div className="mb-4 p-3 rounded-xl bg-green-900/30 border border-green-700/30 text-sm text-green-200 text-center">
            {toast}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tu nombre" required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="email" placeholder="Tu email" required value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input type="text" placeholder="Asunto" required value={form.asunto}
            onChange={e => setForm({ ...form, asunto: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <textarea placeholder="Tu mensaje..." required rows={5} value={form.mensaje}
            onChange={e => setForm({ ...form, mensaje: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={sending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all">
            {sending ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-blue-400 hover:underline">Volver al login</Link>
        </p>
      </div>
    </div>
  );
}
