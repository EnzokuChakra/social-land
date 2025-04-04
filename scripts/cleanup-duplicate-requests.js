// Cleanup script to remove duplicate follow requests
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateFollowRequests() {
  console.log('Starting cleanup of duplicate follow requests...');
  
  try {
    // Find all unique follower-following pairs with PENDING status
    const pendingFollows = await prisma.follows.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        followerId: true,
        followingId: true
      }
    });
    
    console.log(`Found ${pendingFollows.length} total pending follow requests`);
    
    // Group by follower-following pairs
    const pairs = {};
    pendingFollows.forEach(follow => {
      const key = `${follow.followerId}-${follow.followingId}`;
      if (!pairs[key]) {
        pairs[key] = [];
      }
      pairs[key].push(follow);
    });
    
    // Find pairs with duplicates
    const duplicatePairs = Object.entries(pairs)
      .filter(([_, follows]) => follows.length > 1)
      .map(([key, follows]) => ({
        key,
        count: follows.length,
        follows
      }));
    
    console.log(`Found ${duplicatePairs.length} pairs with duplicate follow requests`);
    
    // Process each pair with duplicates
    for (const pair of duplicatePairs) {
      const [followerId, followingId] = pair.key.split('-');
      console.log(`Processing duplicate pair: ${followerId} -> ${followingId} (${pair.count} duplicates)`);
      
      // Get all follow requests for this pair
      const requests = await prisma.follows.findMany({
        where: {
          followerId,
          followingId,
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'desc'  // Keep the most recent one
        }
      });
      
      if (requests.length <= 1) {
        console.log(`No duplicates found for this pair, skipping`);
        continue;
      }
      
      // Keep the most recent one, delete the rest
      const [keepRequest, ...deleteRequests] = requests;
      const deleteIds = deleteRequests.map(r => r.id);
      
      console.log(`Keeping request with ID: ${keepRequest.id}`);
      console.log(`Deleting ${deleteIds.length} duplicate requests`);
      
      // Delete the duplicate follow requests
      const deletedFollows = await prisma.follows.deleteMany({
        where: {
          id: {
            in: deleteIds
          }
        }
      });
      
      console.log(`Deleted ${deletedFollows.count} duplicate follow requests`);
      
      // Also delete duplicate notifications
      const deletedNotifs = await prisma.notification.deleteMany({
        where: {
          type: 'FOLLOW_REQUEST',
          sender_id: followerId,
          userId: followingId,
          NOT: {
            id: keepRequest.id
          }
        }
      });
      
      console.log(`Deleted ${deletedNotifs.count} duplicate notifications`);
    }
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateFollowRequests()
  .then(() => console.log('Script finished'))
  .catch(err => console.error('Script failed:', err)); 