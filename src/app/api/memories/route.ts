import { NextResponse } from 'next/server';
import { createMemory, getAllMemories, deleteMemoryLocal } from '@/lib/db';
import { uploadFile } from '@/lib/storage';

export async function GET() {
  try {
    const memories = await getAllMemories();
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { photo, voice, recipient_email, message, schedule_type } = body;

    if (!photo || !recipient_email || !schedule_type) {
      return NextResponse.json(
        { error: 'Photo, recipient email, and schedule type are required' },
        { status: 400 }
      );
    }

    // 1. Calculate delivery date
    const deliveryDate = new Date();
    if (schedule_type === '1-month') {
      deliveryDate.setMonth(deliveryDate.getMonth() + 1);
    } else if (schedule_type === '1-year') {
      deliveryDate.setFullYear(deliveryDate.getFullYear() + 1);
    } else if (schedule_type === 'test-1-min') {
      deliveryDate.setMinutes(deliveryDate.getMinutes() + 1);
    } else if (schedule_type === 'immediate') {
      deliveryDate.setSeconds(deliveryDate.getSeconds() + 5); // 5 seconds buffer
    } else {
      return NextResponse.json({ error: 'Invalid schedule type' }, { status: 400 });
    }

    // 2. Decode and upload photo
    const photoMatch = photo.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!photoMatch) {
      return NextResponse.json({ error: 'Invalid photo format' }, { status: 400 });
    }
    const photoExt = photoMatch[1];
    const photoBase64 = photoMatch[2];
    const photoBuffer = Buffer.from(photoBase64, 'base64');
    const photoFileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${photoExt}`;
    const photoUrl = await uploadFile(photoBuffer, photoFileName, `image/${photoExt}`, 'photos');

    // 3. Decode and upload voice note (optional)
    let voiceUrl = undefined;
    if (voice) {
      const voiceMatch = voice.match(/^data:audio\/(\w+);base64,(.+)$/) || voice.match(/^data:video\/(\w+);base64,(.+)$/);
      if (voiceMatch) {
        const voiceExt = voiceMatch[1];
        const voiceBase64 = voiceMatch[2];
        const voiceBuffer = Buffer.from(voiceBase64, 'base64');
        const voiceFileName = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${voiceExt}`;
        // MediaRecorder webm is often recorded as video/webm or audio/webm depending on the browser
        const mime = voice.includes('video') ? `video/${voiceExt}` : `audio/${voiceExt}`;
        voiceUrl = await uploadFile(voiceBuffer, voiceFileName, mime, 'voices');
      } else {
        console.warn('Voice format invalid or unsupported: skipping voice note upload');
      }
    }

    // 4. Save to Database
    const memory = await createMemory({
      recipient_email,
      photo_url: photoUrl,
      voice_url: voiceUrl,
      message: message || undefined,
      schedule_type,
      delivery_date: deliveryDate.toISOString(),
    });

    return NextResponse.json(memory);
  } catch (error: any) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create memory' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Id is required' }, { status: 400 });
    }
    await deleteMemoryLocal(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
