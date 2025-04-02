import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from "next-auth/middleware";
import { getToken } from 'next-auth/jwt';

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

// Check maintenance mode
async function checkMaintenanceMode(request: NextRequest, token: any) {
  try {
    console.log('[MIDDLEWARE] Checking maintenance mode for request:', request.url);
    const response = await fetch(`${request.nextUrl.origin}/api/admin/settings/maintenance`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.accessToken}`
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[MIDDLEWARE] Maintenance mode status:', data.maintenanceMode);
      return data.maintenanceMode === true;
    }
    console.log('[MIDDLEWARE] Failed to get maintenance status:', response.status);
    return false;
  } catch (error) {
    console.error('[MIDDLEWARE] Error checking maintenance mode:', error);
    return false;
  }
}

// Export the default middleware function
export default withAuth(
  async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = await getToken({ req: request });
    
    // Clean up the pathname by removing query parameters
    const cleanPathname = pathname.split('?')[0];

    console.log('[MIDDLEWARE] Processing request:', {
      pathname: cleanPathname,
      userRole: token?.role,
      isPublicPath: isPublicPath(cleanPathname)
    });

    // Skip maintenance check for:
    // 1. Public paths
    // 2. MASTER_ADMIN users
    // 3. API routes
    if (
      isPublicPath(cleanPathname) ||
      token?.role === 'MASTER_ADMIN' ||
      cleanPathname.startsWith('/api')
    ) {
      console.log('[MIDDLEWARE] Skipping maintenance check for:', {
        reason: isPublicPath(cleanPathname) ? 'public path' : 
                token?.role === 'MASTER_ADMIN' ? 'MASTER_ADMIN' : 'API route'
      });
      return NextResponse.next();
    }

    // Check maintenance mode
    const isMaintenance = await checkMaintenanceMode(request, token);
    if (isMaintenance) {
      console.log('[MIDDLEWARE] Maintenance mode active, redirecting to maintenance page');
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    }

    console.log('[MIDDLEWARE] Maintenance mode inactive, allowing access');
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const cleanPathname = pathname.split('?')[0];

        console.log('[MIDDLEWARE] Authorization check:', {
          pathname: cleanPathname,
          hasToken: !!token,
          isPublicPath: isPublicPath(cleanPathname)
        });

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
    // Include all paths except static files and public assets
    '/((?!_next/static|_next/image|favicon.ico|uploads|.png).*)',
  ],
};
