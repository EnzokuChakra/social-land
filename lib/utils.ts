import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict } from "date-fns";
import { auth } from "./auth";
import { Post, PostWithExtras, StoryWithExtras, UserWithExtras } from "./definitions";
import { prisma } from "./prisma";
import { formatInTimeZone } from 'date-fns-tz';

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
    user: post.user ? {
      ...post.user,
      hasActiveStory: post.user?.hasActiveStory || false,
      isFollowing: post.user?.isFollowing || false,
      hasPendingRequest: post.user?.hasPendingRequest || false
    } : {
      id: 'deleted',
      username: 'deleted',
      name: 'Deleted User',
      image: null,
      verified: false,
      isPrivate: false,
      role: 'USER',
      status: 'ACTIVE',
      hasActiveStory: false,
      isFollowing: false,
      hasPendingRequest: false
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

export function formatCurrency(value: string | number): string {
  // Handle null or undefined values
  if (value === null || value === undefined) {
    return "$0";
  }
  
  // Remove any non-numeric characters except decimal point
  const numericValue = typeof value === 'string' 
    ? value.replace(/[^0-9.]/g, '') 
    : value.toString();
  
  // Parse the numeric value
  const number = parseFloat(numericValue);
  
  // Check if it's a valid number
  if (isNaN(number)) {
    return "$0";
  }
  
  // Format with commas and no decimal places
  return `$${number.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

export const TIMEZONE = 'Europe/Bucharest';

export function formatDateToBucharest(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'yyyy-MM-dd HH:mm');
}

export function formatDateToBucharestWithTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'PPP p');
}

export function formatTimeToBucharest(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'HH:mm');
}

export function getBucharestDate(date: Date | string): Date {
  const inputDate = new Date(date);
  const bucharestTime = formatInTimeZone(inputDate, 'Europe/Bucharest', 'yyyy-MM-dd HH:mm:ss');
  return new Date(bucharestTime);
}

export function isTodayInBucharest(date: Date | string): boolean {
  const bucharestDate = getBucharestDate(date);
  const today = getBucharestDate(new Date());
  return bucharestDate.toDateString() === today.toDateString();
}

export function isPastInBucharest(date: Date | string): boolean {
  const bucharestDate = getBucharestDate(date);
  const now = getBucharestDate(new Date());
  return bucharestDate < now;
}

export function isFutureInBucharest(date: Date | string): boolean {
  const bucharestDate = getBucharestDate(date);
  const now = getBucharestDate(new Date());
  return bucharestDate > now;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

export function isEventOngoing(startDate: Date | string, durationHours: number = 3): boolean {
  const now = getBucharestDate(new Date());
  const start = getBucharestDate(startDate);
  const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
  
  return now >= start && now <= end;
}

export function isEventEnded(startDate: Date | string, durationHours: number = 3): boolean {
  const now = getBucharestDate(new Date());
  const start = getBucharestDate(startDate);
  const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
  
  return now > end;
}

export function isEventUpcoming(startDate: Date | string): boolean {
  const now = getBucharestDate(new Date());
  const start = getBucharestDate(startDate);
  
  return now < start;
}

export function transformStory(story: any): StoryWithExtras {
  return {
    ...story,
    user: {
      ...story.user,
      email: story.user.email || "",
      password: story.user.password || "",
      bio: story.user.bio || "",
      createdAt: story.user.createdAt || new Date(),
      updatedAt: story.user.updatedAt || new Date(),
    },
    views: story.views.map((view: any) => ({
      ...view,
      user: {
        ...view.user,
        email: view.user.email || "",
        password: view.user.password || "",
        bio: view.user.bio || "",
        createdAt: view.user.createdAt || new Date(),
        updatedAt: view.user.updatedAt || new Date(),
      }
    })),
    likes: story.likes.map((like: any) => ({
      ...like,
      user: {
        ...like.user,
        email: like.user.email || "",
        password: like.user.password || "",
        bio: like.user.bio || "",
        createdAt: like.user.createdAt || new Date(),
        updatedAt: like.user.updatedAt || new Date(),
      }
    }))
  };
}

export function transformUser(user: any): UserWithExtras {
  return {
    ...user,
    email: user.email || "",
    password: user.password || "",
    bio: user.bio || "",
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    followers: user.followers || [],
    following: user.following || [],
    posts: user.posts || [],
    savedPosts: user.savedPosts || [],
    stories: user.stories || [],
    postTags: user.postTags || [],
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    hasActiveStory: user.hasActiveStory || false,
    isFollowing: user.isFollowing || false,
    hasPendingRequest: user.hasPendingRequest || false,
    isFollowedByUser: user.isFollowedByUser || false,
    hasPendingRequestFromUser: user.hasPendingRequestFromUser || false,
  };
}

export const containsUrl = (text: string): boolean => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  return urlRegex.test(text);
};
