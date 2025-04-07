import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest as NextRequestType } from 'next/server';
import type { JWT } from 'next-auth/jwt';

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
async function checkMaintenanceMode(request: NextRequest, token: JWT | null) {
  try {
    // Skip maintenance check for maintenance page and API routes
    if (request.nextUrl.pathname === '/maintenance' || 
        request.nextUrl.pathname === '/maintenance/' ||
        request.nextUrl.pathname.startsWith('/api/')) {
      return false;
    }

    const response = await fetch(`${request.nextUrl.origin}/api/admin/settings/maintenance`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.accessToken || ''}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('[MIDDLEWARE] Maintenance check failed:', response.status);
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[MIDDLEWARE] Invalid content type:', contentType);
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

  // Get the token first
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Skip maintenance check for paths that should bypass it
  if (shouldBypassMaintenance(pathname, token)) {
    return NextResponse.next();
  }

  // Check maintenance mode
  const isInMaintenance = await checkMaintenanceMode(request, token);
  
  console.log('[MIDDLEWARE] Maintenance check:', {
    path: pathname,
    isInMaintenance,
    userRole: token?.role,
    shouldBypass: shouldBypassMaintenance(pathname, token),
    timestamp: new Date().toISOString()
  });
  
  if (isInMaintenance) {
    console.log('[MIDDLEWARE] Redirecting to maintenance page:', {
      path: pathname,
      userRole: token?.role,
      timestamp: new Date().toISOString()
    });
    // If in maintenance mode, redirect to maintenance page
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

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
  const isAdminRoute = pathname.startsWith('/api/admin') || pathname.startsWith('/dashboard/admin');

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
      if (token?.status === "BANNED" && !pathname.startsWith('/banned')) {
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
      requestHeaders.set('x-auth-token', token?.accessToken || '');
      requestHeaders.set('x-user-role', token?.role || '');

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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
