import { mkdir, unlink, access, constants } from 'fs/promises';
import path from 'path';

export async function ensureUploadDirectories() {
  const uploadTypes = ['posts', 'profiles', 'stories', 'reels', 'events'];
  // Use production absolute path for the uploads directory
  const baseDir = '/var/www/social-land/public/uploads';
  
  // First ensure base uploads directory exists
  try {
    await mkdir(baseDir, { recursive: true });
  } catch (error: any) {
    throw error;
  }

  // Then create type-specific directories
  for (const type of uploadTypes) {
    const dir = path.join(baseDir, type);
    try {
      await mkdir(dir, { recursive: true });

      // Verify write permissions
      try {
        await access(dir, constants.W_OK);
      } catch (error: any) {
        throw error;
      }
    } catch (error: any) {
      // Only ignore if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

export async function deleteUploadedFile(fileUrl: string | null) {
  if (!fileUrl) return;

  try {
    console.log("[DELETE_FILE] Starting deletion for:", fileUrl);
    
    // Remove query parameters from URL
    const cleanUrl = fileUrl.split('?')[0];
    
    // Extract filename and type from URL, handling both forward and backslashes
    const normalizedUrl = cleanUrl.replace(/\\/g, '/');
    const urlParts = normalizedUrl.split('/').filter(Boolean);
    const filename = urlParts.pop();
    const type = urlParts[urlParts.length - 1]; // 'posts', 'stories', etc.

    if (!filename) {
      console.log("[DELETE_FILE] No filename found in URL");
      return;
    }

    // Try to delete from the typed directory first
    if (type) {
      const typedFilePath = path.join('/var/www/social-land/public/uploads', type, filename);
      console.log("[DELETE_FILE] Attempting to delete from typed directory:", typedFilePath);
      
      try {
        await unlink(typedFilePath);
        console.log("[DELETE_FILE] Successfully deleted file from typed directory");
        return;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error("[DELETE_FILE] Error deleting from typed directory:", error);
          throw error;
        }
        console.log("[DELETE_FILE] File not found in typed directory, trying root");
      }
    }

    // If file wasn't found in typed directory or no type was specified,
    // try the root uploads directory
    const rootFilePath = path.join('/var/www/social-land/public/uploads', filename);
    console.log("[DELETE_FILE] Attempting to delete from root directory:", rootFilePath);
    
    try {
      await unlink(rootFilePath);
      console.log("[DELETE_FILE] Successfully deleted file from root directory");
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error("[DELETE_FILE] Error deleting from root directory:", error);
        throw error;
      }
      console.log("[DELETE_FILE] File not found in root directory");
    }
  } catch (error) {
    console.error("[DELETE_FILE] Error:", error);
    throw error;
  }
} 