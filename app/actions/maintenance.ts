'use server';

import { cookies } from 'next/headers';
import { MAINTENANCE_BYPASS_TOKEN, MAINTENANCE_COOKIE } from '@/lib/maintenance';

export async function bypassMaintenance(token: string) {
  if (token === MAINTENANCE_BYPASS_TOKEN) {
    try {
      // Set the bypass cookie directly
      const cookieStore = await cookies();
      cookieStore.set(MAINTENANCE_COOKIE, MAINTENANCE_BYPASS_TOKEN, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      
      return true;
    } catch (error) {
      console.error('Error setting bypass cookie:', error);
      return false;
    }
  }
  
  return false;
} 