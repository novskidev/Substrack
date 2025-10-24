import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 
  'INR', 'MXN', 'BRL', 'ZAR', 'SEK', 'NOK', 'DKK', 'SGD',
  'HKD', 'NZD', 'KRW', 'TRY', 'RUB', 'PLN', 'THB', 'IDR',
  'MYR', 'PHP', 'CZK', 'ILS', 'CLP', 'PKR', 'EGP', 'VND'
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit to match frontend validation

function extractSessionToken(rawToken: string | null | undefined) {
  if (!rawToken) return null;
  const [token] = rawToken.split(".");
  return token ?? rawToken;
}

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const rawToken =
    authHeader?.replace('Bearer ', '') ??
    request.cookies.get('better-auth.session_token')?.value;
  const token = extractSessionToken(rawToken);
  
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'NO_TOKEN' }, { status: 401 }) };
  }
  
  try {
    const sessionData = await db.select().from(session).where(eq(session.token, token)).limit(1);
    
    if (sessionData.length === 0) {
      return { error: NextResponse.json({ error: 'Unauthorized', code: 'INVALID_SESSION' }, { status: 401 }) };
    }
    
    if (sessionData[0].expiresAt < new Date()) {
      return { error: NextResponse.json({ error: 'Unauthorized', code: 'SESSION_EXPIRED' }, { status: 401 }) };
    }
    
    const userId = sessionData[0].userId;
    return { userId };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: NextResponse.json({ error: 'Authentication failed', code: 'AUTH_ERROR' }, { status: 401 }) };
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }
    
    const userId = auth.userId;
    
    const userData = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      currency: user.currency
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
    
    if (userData.length === 0) {
      return NextResponse.json({ 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }
    
    return NextResponse.json(userData[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }
    
    const userId = auth.userId;
    
    const body = await request.json();
    const { name, image, currency } = body;
    
    const updates: Partial<{
      name: string;
      image: string | null;
      currency: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return NextResponse.json({ 
          error: 'Name cannot be empty', 
          code: 'INVALID_NAME' 
        }, { status: 400 });
      }
      updates.name = trimmedName;
    }
    
    if (image !== undefined) {
      if (image === null || image === '') {
        updates.image = null;
      } else if (typeof image === 'string' && image.startsWith('data:image/')) {
        const dataUrlMatch = image.match(/^data:image\/[a-zA-Z0-9+.\-]+;base64,/);

        if (!dataUrlMatch) {
          return NextResponse.json({
            error: 'Invalid image data URL',
            code: 'INVALID_IMAGE_DATA_URL'
          }, { status: 400 });
        }

        const base64Payload = image.slice(dataUrlMatch[0].length);

        try {
          const buffer = Buffer.from(base64Payload, 'base64');

          if (buffer.length === 0) {
            return NextResponse.json({
              error: 'Image data cannot be empty',
              code: 'EMPTY_IMAGE_DATA'
            }, { status: 400 });
          }

          if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
            return NextResponse.json({
              error: 'Image must be 5MB or smaller',
              code: 'IMAGE_TOO_LARGE'
            }, { status: 400 });
          }

          updates.image = image;
        } catch {
          return NextResponse.json({
            error: 'Invalid base64 image data',
            code: 'INVALID_IMAGE_BASE64'
          }, { status: 400 });
        }
      } else {
        try {
          new URL(image);
          updates.image = image;
        } catch {
          return NextResponse.json({ 
            error: 'Invalid image URL', 
            code: 'INVALID_IMAGE_URL' 
          }, { status: 400 });
        }
      }
    }
    
    if (currency !== undefined) {
      const upperCurrency = currency.toUpperCase();
      if (!VALID_CURRENCIES.includes(upperCurrency)) {
        return NextResponse.json({ 
          error: 'Invalid currency code. Must be one of: ' + VALID_CURRENCIES.join(', '), 
          code: 'INVALID_CURRENCY' 
        }, { status: 400 });
      }
      updates.currency = upperCurrency;
    }
    
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }
    
    const updatedUser = await db.update(user)
      .set(updates)
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        currency: user.currency
      });
    
    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user', 
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }
    
    return NextResponse.json(updatedUser[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
