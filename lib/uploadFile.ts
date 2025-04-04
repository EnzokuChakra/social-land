import { writeFile } from 'fs/promises';
import { join } from 'path';
import { nanoid } from "nanoid";
import { ensureUploadDirectories } from './server-utils';

export async function uploadFile(file: File | Blob) {
  try {
    // Ensure upload directories exist first
    await ensureUploadDirectories();
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${nanoid()}-${file instanceof File ? file.name : 'blob'}`;
    
    // Save to the events directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'events');
    const filepath = join(uploadDir, filename);
    
    await writeFile(filepath, buffer);

    // Return the URL path
    return `/uploads/events/${filename}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    throw new Error('Failed to upload file');
  }
} 