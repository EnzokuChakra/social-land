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
    
    // Clean up the pathname by removing query parameters
    const cleanPathname = pathname.split('?')[0];

    // Skip auth check for public routes
    if (isPublicPath(cleanPathname)) {
      return NextResponse.next();
    }

    // Handle root path
    if (cleanPathname === '/') {
      return NextResponse.next();
    }

    // Handle login page
    if (cleanPathname === '/login') {
      return NextResponse.next();
    }

    // For all other routes, let withAuth handle the authentication
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname, searchParams } = req.nextUrl;
        const cleanPathname = pathname.split('?')[0];

        // Allow access to public paths
        if (isPublicPath(cleanPathname)) {
          return true;
        }

        // If has token and trying to access login page, redirect to dashboard
        if (token && cleanPathname === '/login') {
          return false;
        }

        // If no token and trying to access protected route, redirect to login
        if (!token && !isPublicPath(cleanPathname)) {
          // Prevent recursive callbackUrl
          const callbackUrl = searchParams.get('callbackUrl');
          if (callbackUrl && callbackUrl.startsWith('/login')) {
            return false;
          }
          return false;
        }

        return true;
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
