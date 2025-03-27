import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict } from "date-fns";
import { auth as customAuth } from "./auth";
import { Post, PostWithExtras } from "./definitions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserId = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("You must be signed in to use this feature");
  }

  return userId;
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
      user: comment.user || {
        id: 'deleted',
        username: 'deleted',
        name: 'Deleted User',
        image: null,
        verified: false
      }
    })) || [],
    likes: post.likes || [],
    savedBy: post.savedBy || [],
    user: post.user || {
      id: 'deleted',
      username: 'deleted',
      name: 'Deleted User',
      image: null,
      verified: false
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
    const cachedResult = globalThis[cacheKey];
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });

    const isBanned = user?.status === "BANNED";
    
    // Cache the result for 5 minutes
    globalThis[cacheKey] = isBanned;
    setTimeout(() => {
      delete globalThis[cacheKey];
    }, 5 * 60 * 1000);

    return isBanned;
  } catch (error) {
    console.error("Error checking user ban status:", error);
    return false;
  }
}
