import { useState, useEffect, useCallback } from "react";

const SLIDES = [
  { src: "/carousel/slide-1.webp", fallback: "/carousel/slide-1.png", alt: "TraceLess — Facturá y cobrá tranquilo" },
  { src: "/carousel/slide-2.webp", fallback: "/carousel/slide-2.png", alt: "Ya no entrás a ARCA" },
  { src: "/carousel/slide-3.webp", fallback: "/carousel/slide-3.png", alt: "Con TraceLess facturás y listo" },
  { src: "/carousel/slide-4.webp", fallback: "/carousel/slide-4.png", alt: "Facturas recurrentes automáticas" },
  { src: "/carousel/slide-5.webp", fallback: "/carousel/slide-5.png", alt: "Tu negocio en una mirada" },
  { src: "/carousel/slide-6.webp", fallback: "/carousel/slide-6.png", alt: "Empezá gratis" },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section
      className="py-12 sm:py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative group">
          {/* Slides */}
          <div className="overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/40 shadow-2xl shadow-black/30">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {SLIDES.map((slide, i) => (
                <div key={i} className="w-full flex-shrink-0">
                  <picture>
                    <source srcSet={slide.src} type="image/webp" />
                    <img
                      src={slide.fallback}
                      alt={slide.alt}
                      className="w-full h-auto object-contain"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </picture>
                </div>
              ))}
            </div>
          </div>

          {/* Arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 border border-gray-700/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
            aria-label="Anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 border border-gray-700/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
            aria-label="Siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 h-1.5 bg-blue-500"
                  : "w-1.5 h-1.5 bg-gray-600 hover:bg-gray-500"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
