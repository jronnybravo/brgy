import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await User.findOneBy({ id: locals.user.id });
	if (!currentUser) {
		throw redirect(302, '/login');
	}

	if(!currentUser.can(Permission.READ_PERSONS)) {
		throw error(401, 'Unauthorized');
	}

	const capabilities = {
		canCreatePersons: currentUser.can(Permission.CREATE_PERSONS),
		canUpdatePersons: currentUser.can(Permission.UPDATE_PERSONS),
		canDeletePersons: currentUser.can(Permission.DELETE_PERSONS),
	};

	return {
		user: locals.user,
		capabilities
	};
};
