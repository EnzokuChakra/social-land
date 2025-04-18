import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface UseSessionAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: ReturnType<typeof useSession>["data"];
}

export function useSessionAuth(): UseSessionAuthReturn {
  const { data: session, status } = useSession();

  return {
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    session
  };
} 