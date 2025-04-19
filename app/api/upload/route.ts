import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { nanoid } from 'nanoid';
import path from 'path';
import { ensureUploadDirectories } from '@/lib/server-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

// Function to validate image content by checking file signatures (magic numbers)
async function isValidImageContent(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const firstBytes = Array.from(buffer.subarray(0, 8)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Check magic numbers for common image formats
    // JPEG: Start with ff d8 ff
    // PNG: Start with 89 50 4e 47 0d 0a 1a 0a
    // GIF: Start with 47 49 46 38 (GIF8)
    // WEBP: Has 'WEBP' at offset 8 after 'RIFF'
    
    const isJpeg = firstBytes.startsWith('ffd8ff');
    const isPng = firstBytes === '89504e470d0a1a0a';
    const isGif = firstBytes.startsWith('47494638');
    
    // For WEBP, we need to check RIFF header and WEBP marker
    let isWebp = false;
    if (buffer.length > 12) {
      const riff = String.fromCharCode(...buffer.subarray(0, 4));
      const webp = String.fromCharCode(...buffer.subarray(8, 12));
      isWebp = riff === 'RIFF' && webp === 'WEBP';
    }
    
    return isJpeg || isPng || isGif || isWebp;
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const isProfilePhoto = formData.get('isProfilePhoto') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Additional validation by checking file content
    const isValidImage = await isValidImageContent(file);
    if (!isValidImage && !validVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file content" },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit for videos, 10MB for images)
    const maxSize = validVideoTypes.includes(file.type) ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 400 }
      );
    }

    try {
      // Convert the file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate a unique filename without timestamp
      const filename = file.name.replace(/\s/g, '-');
      const ext = path.extname(filename);
      
      // Sanitize the filename
      const sanitizedName = filename
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9\-_\.]/g, '')
        .replace(/-{2,}/g, '-')
        .trim();
        
      const finalName = sanitizedName.length < 3 ? `file${ext}` : sanitizedName;
      const uniqueFilename = `${uuidv4().split('-')[0]}_${finalName}`;
      //test
      // Determine upload type and directory
      const uploadType = isProfilePhoto ? 'profiles' : type;
      const baseUploadPath = '/var/www/social-land/public/uploads';
      const uploadDir = path.join(baseUploadPath, uploadType);
      const relativePath = `/uploads/${uploadType}/${uniqueFilename}`;
      const fullPath = path.join(uploadDir, uniqueFilename);

      console.log('[UPLOAD] Starting file upload:', {
        type: uploadType,
        filename: uniqueFilename,
        path: fullPath
      });

      // Ensure base upload directory exists
      await fs.mkdir(baseUploadPath, { recursive: true });
      
      // Ensure type-specific directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Set proper permissions
      await fs.chmod(baseUploadPath, 0o755);
      await fs.chmod(uploadDir, 0o755);

      // Write the file
      await fs.writeFile(fullPath, buffer);
      
      // Set proper permissions for the file
      await fs.chmod(fullPath, 0o644);

      console.log('[UPLOAD] File uploaded successfully:', {
        path: fullPath,
        size: buffer.length,
        type: uploadType
      });

      // Return the public URL
      const publicUrl = relativePath;
      
      const response = NextResponse.json({ 
        message: 'File uploaded successfully',
        fileUrl: publicUrl,
        url: publicUrl
      });

      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      response.headers.set('Content-Type', file.type);

      return response;
    } catch (error: any) {
      console.error('[UPLOAD] File upload error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process file',
          details: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[UPLOAD] Internal server error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 