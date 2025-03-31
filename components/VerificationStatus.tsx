"use client";

import { BadgeCheckIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function VerificationStatus() {
  const [profile, setProfile] = useState<any>(null);
  const { data: session } = useSession();

  useEffect(() => {
    async function loadProfile() {
      if (session?.user?.username) {
        try {
          const response = await fetch('/api/profile');
          if (!response.ok) {
            throw new Error('Failed to fetch profile');
          }
          const data = await response.json();
          setProfile(data);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    }
    loadProfile();
  }, [session?.user?.username]);

  if (!profile) return null;

  return profile.verified ? (
    <div className="flex items-center gap-x-2">
      <BadgeCheckIcon className="w-5 h-5 text-green-500" />
      <span className="text-sm font-medium text-green-500">Verified Account</span>
    </div>
  ) : (
    <Link 
      href="/dashboard/verify" 
      className="flex items-center gap-x-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
    >
      <BadgeCheckIcon className="w-5 h-5" />
      Get Verified
    </Link>
  );
} 