"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from '@tanstack/react-query';

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  bio: string | null;
  verified: boolean;
  isPrivate: boolean;
  role: string;
  status: string;
  _count?: {
    followers: number;
    following: number;
    posts: number;
  };
};

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  refetch: () => Promise<unknown>;
};

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  refetch: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile', session?.user?.username],
    queryFn: async () => {
      if (!session?.user?.username) return null;
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session?.user?.username,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return (
    <ProfileContext.Provider value={{ profile, loading: isLoading, refetch }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
} 