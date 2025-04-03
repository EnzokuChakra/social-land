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
  '/banned',
  '/uploads'
];

// Check if the path is public
const isPublicPath = (pathname: string) => {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
};

// Check maintenance mode
async function checkMaintenanceMode(request: NextRequest, token: any) {
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/admin/settings/maintenance`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.accessToken}`
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return data.maintenanceMode === true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Export the default middleware function
export default withAuth(
  async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = await getToken({ req: request });
    const response = NextResponse.next();
    
    // Clean up the pathname by removing query parameters
    const cleanPathname = pathname.split('?')[0];

    // Add caching headers for static files
    if (cleanPathname.startsWith('/uploads/')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      // Set content type based on file extension
      const ext = cleanPathname.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') {
        response.headers.set('Content-Type', 'image/jpeg');
      } else if (ext === 'png') {
        response.headers.set('Content-Type', 'image/png');
      } else if (ext === 'webp') {
        response.headers.set('Content-Type', 'image/webp');
      } else if (ext === 'gif') {
        response.headers.set('Content-Type', 'image/gif');
      }
      return response;
    }

    // Skip maintenance check for public paths, MASTER_ADMIN users, or API routes
    if (
      isPublicPath(cleanPathname) ||
      token?.role === 'MASTER_ADMIN' ||
      cleanPathname.startsWith('/api')
    ) {
      return response;
    }

    // Check maintenance mode
    const isMaintenance = await checkMaintenanceMode(request, token);
    if (isMaintenance) {
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
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
    '/((?!_next/static|_next/image|favicon.ico|.png).*)',
    '/uploads/:path*'
  ],
};
