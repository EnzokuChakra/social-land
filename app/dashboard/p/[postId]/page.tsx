import { fetchPostById } from "@/lib/data";
import { redirect } from "next/navigation";
import { transformPost } from "@/lib/utils";
import PostView from "@/components/PostView";

interface PostPageProps {
  params: {
    postId: string;
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const paramsObj = await params;
  const postId = paramsObj.postId;
  const rawPost = await fetchPostById(postId);

  if (!rawPost) {
    // If post doesn't exist, check if it's a reel
    redirect(`/dashboard/reels/${postId}`);
  }

  // Transform the post to match PostWithExtras type
  const post = transformPost(rawPost);

  return <PostView id={postId} post={post} />;
} 