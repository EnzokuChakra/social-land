import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from "next-auth/middleware";

// Paths that should be accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth',
  '/maintenance',
  '/api/admin/settings/maintenance',
  '/api/admin/settings/maintenance/bypass',
  '/api/status',
  '/_next',
  '/favicon.ico',
  '/banned'
];

// Check if the path is public
const isPublicPath = (pathname: string) => {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
};

// Export the default middleware function
export default withAuth(
  async function middleware(request) {
    const { pathname, searchParams } = request.nextUrl;
    
    try {
      // Get the session token from cookies
      const token = request.cookies.get('next-auth.session-token')?.value 
        || request.cookies.get('__Secure-next-auth.session-token')?.value;

      console.log('[Middleware] Path:', pathname);
      console.log('[Middleware] Has token:', !!token);
      console.log('[Middleware] Search params:', Object.fromEntries(searchParams));

      // Clean up the pathname by removing query parameters
      const cleanPathname = pathname.split('?')[0];

      // If login page and authenticated, redirect to dashboard
      if (cleanPathname === '/login' && token) {
        console.log('[Middleware] Authenticated user on login page, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // If root path and authenticated, redirect to dashboard
      if (cleanPathname === '/' && token) {
        console.log('[Middleware] Authenticated user on root, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // If root path and not authenticated, redirect to login
      if (cleanPathname === '/' && !token) {
        console.log('[Middleware] Unauthenticated user on root, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Skip auth check for public routes
      if (isPublicPath(cleanPathname)) {
        console.log('[Middleware] Public path, allowing access');
        return NextResponse.next();
      }

      // If no token and not a public path, redirect to login
      if (!token && !isPublicPath(cleanPathname)) {
        console.log('[Middleware] Unauthenticated user on protected path, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        
        // Only set callbackUrl if it's not already set and it's not a full URL
        if (!loginUrl.searchParams.has('callbackUrl')) {
          const callbackUrl = cleanPathname;
          try {
            // If it's a full URL, extract the pathname
            const url = new URL(callbackUrl);
            loginUrl.searchParams.set('callbackUrl', url.pathname);
          } catch {
            // If it's not a valid URL, use it as is
            loginUrl.searchParams.set('callbackUrl', callbackUrl);
          }
        }
        
        return NextResponse.redirect(loginUrl);
      }

      console.log('[Middleware] Allowing access to protected path');
      return NextResponse.next();
    } catch (error) {
      console.error('[Middleware] Error:', error);
      // On error, redirect to login but preserve the callback URL
      const loginUrl = new URL('/login', request.url);
      const cleanPathname = pathname.split('?')[0];
      
      if (!loginUrl.searchParams.has('callbackUrl')) {
        try {
          // If it's a full URL, extract the pathname
          const url = new URL(cleanPathname);
          loginUrl.searchParams.set('callbackUrl', url.pathname);
        } catch {
          // If it's not a valid URL, use it as is
          loginUrl.searchParams.set('callbackUrl', cleanPathname);
        }
      }
      
      return NextResponse.redirect(loginUrl);
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log('[Middleware] Authorization check - Has token:', !!token);
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    }
  }
);

// Middleware matcher configuration
export const config = {
  matcher: [
    // Include login page and root path
    '/login',
    '/',
    
    // Protected routes that need authentication
    "/dashboard/:path*",
    "/api/stories/:path*",
    "/api/posts/:path*",
    "/api/profile/:path*",
    "/api/verification/:path*",
    
    // Exclude public routes and static files
    "/((?!api/auth|register|_next/static|_next/image|favicon.ico|uploads|.png).*)",
  ],
};
