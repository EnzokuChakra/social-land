"use client";

import { create } from 'zustand';
import { useMaintenance } from '@/lib/contexts/maintenance-context';

// This is now just a proxy to the maintenance context
export const useMaintenanceStore = () => {
  return useMaintenance();
}; 