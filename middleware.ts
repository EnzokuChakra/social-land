import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest as NextRequestType } from 'next/server';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/api/profile',
  '/api/users',
  '/api/posts',
  '/api/stories',
  '/api/admin',
];

// Paths that are always public
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/_next',
  '/images',
  '/uploads',
  '/public',
  '/favicon.ico',
];

// Check if the path is public
const isPublicPath = (pathname: string) => {
  return publicPaths.some(path => pathname.startsWith(path));
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
export async function middleware(request: NextRequestType) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths and static files
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Handle static files
  if (pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js)$/)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  // Check if the path needs protection
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith('/api/');

  if (isProtectedPath) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      // For API routes, return 401 instead of redirecting
      if (!token && isApiRoute) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // For non-API routes, redirect to login if no token
      if (!token && !isApiRoute) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.url));
        return NextResponse.redirect(url);
      }

      // Special handling for admin routes
      if (pathname.startsWith('/api/admin') && token?.role !== 'ADMIN') {
        return new NextResponse(
          JSON.stringify({ error: 'Admin access required' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      if (isApiRoute) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication error' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  return response;
}

// Middleware matcher configuration
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
