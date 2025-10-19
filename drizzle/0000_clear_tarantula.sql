CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cost` real NOT NULL,
	`billing_cycle` text NOT NULL,
	`next_payment_date` text NOT NULL,
	`category` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
