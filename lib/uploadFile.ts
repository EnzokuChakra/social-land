import { writeFile } from 'fs/promises';
import { join } from 'path';
import { nanoid } from "nanoid";
import { ensureUploadDirectories } from './server-utils';

export async function uploadFile(file: File | Blob | Buffer) {
  try {
    // Ensure upload directories exist first
    await ensureUploadDirectories();
    
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      // Handle browser File/Blob
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    // Create a unique filename
    const filename = `${nanoid()}-${file instanceof File ? file.name : 'blob'}`;
    
    // Save to the events directory using the absolute path
    const uploadDir = join('/var/www/OG-GRAM/public/uploads', 'events');
    const filepath = join(uploadDir, filename);
    
    await writeFile(filepath, buffer);

    // Return the URL path
    return `/public/uploads/events/${filename}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    throw new Error('Failed to upload file');
  }
} 