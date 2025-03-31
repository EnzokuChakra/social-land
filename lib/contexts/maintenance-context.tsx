"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';

interface MaintenanceContextType {
  maintenanceMode: boolean;
  estimatedTime: string;
  message: string;
  isLoading: boolean;
  error: string | null;
  isUnauthorized: boolean;
  refreshMaintenanceStatus: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  // Temporarily provide static values to disable API calls
  const value = {
    maintenanceMode: false,
    estimatedTime: "2:00",
    message: "We're making some improvements to bring you a better experience. We'll be back shortly!",
    isLoading: false,
    error: null,
    isUnauthorized: false,
    refreshMaintenanceStatus: async () => {}
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
} 