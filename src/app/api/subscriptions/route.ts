import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq, like, or, and } from 'drizzle-orm';
import {
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_STATUS_LABELS,
  canTransitionSubscriptionStatus,
  getPermittedStatusOptions,
  isValidSubscriptionStatus,
  type SubscriptionStatusValue,
} from '@/constants/subscription-statuses';

const STATUS_OPTIONS_LABEL = SUBSCRIPTION_STATUS_OPTIONS.map(
  (option) => option.label
).join(', ');

const normalizeStatus = (value: string): SubscriptionStatusValue | null => {
  const normalized = value.trim().toLowerCase();
  return isValidSubscriptionStatus(normalized) ? normalized : null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.id, parseInt(id)))
        .limit(1);

      if (subscription.length === 0) {
        return NextResponse.json({ 
          error: 'Subscription not found',
          code: "NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(subscription[0], { status: 200 });
    }

    // List with pagination, search, and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const billingCycle = searchParams.get('billingCycle');

    let query = db.select().from(subscriptions);

    // Build filter conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(subscriptions.name, `%${search}%`),
          like(subscriptions.description, `%${search}%`)
        )
      );
    }

    if (status) {
      const normalizedStatus = normalizeStatus(status);
      if (!normalizedStatus) {
        return NextResponse.json({ 
          error: `Status must be one of: ${STATUS_OPTIONS_LABEL}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(subscriptions.status, normalizedStatus));
    }

    if (category) {
      conditions.push(eq(subscriptions.category, category));
    }

    if (billingCycle) {
      conditions.push(eq(subscriptions.billingCycle, billingCycle));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cost, billingCycle, nextPaymentDate, category, description, status } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (cost === undefined || cost === null) {
      return NextResponse.json({ 
        error: "Cost is required",
        code: "MISSING_COST" 
      }, { status: 400 });
    }

    if (!billingCycle || billingCycle.trim() === '') {
      return NextResponse.json({ 
        error: "Billing cycle is required",
        code: "MISSING_BILLING_CYCLE" 
      }, { status: 400 });
    }

    if (!nextPaymentDate || nextPaymentDate.trim() === '') {
      return NextResponse.json({ 
        error: "Next payment date is required",
        code: "MISSING_NEXT_PAYMENT_DATE" 
      }, { status: 400 });
    }

    // Validate cost is positive number
    const costValue = parseFloat(cost);
    if (isNaN(costValue) || costValue <= 0) {
      return NextResponse.json({ 
        error: "Cost must be a positive number",
        code: "INVALID_COST" 
      }, { status: 400 });
    }

    // Validate billingCycle enum
    const validBillingCycles = ['monthly', 'yearly', 'quarterly'];
    if (!validBillingCycles.includes(billingCycle)) {
      return NextResponse.json({ 
        error: "Billing cycle must be one of: monthly, yearly, quarterly",
        code: "INVALID_BILLING_CYCLE" 
      }, { status: 400 });
    }

    // Validate nextPaymentDate is valid ISO datetime
    const paymentDate = new Date(nextPaymentDate);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json({ 
        error: "Next payment date must be a valid ISO datetime string",
        code: "INVALID_NEXT_PAYMENT_DATE" 
      }, { status: 400 });
    }

    if (status !== undefined && status !== null && typeof status !== 'string') {
      return NextResponse.json({ 
        error: "Status must be a string value",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    let normalizedStatus: SubscriptionStatusValue = 'active';
    if (typeof status === 'string') {
      const nextStatus = normalizeStatus(status);
      if (!nextStatus) {
        return NextResponse.json({ 
          error: `Status must be one of: ${STATUS_OPTIONS_LABEL}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      normalizedStatus = nextStatus;
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      name: name.trim(),
      cost: costValue,
      billingCycle: billingCycle.trim(),
      nextPaymentDate: nextPaymentDate.trim(),
      status: normalizedStatus,
      createdAt: now,
      updatedAt: now,
    };

    if (typeof category === 'string') {
      const trimmedCategory = category.trim();
      if (trimmedCategory !== '') {
        insertData.category = trimmedCategory;
      }
    }

    if (description) {
      insertData.description = description.trim();
    }

    const newSubscription = await db.insert(subscriptions)
      .values(insertData)
      .returning();

    return NextResponse.json(newSubscription[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if subscription exists
    const existing = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Subscription not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const { name, cost, billingCycle, nextPaymentDate, category, description, status } = body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add optional updates
    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json({ 
          error: "Name cannot be empty",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (cost !== undefined) {
      const costValue = parseFloat(cost);
      if (isNaN(costValue) || costValue <= 0) {
        return NextResponse.json({ 
          error: "Cost must be a positive number",
          code: "INVALID_COST" 
        }, { status: 400 });
      }
      updates.cost = costValue;
    }

    if (billingCycle !== undefined) {
      const validBillingCycles = ['monthly', 'yearly', 'quarterly'];
      if (!validBillingCycles.includes(billingCycle)) {
        return NextResponse.json({ 
          error: "Billing cycle must be one of: monthly, yearly, quarterly",
          code: "INVALID_BILLING_CYCLE" 
        }, { status: 400 });
      }
      updates.billingCycle = billingCycle.trim();
    }

    if (nextPaymentDate !== undefined) {
      const paymentDate = new Date(nextPaymentDate);
      if (isNaN(paymentDate.getTime())) {
        return NextResponse.json({ 
          error: "Next payment date must be a valid ISO datetime string",
          code: "INVALID_NEXT_PAYMENT_DATE" 
        }, { status: 400 });
      }
      updates.nextPaymentDate = nextPaymentDate.trim();
    }

    if (category !== undefined) {
      if (category !== null && category.trim() !== '') {
        updates.category = category.trim();
      } else {
        updates.category = null;
      }
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (status !== undefined) {
      if (typeof status !== 'string') {
        return NextResponse.json({ 
          error: "Status must be a string value",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      const nextStatus = normalizeStatus(status);
      if (!nextStatus) {
        return NextResponse.json({ 
          error: `Status must be one of: ${STATUS_OPTIONS_LABEL}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      const currentStatus = existing[0].status as SubscriptionStatusValue;
      if (!canTransitionSubscriptionStatus(currentStatus, nextStatus)) {
        const allowedStatuses = getPermittedStatusOptions(currentStatus);
        const allowedTransitionLabels = allowedStatuses
          .filter((value) => value !== currentStatus)
          .map((value) => SUBSCRIPTION_STATUS_LABELS[value])
          .join(', ');
        const allowedLabelText =
          allowedTransitionLabels || SUBSCRIPTION_STATUS_LABELS[currentStatus];
        return NextResponse.json({
          error: `Status cannot change from ${SUBSCRIPTION_STATUS_LABELS[currentStatus]} to ${SUBSCRIPTION_STATUS_LABELS[nextStatus]}. Allowed next statuses: ${allowedLabelText}`,
          code: "INVALID_STATUS_TRANSITION"
        }, { status: 400 });
      }
      updates.status = nextStatus;
    }

    const updated = await db.update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if subscription exists
    const existing = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Subscription not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(subscriptions)
      .where(eq(subscriptions.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Subscription deleted successfully',
      subscription: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
