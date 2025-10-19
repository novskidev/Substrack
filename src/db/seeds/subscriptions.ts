import { db } from '@/db';
import { subscriptions } from '@/db/schema';

async function main() {
    const now = new Date();
    const currentTimestamp = now.toISOString();

    const sampleSubscriptions = [
        {
            name: 'Netflix',
            cost: 15.99,
            billingCycle: 'monthly',
            nextPaymentDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'streaming',
            description: 'Premium streaming service for movies and TV shows',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Spotify',
            cost: 9.99,
            billingCycle: 'monthly',
            nextPaymentDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'streaming',
            description: 'Music streaming service with premium features',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'AWS Cloud',
            cost: 25.00,
            billingCycle: 'monthly',
            nextPaymentDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'cloud',
            description: 'Cloud computing and storage services',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Domain Registration',
            cost: 12.00,
            billingCycle: 'yearly',
            nextPaymentDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'domain',
            description: 'Annual domain name registration and renewal',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Adobe Creative Cloud',
            cost: 52.99,
            billingCycle: 'monthly',
            nextPaymentDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'software',
            description: 'Complete suite of creative applications including Photoshop, Illustrator, and Premiere Pro',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'GitHub Pro',
            cost: 4.00,
            billingCycle: 'monthly',
            nextPaymentDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'software',
            description: 'Professional developer tools and advanced repository features',
            status: 'active',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(subscriptions).values(sampleSubscriptions);
    
    console.log('✅ Subscriptions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});