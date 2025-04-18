import { PostWithExtras } from "@/lib/definitions";
import Post from "./Post";

interface PostsProps {
  posts: PostWithExtras[];
}

export default function Posts({ posts }: PostsProps) {
  return (
    <div className="space-y-4" suppressHydrationWarning>
      <div className="flex flex-col gap-4" suppressHydrationWarning>
        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
