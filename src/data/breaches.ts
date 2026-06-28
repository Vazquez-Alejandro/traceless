export interface Breach {
  id: string
  name: string
  domain: string
  date: string
  description: string
  compromisedData: string[]
  category: string
  deletionUrl?: string
  privacyEmail?: string
  hasLetter?: boolean
  letterCreatedAt?: string | null
}

export const KNOWN_BREACHES: Breach[] = [
  {
    id: "adobe-2013",
    name: "Adobe",
    domain: "adobe.com",
    date: "2013-10-04",
    description:
      "En octubre de 2013, Adobe sufrió una filtración masiva que afectó a 153 millones de cuentas. Se expusieron IDs de usuario, nombres, contraseñas cifradas y pistas de contraseñas.",
    compromisedData: ["Emails", "Contraseñas (cifradas)", "Pistas de contraseña"],
    category: "Tecnología",
    deletionUrl: "https://account.adobe.com/delete",
  },
  {
    id: "linkedin-2012",
    name: "LinkedIn",
    domain: "linkedin.com",
    date: "2012-05-05",
    description:
      "En 2012, LinkedIn sufrió una filtración de 6.5 millones de contraseñas con hash SHA1 sin sal. En 2021 se publicaron 700 millones de registros adicionales.",
    compromisedData: ["Emails", "Contraseñas (hashed)"],
    category: "Redes Sociales",
    deletionUrl: "https://www.linkedin.com/psettings/account-preferences/close-account",
  },
  {
    id: "facebook-2019",
    name: "Facebook",
    domain: "facebook.com",
    date: "2019-09-01",
    description:
      "En 2019 se expusieron 533 millones de cuentas de Facebook en un foro de hacking. Los datos incluían números de teléfono, nombres, ubicaciones y emails.",
    compromisedData: ["Emails", "Números de teléfono", "Nombres", "Ubicaciones"],
    category: "Redes Sociales",
    deletionUrl: "https://www.facebook.com/help/delete_account",
  },
  {
    id: "twitter-2021",
    name: "Twitter",
    domain: "twitter.com",
    date: "2021-08-01",
    description:
      "En 2021 se filtraron 5.4 millones de cuentas de Twitter debido a una vulnerabilidad en la API. Se expusieron emails y números de teléfono.",
    compromisedData: ["Emails", "Números de teléfono"],
    category: "Redes Sociales",
    deletionUrl: "https://twitter.com/settings/deactivate",
  },
  {
    id: "canva-2019",
    name: "Canva",
    domain: "canva.com",
    date: "2019-05-24",
    description:
      "En mayo de 2019, Canva sufrió una filtración que afectó a 137 millones de usuarios. Se expusieron nombres de usuario, emails, contraseñas con hash y tokens de Google.",
    compromisedData: ["Emails", "Contraseñas (hashed)", "Tokens de OAuth"],
    category: "Diseño",
    deletionUrl: "https://www.canva.com/account/delete",
  },
  {
    id: "dropbox-2012",
    name: "Dropbox",
    domain: "dropbox.com",
    date: "2012-07-01",
    description:
      "En 2012, Dropbox sufrió una filtración de 68 millones de cuentas. Se expusieron emails y contraseñas con hash.",
    compromisedData: ["Emails", "Contraseñas (hashed)"],
    category: "Almacenamiento",
    deletionUrl: "https://www.dropbox.com/account/delete",
  },
  {
    id: "myspace-2008",
    name: "MySpace",
    domain: "myspace.com",
    date: "2008-07-01",
    description:
      "En 2008, MySpace sufrió una filtración masiva que expuso 360 millones de cuentas. Se publicaron emails y contraseñas.",
    compromisedData: ["Emails", "Contraseñas"],
    category: "Redes Sociales",
    deletionUrl: "https://myspace.com/settings/account",
  },
  {
    id: "tumblr-2013",
    name: "Tumblr",
    domain: "tumblr.com",
    date: "2013-02-01",
    description:
      "En 2013, Tumblr sufrió una filtración de 65 millones de cuentas. Se expusieron emails y contraseñas con hash SHA1.",
    compromisedData: ["Emails", "Contraseñas (hashed)"],
    category: "Redes Sociales",
    deletionUrl: "https://www.tumblr.com/settings/account",
  },
  {
    id: "quora-2018",
    name: "Quora",
    domain: "quora.com",
    date: "2018-11-30",
    description:
      "En 2018, Quora sufrió una filtración que afectó a 100 millones de usuarios. Se expusieron nombres, emails, contraseñas cifradas y datos de redes sociales vinculadas.",
    compromisedData: ["Emails", "Contraseñas (cifradas)", "Nombres"],
    category: "Redes Sociales",
    deletionUrl: "https://www.quora.com/settings/privacy",
  },
  {
    id: "yahoo-2013",
    name: "Yahoo",
    domain: "yahoo.com",
    date: "2013-08-01",
    description:
      "En 2013, Yahoo sufrió la filtración más grande de la historia: 3 mil millones de cuentas. Se expusieron nombres, emails, números de teléfono y contraseñas.",
    compromisedData: ["Emails", "Contraseñas", "Nombres", "Números de teléfono"],
    category: "Tecnología",
    deletionUrl: "https://login.yahoo.com/account/delete",
  },
  {
    id: "ebay-2014",
    name: "eBay",
    domain: "ebay.com",
    date: "2014-05-21",
    description:
      "En 2014, eBay sufrió una filtración que afectó a 145 millones de cuentas. Se expusieron nombres, direcciones, emails y contraseñas cifradas.",
    compromisedData: ["Emails", "Direcciones", "Nombres", "Contraseñas (cifradas)"],
    category: "Comercio",
    deletionUrl: "https://www.ebay.com/closemyaccount",
  },
  {
    id: "equifax-2017",
    name: "Equifax",
    domain: "equifax.com",
    date: "2017-07-29",
    description:
      "En 2017, Equifax sufrió una filtración crítica de datos financieros de 147 millones de personas. Se expusieron números de seguro social, fechas de nacimiento y direcciones.",
    compromisedData: ["Nombres", "Números de seguro social", "Fechas de nacimiento", "Direcciones"],
    category: "Finanzas",
    deletionUrl: "https://www.equifax.com/privacy/",
    privacyEmail: "privacy@equifax.com",
  },
  {
    id: "marriott-2018",
    name: "Marriott",
    domain: "marriott.com",
    date: "2018-11-19",
    description:
      "En 2018, Marriott reveló una filtración que afectó a 500 millones de huéspedes. Se expusieron nombres, direcciones, números de pasaporte y detalles de tarjetas de crédito.",
    compromisedData: ["Nombres", "Direcciones", "Números de pasaporte", "Tarjetas de crédito"],
    category: "Viajes",
    deletionUrl: "https://www.marriott.com/help/delete-account.mi",
  },
  {
    id: "wattpad-2020",
    name: "Wattpad",
    domain: "wattpad.com",
    date: "2020-06-01",
    description:
      "En 2020, Wattpad sufrió una filtración de 268 millones de cuentas. Se expusieron emails, nombres de usuario y contraseñas con hash.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas (hashed)"],
    category: "Redes Sociales",
    deletionUrl: "https://www.wattpad.com/settings/delete",
  },
  {
    id: "zynga-2019",
    name: "Zynga",
    domain: "zynga.com",
    date: "2019-09-01",
    description:
      "En 2019, Zynga sufrió una filtración de 172 millones de cuentas de juegos como Words With Friends. Se expusieron emails, nombres de usuario y contraseñas.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas"],
    category: "Juegos",
    privacyEmail: "privacy@zynga.com",
  },
  {
    id: "lastfm-2012",
    name: "Last.fm",
    domain: "last.fm",
    date: "2012-03-22",
    description:
      "En 2012, Last.fm sufrió una filtración de 43 millones de cuentas. Se expusieron emails, nombres de usuario y contraseñas.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas"],
    category: "Música",
    deletionUrl: "https://www.last.fm/settings/account/delete",
  },
  {
    id: "patreon-2015",
    name: "Patreon",
    domain: "patreon.com",
    date: "2015-09-01",
    description:
      "En 2015, Patreon sufrió una filtración que expuso 2.3 millones de registros incluyendo emails, direcciones de envío y detalles de facturación.",
    compromisedData: ["Emails", "Direcciones", "Facturación"],
    category: "Finanzas",
    deletionUrl: "https://www.patreon.com/settings/delete-account",
  },
  {
    id: "dailymotion-2016",
    name: "Dailymotion",
    domain: "dailymotion.com",
    date: "2016-10-01",
    description:
      "En 2016, Dailymotion sufrió una filtración de 85 millones de cuentas. Se expusieron emails, nombres de usuario y contraseñas con hash.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas (hashed)"],
    category: "Entretenimiento",
    deletionUrl: "https://www.dailymotion.com/settings/account/delete",
  },
  {
    id: "500px-2018",
    name: "500px",
    domain: "500px.com",
    date: "2018-07-01",
    description:
      "En 2018, 500px sufrió una filtración de 14.8 millones de cuentas. Se expusieron emails, nombres, fechas de nacimiento y contraseñas con hash.",
    compromisedData: ["Emails", "Nombres", "Fechas de nacimiento", "Contraseñas (hashed)"],
    category: "Diseño",
    deletionUrl: "https://web.500px.com/settings/account/delete_account",
  },
  {
    id: "mercadolibre-2021",
    name: "MercadoLibre",
    domain: "mercadolibre.com.ar",
    date: "2021-03-01",
    description:
      "En 2021, MercadoLibre confirmó una filtración de datos de 300,000 usuarios. Se expusieron nombres, emails, direcciones y números de documento.",
    compromisedData: ["Emails", "Nombres", "Direcciones", "DNI"],
    category: "Comercio",
    deletionUrl: "https://www.mercadolibre.com.ar/ayuda/2598",
  },
  {
    id: "doorDash-2019",
    name: "DoorDash",
    domain: "doordash.com",
    date: "2019-09-26",
    description:
      "En 2019, DoorDash sufrió una filtración que afectó a 4.9 millones de repartidores y clientes. Se expusieron nombres, emails, direcciones y últimos 4 dígitos de tarjetas.",
    compromisedData: ["Emails", "Nombres", "Direcciones", "Tarjetas de crédito (parcial)"],
    category: "Comida",
    deletionUrl: "https://help.doordash.com/",
    privacyEmail: "privacy@doordash.com",
  },
  {
    id: "snapchat-2014",
    name: "Snapchat",
    domain: "snapchat.com",
    date: "2014-01-01",
    description:
      "En 2014, Snapchat sufrió una filtración de 4.6 millones de cuentas. Se expusieron números de teléfono y nombres de usuario.",
    compromisedData: ["Números de teléfono", "Nombres de usuario"],
    category: "Redes Sociales",
    deletionUrl: "https://accounts.snapchat.com/accounts/delete_account",
  },
  {
    id: "pixlr-2020",
    name: "Pixlr",
    domain: "pixlr.com",
    date: "2020-01-01",
    description:
      "En 2020, Pixlr sufrió una filtración que expuso 1.9 millones de cuentas incluyendo emails y contraseñas.",
    compromisedData: ["Emails", "Contraseñas"],
    category: "Diseño",
    privacyEmail: "privacy@pixlr.com",
  },
  {
    id: "armorgames-2019",
    name: "Armor Games",
    domain: "armorgames.com",
    date: "2019-01-01",
    description:
      "En 2019, Armor Games sufrió una filtración de 11 millones de cuentas. Se expusieron emails y contraseñas.",
    compromisedData: ["Emails", "Contraseñas"],
    category: "Juegos",
    deletionUrl: "https://armorgames.com/settings/delete",
  },
  {
    id: "evite-2019",
    name: "Evite",
    domain: "evite.com",
    date: "2019-02-01",
    description:
      "En 2019, Evite sufrió una filtración de 100 millones de cuentas. Se expusieron nombres, emails, direcciones y contraseñas.",
    compromisedData: ["Emails", "Nombres", "Direcciones", "Contraseñas"],
    category: "Social",
    privacyEmail: "privacy@evite.com",
  },
  {
    id: "dubsmash-2018",
    name: "Dubsmash",
    domain: "dubsmash.com",
    date: "2018-10-01",
    description:
      "En 2018, Dubsmash sufrió una filtración de 162 millones de cuentas. Se expusieron emails, nombres de usuario y contraseñas con hash.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas (hashed)"],
    category: "Redes Sociales",
    deletionUrl: "https://dubsmash.com/account/delete",
  },
  {
    id: "kickstarter-2014",
    name: "Kickstarter",
    domain: "kickstarter.com",
    date: "2014-02-01",
    description:
      "En 2014, Kickstarter sufrió una filtración que afectó a 5.2 millones de usuarios. Se expusieron emails, nombres de usuario y contraseñas cifradas.",
    compromisedData: ["Emails", "Nombres de usuario", "Contraseñas (cifradas)"],
    category: "Finanzas",
    deletionUrl: "https://www.kickstarter.com/settings/account/delete",
  },
  {
    id: "goodreads-2014",
    name: "Goodreads",
    domain: "goodreads.com",
    date: "2014-07-01",
    description:
      "En 2014, Goodreads sufrió una filtración menor pero significativa. Se expusieron emails y contraseñas de sus usuarios.",
    compromisedData: ["Emails", "Contraseñas"],
    category: "Redes Sociales",
    deletionUrl: "https://www.goodreads.com/user/delete",
  },
  {
    id: "dominos-2014",
    name: "Domino's",
    domain: "dominos.com",
    date: "2014-06-01",
    description:
      "En 2014, Domino's sufrió una filtración en sus sistemas en Europa. Se expusieron emails, nombres y direcciones de clientes.",
    compromisedData: ["Emails", "Nombres", "Direcciones"],
    category: "Comida",
    privacyEmail: "privacy@dominos.com",
  },
  {
    id: "claro-2022",
    name: "Claro Argentina",
    domain: "claro.com.ar",
    date: "2022-03-15",
    description:
      "En 2022, una base de datos de clientes de Claro Argentina fue filtrada en foros de hacking, exponiendo números de teléfono, DNI y direcciones de miles de usuarios.",
    compromisedData: ["Números de teléfono", "DNI", "Direcciones", "Nombres"],
    category: "Telecomunicaciones",
    privacyEmail: "privacidad@claro.com.ar",
  },
  {
    id: "movistar-2021",
    name: "Movistar Argentina",
    domain: "movistar.com.ar",
    date: "2021-08-20",
    description:
      "En 2021, una filtración de datos de Movistar Argentina expuso información de clientes incluyendo números de teléfono, nombres y planes contratados.",
    compromisedData: ["Números de teléfono", "Nombres", "DNI"],
    category: "Telecomunicaciones",
    privacyEmail: "protecciondedatos@telefonica.com",
  },
  {
    id: "personal-2023",
    name: "Personal Argentina",
    domain: "personal.com.ar",
    date: "2023-06-10",
    description:
      "En 2023, una base de datos de Personal Argentina con información de clientes fue expuesta. Se filtraron números de teléfono, direcciones de email y datos de facturación.",
    compromisedData: ["Números de teléfono", "Emails", "Direcciones", "DNI"],
    category: "Telecomunicaciones",
    privacyEmail: "datospersonales@personal.com.ar",
  },
  {
    id: "tuenti-2022",
    name: "Tuenti Argentina",
    domain: "tuenti.com.ar",
    date: "2022-11-01",
    description:
      "Tuenti Argentina sufrió una filtración de datos de clientes en 2022, exponiendo números de teléfono, nombres y fechas de alta del servicio.",
    compromisedData: ["Números de teléfono", "Nombres"],
    category: "Telecomunicaciones",
    privacyEmail: "privacidad@tuenti.com.ar",
  },
  {
    id: "mercadolibre-phone-2023",
    name: "MercadoLibre (fuga telefónica)",
    domain: "mercadolibre.com.ar",
    date: "2023-04-15",
    description:
      "En 2023, una base de datos con números de teléfono de usuarios de MercadoLibre fue filtrada. Los datos incluían números, nombres parciales y zonas geográficas.",
    compromisedData: ["Números de teléfono", "Nombres", "Ubicaciones aproximadas"],
    category: "Comercio",
    deletionUrl: "https://www.mercadolibre.com.ar/privacidad",
    privacyEmail: "privacidad@mercadolibre.com",
  },
]

