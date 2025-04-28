import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ isBanned: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isBanned: true }
    });

    return NextResponse.json({ isBanned: user?.isBanned || false });
  } catch (error) {
    console.error('Error checking ban status:', error);
    return NextResponse.json({ isBanned: false });
  }
} 