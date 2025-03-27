import { PrismaClient } from '@prisma/client';
import { rename } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function organizeUploads() {
  try {
    // Get all records that have fileUrls
    const [posts, stories, reels, users] = await Promise.all([
      prisma.post.findMany({ select: { fileUrl: true } }),
      prisma.story.findMany({ select: { fileUrl: true } }),
      prisma.reel.findMany({ select: { fileUrl: true, thumbnail: true } }),
      prisma.user.findMany({ select: { image: true } }),
    ]);

    // Function to move file if it exists in uploads root
    async function moveFile(fileUrl: string | null, targetDir: string) {
      if (!fileUrl) return;
      
      // Extract filename from URL
      const filename = fileUrl.split('/').pop();
      if (!filename) return;

      const sourcePath = path.join(process.cwd(), 'public', 'uploads', filename);
      const targetPath = path.join(process.cwd(), 'public', 'uploads', targetDir, filename);

      try {
        await rename(sourcePath, targetPath);
        console.log(`Moved ${filename} to ${targetDir}/`);
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          console.error(`Error moving ${filename}:`, error);
        }
      }
    }

    // Move files to appropriate directories
    const moves = [
      ...posts.map(p => moveFile(p.fileUrl, 'posts')),
      ...stories.map(s => moveFile(s.fileUrl, 'stories')),
      ...reels.flatMap(r => [
        moveFile(r.fileUrl, 'reels'),
        moveFile(r.thumbnail, 'reels')
      ]),
      ...users.map(u => moveFile(u.image, 'profiles'))
    ];

    await Promise.all(moves);
    console.log('File organization complete!');

  } catch (error) {
    console.error('Error organizing uploads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

organizeUploads(); 