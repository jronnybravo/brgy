import { AppDataSource } from '../src/lib/database/data-source';
import { Notification, NotificationType } from '../src/lib/database/entities/Notification';
import { User } from '../src/lib/database/entities/User';

async function seedNotifications() {
	try {
		// Initialize database connection
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize();
		}

		// Get all users
		const users = await User.find();

		if (users.length === 0) {
			console.log('No users found. Please seed users first using seed-users.ts');
			return;
		}

		// Create notifications for each user
		const welcomeMessages = [
			'Welcome to Brgy Map! Your account has been created successfully.',
			'Great! You can now access the dashboard to manage your data.',
			'Tip: Check out the People section to upload voter information.',
			'You can now view election results and statistics in the dashboard.',
			'Welcome aboard! Need help? Check the documentation for more info.',
			'Your account is all set! Start by exploring the dashboard.',
			'Thank you for joining! You now have access to all features.',
		];

		for (const user of users) {
			// Add 2-3 welcome notifications per user
			const notificationCount = Math.floor(Math.random() * 2) + 2;
			const usedMessages = new Set<number>();

			for (let i = 0; i < notificationCount; i++) {
				let messageIndex: number;
				do {
					messageIndex = Math.floor(Math.random() * welcomeMessages.length);
				} while (usedMessages.has(messageIndex) && usedMessages.size < welcomeMessages.length);

				usedMessages.add(messageIndex);

				const notification = new Notification();
				notification.user = user;
				notification.type = NotificationType.SUCCESS;
				notification.message = welcomeMessages[messageIndex];
				notification.link = null;
				notification.createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random date in past 7 days
				notification.readAt = null;

				await notification.save();
			}

			console.log(`✓ Created ${notificationCount} notifications for user: ${user.username}`);
		}

		console.log('✓ Notifications seeded successfully!');
	} catch (error) {
		console.error('Error seeding notifications:', error);
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy();
		}
	}
}

seedNotifications();
