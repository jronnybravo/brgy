import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Notification } from '$lib/database/entities/Notification';
import { User } from '$lib/database/entities/User';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user ? await User.findOneBy({ id: locals.user.id }) : null;
	if (!user) {
		return json(
			{
				success: false,
				notifications: [],
				error: 'Unauthorized'
			},
			{ status: 401 }
		);
	}

	try {
		const notifications = await Notification.find({
			where: { user: { id: user.id } },
			order: { createdAt: 'DESC' },
			relations: ['user']
		});

		return json({
			success: true,
			notifications
		});
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return json(
			{
				success: false,
				notifications: [],
				error: 'Failed to fetch notifications'
			},
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const user = locals.user ? await User.findOneBy({ id: locals.user.id }) : null;
	if (!user) {
		return json(
			{
				success: false,
				error: 'Unauthorized'
			},
			{ status: 401 }
		);
	}

	try {
		const body = await request.json();

		if (body.action === 'mark-as-read') {
			const notificationId = body.id;
			const notification = await Notification.findOne({
				where: { id: notificationId, user: { id: user.id } }
			});

			if (!notification) {
				return json(
					{
						success: false,
						error: 'Notification not found'
					},
					{ status: 404 }
				);
			}

			notification.readAt = new Date();
			await notification.save();

			return json({
				success: true,
				notification
			});
		} else if (body.action === 'mark-all-as-read') {
			await Notification.update(
				{ user: { id: user.id }, readAt: null },
				{ readAt: new Date() }
			);

			const updatedNotifications = await Notification.find({
				where: { user: { id: user.id } },
				order: { createdAt: 'DESC' }
			});

			return json({
				success: true,
				notifications: updatedNotifications
			});
		}

		return json(
			{
				success: false,
				error: 'Invalid action'
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error('Error updating notifications:', error);
		return json(
			{
				success: false,
				error: 'Failed to update notifications'
			},
			{ status: 500 }
		);
	}
};
