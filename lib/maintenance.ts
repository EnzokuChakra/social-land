import { cookies } from 'next/headers';

// Constants
export const MAINTENANCE_COOKIE = 'maintenance_bypass';
export const MAINTENANCE_BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN || 'admin-bypass-token';

// Check if the site is in maintenance mode
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/settings/maintenance`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.maintenanceMode === true;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

// Check if the current request has a bypass token
export async function hasMaintenanceBypass(): Promise<boolean> {
  const cookieStore = await cookies();
  const bypassCookie = cookieStore.get(MAINTENANCE_COOKIE);
  
  return bypassCookie?.value === MAINTENANCE_BYPASS_TOKEN;
}

// Set maintenance bypass cookie
export function setMaintenanceBypass(token: string): boolean {
  return token === MAINTENANCE_BYPASS_TOKEN;
} 