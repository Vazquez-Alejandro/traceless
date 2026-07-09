import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const publicRoutes = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terminos",
  "/privacidad",
  "/premium",
  "/empresa",
  "/api/webhooks(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (!publicRoutes(req)) {
    await auth()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
