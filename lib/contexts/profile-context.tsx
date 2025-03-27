"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
  refetch: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  refetch: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    if (!session?.user?.username) return;
    
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
    // Poll for profile updates every 30 seconds
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.username]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
} 