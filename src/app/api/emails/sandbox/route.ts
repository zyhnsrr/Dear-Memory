import { NextResponse } from 'next/server';
import { getLocalEmails, clearLocalEmails, deleteLocalEmail } from '@/lib/email';

export async function GET() {
  try {
    const emails = await getLocalEmails();
    // Sort reverse chronological
    const sorted = [...emails].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching sandbox emails:', error);
    return NextResponse.json({ error: 'Failed to fetch sandbox emails' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await deleteLocalEmail(id);
      return NextResponse.json({ success: true, message: `Deleted email ${id}` });
    } else {
      await clearLocalEmails();
      return NextResponse.json({ success: true, message: 'Cleared all sandbox emails' });
    }
  } catch (error) {
    console.error('Error modifying sandbox emails:', error);
    return NextResponse.json({ error: 'Failed to modify sandbox emails' }, { status: 500 });
  }
}
