import { NextResponse } from 'next/server';
import { getPendingMemories, updateMemoryStatus } from '@/lib/db';
import { sendMemoryEmail } from '@/lib/email';

export async function GET(request: Request) {
  try {
    // 1. Basic security check (Optional Cron secret header validation)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all memories whose delivery_date has passed and status is 'pending'
    const pendingMemories = await getPendingMemories();
    console.log(`Cron execution started: found ${pendingMemories.length} memories due.`);

    const results = [];

    // 3. Process each memory capsule
    for (const memory of pendingMemories) {
      try {
        console.log(`Dispatching memory ${memory.id} to ${memory.recipient_email}`);
        
        const emailResult = await sendMemoryEmail({
          to: memory.recipient_email,
          photoUrl: memory.photo_url,
          voiceUrl: memory.voice_url,
          message: memory.message,
          deliveryDate: memory.delivery_date,
          createdDate: memory.created_at,
        });

        if (emailResult.success) {
          await updateMemoryStatus(memory.id, 'sent');
          results.push({ id: memory.id, recipient: memory.recipient_email, status: 'delivered' });
        } else {
          results.push({ id: memory.id, recipient: memory.recipient_email, status: 'failed', error: emailResult.error });
        }
      } catch (err: any) {
        console.error(`Failed to process memory ${memory.id}:`, err);
        results.push({ id: memory.id, recipient: memory.recipient_email, status: 'error', error: err?.message || err });
      }
    }

    return NextResponse.json({
      message: 'Cron execution completed',
      processed_count: pendingMemories.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron general exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Cron process failed' },
      { status: 500 }
    );
  }
}

// Support POST requests as well for easy button trigger from UI
export async function POST(request: Request) {
  return GET(request);
}
