import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';
import { Locality } from '$lib/database/entities/Locality';
import { instanceToPlain } from 'class-transformer';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await User.findOne({ 
		where: { id: locals.user.id },
		relations: { role: true }
	});
	if (!currentUser) {
		cookies.delete('auth_token', { path: '/' });
		throw redirect(302, '/login');
	}

	if(!currentUser.can(Permission.READ_PERSONS)) {
		throw error(401, 'Unauthorized');
	}

	const towns = await currentUser.getJurisdictionalTowns();
	const barangays = await currentUser.getJurisdictionalBarangays();

	const capabilities = {
		canCreatePersons: currentUser.can(Permission.CREATE_PERSONS),
		canUpdatePersons: currentUser.can(Permission.UPDATE_PERSONS),
		canDeletePersons: currentUser.can(Permission.DELETE_PERSONS),
	};

	return {
		user: locals.user,
		capabilities,
		towns: instanceToPlain(towns),
		barangays: instanceToPlain(barangays)
	};
};
