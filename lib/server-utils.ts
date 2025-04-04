import { mkdir, unlink, access, constants } from 'fs/promises';
import path from 'path';

export async function ensureUploadDirectories() {
  const uploadTypes = ['posts', 'profiles', 'stories', 'reels', 'events'];
  // Use absolute path for the uploads directory
  const baseDir = '/var/www/OG-GRAM/public/uploads';
  
  // First ensure base uploads directory exists
  try {
    await mkdir(baseDir, { recursive: true });
    console.log('Base uploads directory created/verified:', baseDir);
  } catch (error: any) {
    console.error('Error creating base uploads directory:', {
      error,
      code: error.code,
      message: error.message,
      path: baseDir
    });
    throw error;
  }

  // Then create type-specific directories
  for (const type of uploadTypes) {
    const dir = path.join(baseDir, type);
    try {
      await mkdir(dir, { recursive: true });
      console.log(`${type} upload directory created/verified:`, dir);

      // Verify write permissions
      try {
        await access(dir, constants.W_OK);
        console.log(`Write permissions verified for ${type} directory`);
      } catch (error: any) {
        console.error(`No write permissions for ${type} directory:`, {
          error,
          code: error.code,
          message: error.message,
          path: dir
        });
        throw error;
      }
    } catch (error: any) {
      // Only ignore if directory already exists
      if (error.code !== 'EEXIST') {
        console.error(`Error creating ${type} upload directory:`, {
          error,
          code: error.code,
          message: error.message,
          path: dir
        });
        throw error;
      }
    }
  }
}

export async function deleteUploadedFile(fileUrl: string | null) {
  if (!fileUrl) return;

  try {
    // Extract filename and type from URL, handling both forward and backslashes
    const normalizedUrl = fileUrl.replace(/\\/g, '/');
    const urlParts = normalizedUrl.split('/').filter(Boolean);
    const filename = urlParts.pop();
    const type = urlParts[urlParts.length - 1]; // 'posts', 'stories', etc.

    if (!filename) {
      console.error('Invalid file URL format:', fileUrl);
      return;
    }

    // Try to delete from the typed directory first
    if (type) {
      const typedFilePath = path.join('/var/www/OG-GRAM/public/uploads', type, filename);
      try {
        await unlink(typedFilePath);
        console.log(`Successfully deleted file: ${typedFilePath}`);
        return;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting from typed directory:`, {
            error,
            code: error.code,
            message: error.message,
            path: typedFilePath
          });
        }
      }
    }

    // If file wasn't found in typed directory or no type was specified,
    // try the root uploads directory
    const rootFilePath = path.join('/var/www/OG-GRAM/public/uploads', filename);
    try {
      await unlink(rootFilePath);
      console.log(`Successfully deleted file from root: ${rootFilePath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error deleting file from root:', {
          error,
          code: error.code,
          message: error.message,
          path: rootFilePath
        });
      }
    }
  } catch (error: any) {
    console.error('Error in deleteUploadedFile:', {
      error,
      code: error.code,
      message: error.message
    });
  }
} 