export const SAFE_SITES: { name: string; domain: string; category: string; deletionUrl?: string }[] = [
  { name: "Netflix", domain: "netflix.com", category: "Entretenimiento", deletionUrl: "https://www.netflix.com/account/close" },
  { name: "Spotify", domain: "spotify.com", category: "Música", deletionUrl: "https://www.spotify.com/account/delete" },
  { name: "Amazon", domain: "amazon.com", category: "Comercio", deletionUrl: "https://www.amazon.com/gp/help/customer/display.html?nodeId=G33XXCV3FKWZBKG5" },
  { name: "Google", domain: "google.com", category: "Tecnología", deletionUrl: "https://myaccount.google.com/delete-services-or-account" },
  { name: "Microsoft", domain: "microsoft.com", category: "Tecnología", deletionUrl: "https://account.microsoft.com/account/close-account" },
  { name: "Apple", domain: "apple.com", category: "Tecnología", deletionUrl: "https://privacy.apple.com/" },
  { name: "Airbnb", domain: "airbnb.com", category: "Viajes", deletionUrl: "https://www.airbnb.com/account/delete" },
  { name: "Rappi", domain: "rappi.com", category: "Comida" },
  { name: "PedidosYa", domain: "pedidosya.com", category: "Comida" },
  { name: "Disney+", domain: "disneyplus.com", category: "Entretenimiento", deletionUrl: "https://www.disneyplus.com/account/close" },
  { name: "HBO Max", domain: "hbomax.com", category: "Entretenimiento" },
  { name: "Prime Video", domain: "primevideo.com", category: "Entretenimiento" },
  { name: "Globant", domain: "globant.com", category: "Tecnología" },
  { name: "Despegar", domain: "despegar.com", category: "Viajes" },
  { name: "Ualá", domain: "uala.com.ar", category: "Finanzas" },
  { name: "Naranja X", domain: "naranjax.com", category: "Finanzas" },
  { name: "TiendaNube", domain: "tiendanube.com", category: "Comercio" },
  { name: "Fanatiz", domain: "fanatiz.com", category: "Entretenimiento" },
  { name: "Cocos Capital", domain: "cocos.capital", category: "Finanzas" },
  { name: "OpenAI", domain: "openai.com", category: "Tecnología" },
  { name: "GitHub", domain: "github.com", category: "Tecnología", deletionUrl: "https://github.com/settings/account/delete" },
  { name: "Figma", domain: "figma.com", category: "Diseño", deletionUrl: "https://www.figma.com/settings/account/delete" },
  { name: "Notion", domain: "notion.so", category: "Tecnología", deletionUrl: "https://www.notion.so/settings/delete-account" },
  { name: "Slack", domain: "slack.com", category: "Tecnología", deletionUrl: "https://slack.com/account/delete" },
  { name: "Zoom", domain: "zoom.us", category: "Tecnología", deletionUrl: "https://zoom.us/account/close" },
  { name: "Discord", domain: "discord.com", category: "Social", deletionUrl: "https://discord.com/settings/account/delete" },
  { name: "Telegram", domain: "telegram.org", category: "Social" },
  { name: "WhatsApp", domain: "whatsapp.com", category: "Social", deletionUrl: "https://wa.me/delete" },
  { name: "Instagram", domain: "instagram.com", category: "Redes Sociales", deletionUrl: "https://www.instagram.com/accounts/remove/request/permanent/" },
  { name: "YouTube", domain: "youtube.com", category: "Entretenimiento", deletionUrl: "https://www.youtube.com/account/advanced_settings" },
  { name: "TikTok", domain: "tiktok.com", category: "Entretenimiento", deletionUrl: "https://www.tiktok.com/setting/delete-account" },
  { name: "Buenbit", domain: "buenbit.com", category: "Finanzas" },
  { name: "Lemon Cash", domain: "lemoncash.com.ar", category: "Finanzas" },
  { name: "MODO", domain: "modo.com.ar", category: "Finanzas" },
  { name: "Belong", domain: "belong.com", category: "Juegos" },
  { name: "Claro Argentina", domain: "claro.com.ar", category: "Telecomunicaciones" },
  { name: "Movistar Argentina", domain: "movistar.com.ar", category: "Telecomunicaciones" },
  { name: "Personal Argentina", domain: "personal.com.ar", category: "Telecomunicaciones" },
  { name: "Tuenti Argentina", domain: "tuenti.com.ar", category: "Telecomunicaciones" },
]

export interface SearchResult {
  breaches: Breach[]
  totalBreaches: number
  safeSites: number
  totalSites: number
  riskScore: number
  searchType?: "email" | "phone"
}
