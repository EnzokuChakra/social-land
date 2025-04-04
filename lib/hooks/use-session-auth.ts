import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UseSessionAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  error: Error | null;
}

export function useSessionAuth(retryAttempts = 3, retryDelay = 1000): UseSessionAuthReturn {
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      if (status === 'loading') {
        return;
      }

      if (status === 'authenticated' && session?.user?.id) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        setIsLoading(false);
        setError(null);
        return;
      }

      // If not authenticated but still have retry attempts
      if (retryCount < retryAttempts) {
        setIsLoading(true);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return;
      }

      // If all retries are exhausted and still not authenticated
      setIsAuthenticated(false);
      setUserId(null);
      setIsLoading(false);
      setError(new Error('Authentication failed after retries'));
    };

    checkSession();
  }, [session, status, retryCount, retryAttempts, retryDelay]);

  return {
    isAuthenticated,
    isLoading,
    userId,
    error
  };
} 