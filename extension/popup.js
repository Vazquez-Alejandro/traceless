async function checkSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = new URL(tab.url)
  const domain = url.hostname

  document.getElementById("domain").textContent = domain

  if (domain === "localhost" || domain === "") {
    document.getElementById("result").innerHTML =
      '<div class="status loading">Extension activa. Navegá a cualquier sitio para verificarlo.</div>'
    return
  }

  document.getElementById("result").innerHTML =
    '<div class="status loading">Verificando dominio...</div>'

  try {
    const res = await fetch(
      `https://traceless.vercel.app/api/empresa?domain=${encodeURIComponent(domain)}`
    )
    if (!res.ok) throw new Error()

    const data = await res.json()

    if (data.totalBreaches === 0) {
      document.getElementById("result").innerHTML =
        `<div class="status safe">✅ No se encontraron filtraciones para este dominio.</div>`
    } else {
      const breaches = data.breaches.slice(0, 5).map((b) =>
        `<div class="breach-item">⚠️ ${b.name} — ${b.date}</div>`
      ).join("")

      document.getElementById("result").innerHTML = `
        <div class="status breached">
          🔴 ${data.totalBreaches} filtraci${data.totalBreaches === 1 ? "ón" : "ones"} encontrada${data.totalBreaches === 1 ? "" : "s"}
          <div class="breach-name">Principales:</div>
          ${breaches}
          ${data.breaches.length > 5 ? `<div class="breach-item" style="color:#a1a1aa;">+${data.breaches.length - 5} más</div>` : ""}
        </div>
      `
    }
  } catch {
    document.getElementById("result").innerHTML =
      `<div class="status loading">No se pudo verificar. Abrí TraceLess para escanear manualmente.</div>`
  }
}

document.addEventListener("DOMContentLoaded", checkSite)
