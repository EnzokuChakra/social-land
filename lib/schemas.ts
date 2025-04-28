import { z } from "zod";

export const PostSchema = z.object({
  id: z.string(),
  fileUrl: z.string().url(),
  caption: z.string().max(2200, { message: "Caption cannot exceed 2,200 characters" }).optional(),
  location: z.string().optional(),
  aspectRatio: z.number().default(1),
});

export const CreatePost = PostSchema.omit({ id: true });
export const UpdatePost = PostSchema;
export const DeletePost = PostSchema.pick({ id: true });

export const LikeSchema = z.object({
  postId: z.string(),
});

export const BookmarkSchema = z.object({
  postId: z.string(),
});

export const CommentSchema = z.object({
  id: z.string(),
  body: z.string().max(1000, { message: "Comment cannot exceed 1,000 characters" }),
  postId: z.string().nullable(),
  parentId: z.string().nullable(),
});

export const CreateComment = CommentSchema.omit({ id: true });
export const UpdateComment = CommentSchema;
export const DeleteComment = CommentSchema.pick({ id: true });

export const UserSchema = z.object({
  id: z.string(),
  username: z.string()
    .max(30, { message: "Username must be less than 30 characters" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "Username can only contain letters and numbers" })
    .optional(),
  name: z.string()
    .max(30, { message: "Name must be less than 30 characters" })
    .regex(/^[a-zA-Z0-9 ]+$/, { message: "Name can only contain letters, numbers and spaces" })
    .optional(),
  image: z.string().optional(),
  bio: z.string().max(150).optional(),
  isPrivate: z.boolean().optional(),
});

export const UpdateUser = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(50, "Name is too long").optional(),
  bio: z.string().max(160, "Bio is too long").optional(),
  image: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
}).partial().refine(data => {
  // Ensure at least one field is being updated
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be updated"
});

export const DeleteUser = UserSchema.pick({ id: true });
export const FollowUser = z.object({
  followingId: z.string().optional(),
  followerId: z.string().optional(),
  action: z.enum(["follow", "unfollow", "accept", "delete"]).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const RegisterSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must be less than 30 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers and underscores" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export const EventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  rules: z.string().optional(),
  prizes: z.array(z.string()).optional(),
  location: z.string().min(1, "Location is required"),
  startDate: z.date({
    required_error: "Date is required",
  }),
  photoUrl: z.string().optional(),
});
