import { getSupabase } from './db';
import fs from 'fs/promises';
import path from 'path';

/**
 * Uploads a file (Buffer) to Supabase Storage or local fallback directory.
 * @param buffer The file content as a Buffer.
 * @param fileName The target filename.
 * @param mimeType The file MIME type (e.g. image/png, audio/webm).
 * @param bucketName The Supabase storage bucket name ('photos' or 'voices').
 * @returns The public URL of the uploaded file.
 */
export const uploadFile = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: 'photos' | 'voices'
): Promise<string> => {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error(`Supabase storage upload error in bucket ${bucketName}:`, error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  } else {
    // Local Sandbox Storage Fallback
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);
    
    // Return relative path accessible from browser
    return `/uploads/${fileName}`;
  }
};
