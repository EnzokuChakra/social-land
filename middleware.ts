import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest as NextRequestType } from 'next/server';
import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

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
  '/banned',
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
    // Skip maintenance check for:
    // 1. Maintenance page
    // 2. API routes
    // 3. Auth pages
    // 4. Admin users
    if (
      request.nextUrl.pathname === '/maintenance' ||
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/auth') ||
      token?.role === 'MASTER_ADMIN'
    ) {
      return false;
    }

    const response = await fetch(`${request.nextUrl.origin}/api/admin/settings/maintenance`, {
      headers: {
        'x-public-request': 'true',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.maintenanceMode === true;
  } catch (error) {
    console.error('[MIDDLEWARE] Error checking maintenance mode:', error);
    return false;
  }
}

// Check if the path should bypass maintenance mode
const shouldBypassMaintenance = (pathname: string, token: JWT | null) => {
  // Only MASTER_ADMIN can bypass maintenance mode
  if (token?.role === 'MASTER_ADMIN') {
    return true;
  }

  // Allow access to maintenance page, auth routes, and static files
  return (
    pathname === '/maintenance' ||
    pathname === '/maintenance/' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api/admin/settings/maintenance') ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js)$/)
  );
};

// Export the default middleware function
export async function middleware(request: NextRequestType) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith('/api');
  const isAdminRoute = pathname.startsWith('/api/admin') || pathname.startsWith('/dashboard/admin');
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  // Get the token
  const token = await getToken({ req: request });
  
  // Check for force-token-refresh cookie and verify ban status
  const forceRefresh = request.cookies.get('force-token-refresh')?.value === 'true';
  let isBanned = token?.status === "BANNED";
  
  if (forceRefresh && token?.sub) {
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/users/ban/status`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token.accessToken}`
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          isBanned = data.isBanned;
        } else {
          console.error('Invalid content type for ban status response');
        }
      }
    } catch (error) {
      console.error('Error checking ban status:', error);
    }
  }

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected paths, check authentication and ban status
  if (isProtectedPath) {
    try {
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

      // Check if user is banned
      if (isBanned) {
        // If already on banned page, allow access
        if (pathname === '/banned') {
          return NextResponse.next();
        }

        // For API routes, return 403
        if (isApiRoute) {
          return new NextResponse(
            JSON.stringify({ error: 'Account is banned' }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        
        // For non-API routes, redirect to banned page
        const url = new URL('/banned', request.url);
        // Preserve the original URL in case they get unbanned
        url.searchParams.set('originalUrl', encodeURI(request.url));
        return NextResponse.redirect(url);
      }

      // Special handling for admin routes
      if (isAdminRoute) {
        if (!token?.role || !['ADMIN', 'MASTER_ADMIN'].includes(token.role)) {
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
      }

      // Clone the request to add the session token
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-auth-token', String(token?.accessToken || ''));
      requestHeaders.set('x-user-role', String(token?.role || ''));

      // Create a new request with the updated headers
      const newRequest = new Request(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
        cache: request.cache,
        credentials: request.credentials,
        integrity: request.integrity,
        keepalive: request.keepalive,
        mode: request.mode,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        signal: request.signal,
      });

      const response = NextResponse.next({
        request: newRequest,
      });

      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.next();
    }
  }

  // Skip maintenance check for paths that should bypass it
  if (shouldBypassMaintenance(pathname, token)) {
    return NextResponse.next();
  }

  // Check maintenance mode
  const isInMaintenance = await checkMaintenanceMode(request, token);
  
  if (isInMaintenance) {
    // If in maintenance mode, redirect to maintenance page
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  // Handle static files
  if (pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js)$/)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'ALLOWALL');
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - maintenance (maintenance page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
};
