import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict } from "date-fns";
import { auth } from "./auth";
import { Post, PostWithExtras } from "./definitions";
import { prisma } from "./prisma";

// Polyfill for crypto.randomUUID
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // @ts-ignore - Polyfill for older browsers
  window.crypto.randomUUID = function() {
    // Simple UUID v4 implementation
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  };
}

// Cache interface
interface BanStatusCache {
  [key: string]: boolean;
}

// Create a global cache object
declare global {
  var banStatusCache: BanStatusCache;
}

if (!global.banStatusCache) {
  global.banStatusCache = {};
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserId = async (maxRetries = 3, retryDelay = 1000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const session = await auth();
      const userId = session?.user?.id;

      if (userId) {
        return userId;
      }

      // If no userId but still have retries left
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries - 1)));
        continue;
      }
    } catch (error) {
      console.error('[getUserId] Error getting session:', error);
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries - 1)));
        continue;
      }
    }
  }

  throw new Error("You must be signed in to use this feature");
};

export function formatTimeToNow(date: Date | string) {
  return formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
  });
}

export function formatTimeAgo(date: Date | string) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInYears > 2) return 'long time ago';
  if (diffInYears > 0) return `${diffInYears}y`;
  if (diffInMonths > 0) return `${diffInMonths}m`;
  if (diffInWeeks > 0) return `${diffInWeeks}w`;
  if (diffInDays > 0) return `${diffInDays}d`;
  if (diffInHours > 0) return `${diffInHours}h`;
  if (diffInMinutes > 0) return `${diffInMinutes}m`;
  return 'now';
}

export function transformPost(post: any): PostWithExtras {
  return {
    ...post,
    comments: post.comments?.map((comment: any) => ({
      ...comment,
      user: {
        ...(comment.user || {
          id: 'deleted',
          username: 'deleted',
          name: 'Deleted User',
          image: null,
          verified: false
        }),
        hasActiveStory: comment.user?.hasActiveStory || false
      },
      replies: comment.replies?.map((reply: any) => ({
        ...reply,
        user: {
          ...(reply.user || {
            id: 'deleted',
            username: 'deleted',
            name: 'Deleted User',
            image: null,
            verified: false
          }),
          hasActiveStory: reply.user?.hasActiveStory || false
        }
      }))
    })) || [],
    likes: post.likes || [],
    savedBy: post.savedBy || [],
    user: {
      ...(post.user || {
        id: 'deleted',
        username: 'deleted',
        name: 'Deleted User',
        image: null,
        verified: false
      }),
      hasActiveStory: post.user?.hasActiveStory || false
    }
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function formatCurrency(value: string): string {
  // Remove any non-numeric characters except decimal point
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  
  if (isNaN(numericValue)) {
    return value; // Return original value if not a valid number
  }

  // Format the number with commas and 2 decimal places
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericValue);
}

export async function checkUserBanStatus(userId: string) {
  try {
    // Use a cached result if available
    const cacheKey = `ban_status_${userId}`;
    const cachedResult = global.banStatusCache[cacheKey];
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });

    const isBanned = user?.status === "BANNED";
    
    // Cache the result for 5 minutes
    global.banStatusCache[cacheKey] = isBanned;
    setTimeout(() => {
      delete global.banStatusCache[cacheKey];
    }, 5 * 60 * 1000);

    return isBanned;
  } catch (error) {
    console.error("Error checking user ban status:", error);
    return false;
  }
}
