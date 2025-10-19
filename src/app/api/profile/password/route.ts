import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { account, session } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function PATCH(request: NextRequest) {
  try {
    // Authentication verification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('better-auth.session_token')?.value;

    if (!token) {
      return NextResponse.json({ 
        error: 'Authentication required', 
        code: 'NO_TOKEN' 
      }, { status: 401 });
    }

    const sessionData = await db.select()
      .from(session)
      .where(eq(session.token, token))
      .limit(1);

    if (sessionData.length === 0 || sessionData[0].expiresAt < new Date()) {
      return NextResponse.json({ 
        error: 'Authentication required', 
        code: 'INVALID_SESSION' 
      }, { status: 401 });
    }

    const userId = sessionData[0].userId;

    // Parse and validate request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'Current password and new password are required',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT' 
      }, { status: 400 });
    }

    // Find user's password account (credential provider)
    const userAccount = await db.select()
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, 'credential')
        )
      )
      .limit(1);

    if (userAccount.length === 0 || !userAccount[0].password) {
      return NextResponse.json({ 
        error: 'Password authentication not available for this account',
        code: 'NO_PASSWORD_ACCOUNT' 
      }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword, 
      userAccount[0].password
    );

    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Current password is incorrect',
        code: 'WRONG_PASSWORD' 
      }, { status: 401 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in account table
    const updated = await db.update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(account.id, userAccount[0].id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update password',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Password updated successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH /api/profile/password error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}