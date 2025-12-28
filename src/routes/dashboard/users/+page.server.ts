import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import { instanceToPlain } from 'class-transformer';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const users = instanceToPlain(await User.find({ order: { id: 'ASC' } }));
	const currentUser = instanceToPlain(await User.findOne({
		where: { id: locals.user.id }
	}));

	return {
		users,
		currentUser,
	};
};

export const actions = {
	deleteUser: async ({ request }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId')?.toString() || '0');

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			const user = await userRepository.findOne({
				where: { id: userId }
			});

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			await userRepository.remove(user);

			return {
				success: true,
				message: 'User deleted successfully'
			};
		} catch (error) {
			console.error('Delete user error:', error);
			return fail(500, {
				error: 'Failed to delete user'
			});
		}
	}
};
