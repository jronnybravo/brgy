import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';
import { Locality } from '$lib/database/entities/Locality';

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

	// Load towns with barangays
	const towns = await Locality.find({
		where: { parent: null },
		relations: { children: true },
		order: { name: 'ASC' }
	});

	// Convert to plain objects for serialization
	const townsData = towns.map(town => ({
		id: town.id,
		name: town.name,
		children: town.children ? town.children.map(b => ({
			id: b.id,
			name: b.name
		})) : []
	}));

	const capabilities = {
		canCreatePersons: currentUser.can(Permission.CREATE_PERSONS),
		canUpdatePersons: currentUser.can(Permission.UPDATE_PERSONS),
		canDeletePersons: currentUser.can(Permission.DELETE_PERSONS),
	};

	return {
		user: locals.user,
		capabilities,
		towns: townsData
	};
};
