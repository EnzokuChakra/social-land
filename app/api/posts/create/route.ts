import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { PostTag, User } from "@/lib/definitions";

export async function POST(req: Request) {
  try {
    // Add timestamp to track when request starts processing
    const startTime = new Date().toISOString();
    console.log("[POST_CREATE] ====== Request received at", startTime, "======");
    
    // Log request headers
    const headers = Object.fromEntries(req.headers.entries());
    console.log("[POST_CREATE] Request headers:", JSON.stringify(headers, null, 2));
    
    // Clone and log request body
    const clonedReq = req.clone();
    const rawBody = await clonedReq.text();
    console.log("[POST_CREATE] Raw request body length:", rawBody.length);
    console.log("[POST_CREATE] Raw request body preview:", rawBody.substring(0, 500));

    const session = await getServerSession(authOptions);
    console.log("[POST_CREATE] Session data:", {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      exists: !!session
    });
    
    if (!session?.user?.id) {
      console.log("[POST_CREATE] Unauthorized - no session user ID");
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    let fileUrl: string;
    let caption: string;
    let location: string | undefined;
    let taggedUsers: { userId: string; username: string }[] = [];
    let aspectRatio: number = 1;

    const contentType = req.headers.get("content-type");
    console.log("[POST_CREATE] Content-Type:", contentType);
    
    if (contentType?.includes("application/json")) {
      // Handle JSON request
      const json = JSON.parse(rawBody);
      console.log("[POST_CREATE] Full parsed JSON data:", JSON.stringify(json, null, 2));
      console.log("[POST_CREATE] Tagged users from JSON:", 
        json.taggedUsers ? {
          isArray: Array.isArray(json.taggedUsers),
          length: json.taggedUsers?.length,
          data: JSON.stringify(json.taggedUsers, null, 2)
        } : "no tagged users");
      fileUrl = json.fileUrl;
      caption = json.caption;
      location = json.location;
      taggedUsers = json.taggedUsers || [];
      aspectRatio = json.aspectRatio || 1;
    } else {
      // Handle FormData request
      const formData = await req.formData();
      console.log("[POST_CREATE] All FormData keys:", Array.from(formData.keys()));
      const taggedUsersStr = formData.get("taggedUsers") as string;
      console.log("[POST_CREATE] Raw tagged users string from FormData:", taggedUsersStr);
      try {
        taggedUsers = taggedUsersStr ? JSON.parse(taggedUsersStr) : [];
        console.log("[POST_CREATE] Parsed tagged users from FormData:", {
          isArray: Array.isArray(taggedUsers),
          length: taggedUsers?.length,
          data: JSON.stringify(taggedUsers, null, 2)
        });
      } catch (error) {
        console.error("[POST_CREATE] Error parsing tagged users:", error);
        taggedUsers = [];
      }
      fileUrl = formData.get("fileUrl") as string;
      caption = formData.get("caption") as string;
      location = formData.get("location") as string;
      aspectRatio = parseFloat(formData.get("aspectRatio") as string) || 1;
    }

    console.log("[POST_CREATE] Final tagged users array:", {
      type: Object.prototype.toString.call(taggedUsers),
      isArray: Array.isArray(taggedUsers),
      length: taggedUsers?.length,
      data: JSON.stringify(taggedUsers, null, 2)
    });
    console.log("[POST_CREATE] Tagged users array type:", Object.prototype.toString.call(taggedUsers));
    console.log("[POST_CREATE] Tagged users array length:", taggedUsers.length);

    console.log("[POST_CREATE] Processed request data:", {
      fileUrl,
      caption,
      location,
      taggedUsers,
      aspectRatio
    });

    if (!fileUrl) {
      return new NextResponse("File URL is required", { status: 400 });
    }

    // Create the post
    console.log("[POST_CREATE] Creating post with data:", {
      fileUrl,
      caption,
      location,
      userId: session.user.id,
      taggedUsers
    });

    const post = await prisma.post.create({
      data: {
        id: nanoid(),
        caption,
        location,
        fileUrl,
        aspectRatio,
        user_id: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        likes: true,
        savedBy: true,
        comments: {
          include: {
            user: true,
            likes: true,
            replies: {
              include: {
                user: true,
                likes: true
              }
            }
          }
        },
        tags: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log("[POST_CREATE] Post created:", {
      postId: post.id,
      userId: post.user_id
    });

    // Create PostTag records and notifications for tagged users
    if (taggedUsers && taggedUsers.length > 0) {
      console.log("\n[TAG_CREATE] ====== Starting tag creation process ======");
      console.log("[TAG_CREATE] Tagged users to process:", JSON.stringify(taggedUsers, null, 2));
      console.log("[TAG_CREATE] Post creator ID:", session.user.id);
      console.log("[TAG_CREATE] Post ID:", post.id);
      
      try {
        // Get all users that follow the post creator
        const query = {
          followingId: session.user.id,
          followerId: { in: taggedUsers.map(u => u.userId) },
          status: "ACCEPTED"
        };
        console.log("\n[TAG_CREATE] Checking followers...");
        console.log("[TAG_CREATE] Followers query:", JSON.stringify(query, null, 2));
        console.log("[TAG_CREATE] Tagged user IDs to check:", taggedUsers.map(u => ({id: u.userId, username: u.username})));
        
        const followers = await prisma.follows.findMany({
          where: query,
          select: {
            followerId: true,
            followingId: true,
            status: true
          }
        });
        console.log("\n[TAG_CREATE] Followers query results:");
        console.log("[TAG_CREATE] Raw followers result:", JSON.stringify(followers, null, 2));
        console.log("[TAG_CREATE] Found followers count:", followers.length);
        console.log("[TAG_CREATE] Expected followers:", taggedUsers.length);
        
        const missingFollowers = taggedUsers.filter(u => 
          !followers.some((f: { followerId: string }) => f.followerId === u.userId)
        );
        console.log("[TAG_CREATE] Users who don't follow the post creator:", 
          missingFollowers.map(u => ({username: u.username, userId: u.userId}))
        );

        // Extract follower IDs
        const validUserIds = followers.map((f: { followerId: string }) => f.followerId);
        console.log("\n[TAG_CREATE] Valid follower IDs:", validUserIds);
        
        // Filter tagged users to only those who follow the post creator
        const filteredUsers = taggedUsers.filter(user => validUserIds.includes(user.userId));
        console.log("[TAG_CREATE] Filtered users that can be tagged:", filteredUsers.length);
        console.log("[TAG_CREATE] Filtered users details:", JSON.stringify(filteredUsers));
        
        if (filteredUsers.length > 0) {
          console.log("[TAG_CREATE] Creating tags for filtered users");
          
          // Create tags one by one to ensure they are created correctly
          const createdTags = await Promise.all(
            filteredUsers.map(async user => {
              try {
                console.log("[TAG_CREATE] Attempting to create tag for user:", {
                  username: user.username,
                  userId: user.userId,
                  postId: post.id
                });

                const tagData = {
                  id: nanoid(),
                  postId: post.id,
                  userId: user.userId,
                  x: 0,
                  y: 0,
                  createdAt: new Date()
                };
                console.log("[TAG_CREATE] Tag data to be created:", tagData);

                const tag = await prisma.posttag.create({
                  data: tagData,
                  include: {
                    user: true
                  }
                });
                console.log("[TAG_CREATE] Successfully created tag:", {
                  tagId: tag.id,
                  postId: tag.postId,
                  userId: tag.userId,
                  username: tag.user.username
                });
                return tag;
              } catch (error) {
                console.error(`[TAG_CREATE] Error creating tag for user ${user.username}:`, error);
                console.error("[TAG_CREATE] Error details:", {
                  error: error instanceof Error ? error.message : "Unknown error",
                  stack: error instanceof Error ? error.stack : undefined,
                  user,
                  postId: post.id
                });
                return null;
              }
            })
          );

          const validTags = createdTags.filter((tag: PostTag | null): tag is PostTag & { user: User } => tag !== null);
          console.log("[TAG_CREATE] Successfully created tags count:", validTags.length);
          console.log("[TAG_CREATE] Created tags summary:", validTags.map((tag: PostTag & { user: User }) => ({
            tagId: tag.id,
            postId: tag.postId,
            userId: tag.userId,
            username: tag.user.username
          })));

          if (validTags.length > 0) {
            console.log("[TAG_CREATE] Creating notifications for tagged users");
            const notificationData = validTags.map((tag: PostTag & { user: User }) => ({
              id: nanoid(),
              type: "TAG",
              userId: tag.userId,
              sender_id: session.user.id,
              postId: post.id,
              createdAt: new Date()
            }));
            console.log("[TAG_CREATE] Notification data to be created:", notificationData);

            const notifications = await prisma.notification.createMany({
              data: notificationData
            });
            console.log("[TAG_CREATE] Created notifications:", notifications);
          }
        } else {
          console.log("[TAG_CREATE] No valid users to tag - they must be following you");
        }
      } catch (tagError) {
        console.error("[TAG_CREATE] Error processing tags:", tagError);
        console.error("[TAG_CREATE] Error stack:", tagError instanceof Error ? tagError.stack : 'No stack trace');
      }
    } else {
      console.log("[TAG_CREATE] No users to tag in request");
    }

    // Fetch the complete post with tags after creation
    console.log("[TAG_CREATE] Fetching complete post with tags");
    const completePost = await prisma.post.findUnique({
      where: { id: post.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true,
            stories: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        },
        likes: true,
        savedBy: true,
        comments: {
          include: {
            user: true,
            likes: true,
            replies: {
              include: {
                user: true,
                likes: true
              }
            }
          }
        },
        tags: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(completePost);
  } catch (error) {
    console.error("[CREATE_POST] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        message: "Failed to create post",
        error: error instanceof Error ? error.message : "Unknown error"
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 