import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { nanoid } from 'nanoid';
import path from 'path';
import { ensureUploadDirectories } from '@/lib/server-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'posts'; // Default to posts if no type specified

    if (!file) {
      console.error('No file received in request');
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadType: type
    });

    // Ensure upload directories exist
    try {
      await ensureUploadDirectories();
    } catch (error: any) {
      console.error('Failed to ensure upload directories:', error);
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: error.message
        },
        { status: 500 }
      );
    }

    try {
      // Convert the file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate a unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const ext = path.extname(file.name);
      const filename = `${nanoid()}_${timestamp}${ext}`;
      
      // Create the upload directory path based on type
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
      const filepath = path.join(uploadDir, filename);

      console.log('Writing file:', {
        filename,
        uploadDir,
        filepath,
        size: buffer.length
      });

      // Write the file
      await writeFile(filepath, buffer);
      console.log('File written successfully to:', filepath);
      
      // Return the public URL with forward slashes for web use
      const fileUrl = `/uploads/${type}/${filename}`.replace(/\\/g, '/');
      console.log('Upload successful, returning URL:', fileUrl);
      
      return NextResponse.json({ 
        fileUrl,
        message: 'File uploaded successfully!' 
      });
    } catch (error: any) {
      console.error('Error processing file:', {
        error,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { 
          error: 'Failed to process file',
          details: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unhandled error in upload:', {
      error,
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 