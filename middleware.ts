import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/rss.xml") {
    return NextResponse.rewrite(new URL("/api/rss", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/rss.xml"],
}
