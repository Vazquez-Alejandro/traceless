import { useState } from "react";

const STEPS = [
  {
    icon: "🧾",
    title: "Emití facturas en 10 segundos",
    desc: "Seleccioná un cliente, poné el monto y listo. TraceLess se encarga de ARCA, el PDF y el envío.",
    color: "from-blue-600/20 to-blue-900/20",
    border: "border-blue-500/20",
  },
  {
    icon: "📨",
    title: "Enviá por WhatsApp al toque",
    desc: "Las facturas se envían solas por WhatsApp al cliente. Sin copiar, sin pegar, sin abrir otra app.",
    color: "from-green-600/20 to-green-900/20",
    border: "border-green-500/20",
  },
  {
    icon: "💳",
    title: "Cobrá online o presencial",
    desc: "Cada factura genera un link de MercadoPago y un QR para transferencia. El cliente elige cómo pagar.",
    color: "from-purple-600/20 to-purple-900/20",
    border: "border-purple-500/20",
  },
  {
    icon: "🔔",
    title: "No te olvidés de cobrar",
    desc: "Recordatorios automáticos los lunes. Si ARCA se cae, reintenta solo. Vos tranquilo.",
    color: "from-yellow-600/20 to-yellow-900/20",
    border: "border-yellow-500/20",
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleComplete = () => {
    localStorage.setItem("onboarding_done", "1");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md">
        <div className={`rounded-3xl bg-gray-900 border ${s.border} p-8 text-center transition-all duration-300`}>
          <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-4xl mb-6`}>
            {s.icon}
          </div>
          <h2 className="text-xl font-bold text-white mb-3">{s.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">{s.desc}</p>

          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-blue-500" : i < step ? "w-4 bg-blue-500/40" : "w-4 bg-gray-700"}`} />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition">
                Atrás
              </button>
            )}
            <button
              onClick={() => isLast ? handleComplete() : setStep(step + 1)}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
            >
              {isLast ? "Empezar a facturar" : "Siguiente"}
            </button>
          </div>

          {!isLast && (
            <button onClick={handleComplete} className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition">
              Saltar intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
