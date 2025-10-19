import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq, like, or, and } from 'drizzle-orm';

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
      conditions.push(eq(subscriptions.status, status));
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

    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "Status must be one of: active, cancelled",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['streaming', 'cloud', 'domain', 'software', 'other'];
      if (!validCategories.includes(category)) {
        return NextResponse.json({ 
          error: "Category must be one of: streaming, cloud, domain, software, other",
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      name: name.trim(),
      cost: costValue,
      billingCycle: billingCycle.trim(),
      nextPaymentDate: nextPaymentDate.trim(),
      status: status ? status.trim() : 'active',
      createdAt: now,
      updatedAt: now,
    };

    if (category) {
      insertData.category = category.trim();
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
      if (category !== null && category !== '') {
        const validCategories = ['streaming', 'cloud', 'domain', 'software', 'other'];
        if (!validCategories.includes(category)) {
          return NextResponse.json({ 
            error: "Category must be one of: streaming, cloud, domain, software, other",
            code: "INVALID_CATEGORY" 
          }, { status: 400 });
        }
        updates.category = category.trim();
      } else {
        updates.category = null;
      }
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "Status must be one of: active, cancelled",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = status.trim();
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