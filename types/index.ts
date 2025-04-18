export interface Notification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  userId: string;
  senderId?: string;
  postId?: string;
  commentId?: string;
  metadata?: Record<string, any>;
}

export interface FollowRequest extends Notification {
  type: 'FOLLOW_REQUEST';
  sender: {
    id: string;
    username: string;
    image?: string;
  };
} 