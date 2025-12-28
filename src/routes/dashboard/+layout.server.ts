import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await User.findOne({
		where: { id: locals.user.id },
		relations: { role: true }
	});
	if (!currentUser) {
		throw redirect(302, '/login');
	}

	const capabilities = {
		canReadUsers: currentUser.can(Permission.READ_USERS),
		canReadRoles: currentUser.can(Permission.READ_ROLES),
		canReadPersons: currentUser.can(Permission.READ_PERSONS),
		canReadAssistances: currentUser.can(Permission.READ_ASSISTANCES),
	};

	return {
		user: locals.user,
		capabilities
	};
};
