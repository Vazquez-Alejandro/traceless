import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

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

  const { userId } = await auth()
  const url = req.nextUrl

  if (userId) {
    if (url.pathname === "/sign-in" || url.pathname === "/sign-up") {
      return NextResponse.redirect(new URL("/dashboard", url))
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
