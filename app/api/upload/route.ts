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
    
    console.log("[UPLOAD] Image validation:", { 
      firstBytes, 
      isJpeg, 
      isPng, 
      isGif, 
      isWebp,
      declaredType: file.type 
    });
    
    return isJpeg || isPng || isGif || isWebp;
  } catch (error) {
    console.error("[UPLOAD] Error validating image content:", error);
    return false;
  }
}

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
    const isProfilePhoto = formData.get('isProfilePhoto') === 'true';

    console.log("[UPLOAD] Received request:", {
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
      type,
      isProfilePhoto
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

    // Additional validation by checking file content
    const isValidImage = await isValidImageContent(file);
    if (!isValidImage) {
      console.error("[UPLOAD] Invalid image content detected");
      return NextResponse.json(
        { error: "Invalid image content" },
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
      uploadType: type,
      isProfilePhoto
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
      
      // Sanitize the filename - remove emojis, special characters, and non-Latin characters
      const sanitizedName = filename
        // Remove emojis and non-Latin characters
        .replace(/[^\x00-\x7F]/g, '')
        // Remove special characters (except dash, underscore, and dot)
        .replace(/[^a-zA-Z0-9\-_\.]/g, '')
        // Replace multiple dashes with a single dash
        .replace(/-{2,}/g, '-')
        // If empty after sanitization, use a generic name
        .trim();
        
      // Use a generic name if the sanitized name is empty or too short
      const finalName = sanitizedName.length < 3 ? `file${ext}` : sanitizedName;
      
      console.log("[UPLOAD] Filename sanitization:", {
        original: file.name,
        afterSpacesReplaced: filename,
        afterSanitization: sanitizedName,
        finalName: finalName
      });
      
      // Create the unique filename with UUID
      const uniqueFilename = `${uuidv4().split('-')[0]}_${finalName}`;
      
      // Determine the upload directory based on whether it's a profile photo
      const uploadType = isProfilePhoto ? 'profiles' : type;
      const uploadDir = path.join('/var/www/OG-GRAM/public/uploads', uploadType);
      const relativePath = `/uploads/${uploadType}/${uniqueFilename}`;
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
      const publicUrl = `/public${relativePath}`;
      console.log('Upload successful, returning URL:', publicUrl);
      
      console.log("[UPLOAD] File uploaded successfully:", { fileUrl: publicUrl });

      // Create response with caching headers
      const response = NextResponse.json({ 
        message: 'File uploaded successfully',
        fileUrl: publicUrl,
        url: publicUrl
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