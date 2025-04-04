import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { nanoid } from 'nanoid';
import path from 'path';
import { ensureUploadDirectories } from '@/lib/server-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log("[UPLOAD] Starting file upload process...");
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'posts'; // Default to posts if no type specified

    console.log("[UPLOAD] Received request:", {
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
      type
    });

    if (!file) {
      console.error("[UPLOAD] No file provided");
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large" },
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

      // Generate a unique filename without timestamp
      const filename = file.name.replace(/\s/g, '-');
      const ext = path.extname(filename);
      const uniqueFilename = `${uuidv4().split('-')[0]}_${filename}`;
      
      // Create the upload directory path based on type
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
      const relativePath = `/uploads/${type}/${uniqueFilename}`;
      const fullPath = path.join(uploadDir, uniqueFilename);

      console.log('Writing file:', {
        filename,
        uploadDir,
        filepath: fullPath,
        size: buffer.length
      });

      // Ensure upload directory exists
      await mkdir(uploadDir, { recursive: true });

      // Write the file
      await writeFile(fullPath, buffer);
      console.log('File written successfully to:', fullPath);
      
      // Return the public URL with forward slashes for web use
      const fileUrl = `/uploads/posts/${uniqueFilename}`;
      const publicPath = path.join(process.cwd(), 'public', fileUrl);
      
      // Save the file
      await writeFile(publicPath, buffer);
      
      console.log("[UPLOAD] File uploaded successfully:", { fileUrl: fileUrl });

      // Create response with caching headers
      const response = NextResponse.json({ 
        message: 'File uploaded successfully',
        fileUrl,
        url: fileUrl // Add url field for backward compatibility
      });

      // Add caching headers
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      response.headers.set('Content-Type', file.type);

      return response;
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
    console.error("[UPLOAD] Error:", error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 