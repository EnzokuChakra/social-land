/**
 * Client-side API functions for fetching data in iframe contexts
 */
import { apiClient } from './api-client';

interface NotificationResponse {
  notifications: any[];
  followRequests: any[];
}

/**
 * Client-side wrapper for getNotifications server action
 * Uses the enhanced API client to handle iframe contexts
 */
export async function getNotificationsClient(): Promise<NotificationResponse> {
  try {
    const data = await apiClient<NotificationResponse>('/api/notifications');
    return data;
  } catch (error) {
    console.error('[getNotificationsClient] Error:', error);
    return { notifications: [], followRequests: [] };
  }
} 