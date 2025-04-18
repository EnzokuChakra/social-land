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
  
  try {
    // Check if the post exists
    const rawPost = await fetchPostById(postId);

    // If post doesn't exist, redirect to dashboard instead of deleted-content
    // This ensures consistent behavior across environments
    if (!rawPost) {
      console.log(`Post ${postId} not found, redirecting to dashboard`);
      redirect("/dashboard");
    }

    // Transform the post to match PostWithExtras type
    const post = transformPost(rawPost);

    return <PostView id={postId} post={post} />;
  } catch (error) {
    console.error("Error in PostPage:", error);
    
    // For any errors, always redirect to dashboard for consistency
    console.log("Redirecting to dashboard due to error");
    redirect("/dashboard");
  }
} 