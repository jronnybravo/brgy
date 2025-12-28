import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import { instanceToPlain } from 'class-transformer';
import { th } from '@faker-js/faker';
import { Permission } from '$lib/utils/Permission';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await User.findOne({
		where: { id: locals.user.id },
		relations: { role: true }
	});
	if(!currentUser) {
		cookies.delete('auth_token', { path: '/' });
		throw redirect(302, '/login');
	}

	if(!currentUser.can(Permission.READ_USERS)) {
		throw error(401, 'Unauthorized');
	}

	const capabilities = {
		canCreateUsers: currentUser.can(Permission.CREATE_USERS),
		canUpdateUsers: currentUser.can(Permission.UPDATE_USERS),
		canDeleteUsers: currentUser.can(Permission.DELETE_USERS),
	}

	const users = instanceToPlain(await User.find({ order: { id: 'ASC' } }));
	
	return {
		users,
		currentUser: instanceToPlain(currentUser),
		capabilities
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
