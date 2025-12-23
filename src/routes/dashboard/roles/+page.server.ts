import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { Role } from '$lib/database/entities/Role';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const dataSource = await getDataSource();
	const roleRepository = dataSource.getRepository(Role);
	const rolesData = await roleRepository.find({
		order: {
			createdAt: 'ASC'
		}
	});

	// Convert dates to ISO strings for serialization
	const roles = rolesData.map(role => ({
		id: role.id,
		name: role.name,
		description: role.description || null,
		permissions: role.permissions || [],
		createdAt: role.createdAt.toISOString(),
		updatedAt: role.updatedAt.toISOString()
	}));

	return {
		roles,
		currentUser: {
			id: locals.user.id,
			username: locals.user.username
		}
	};
};

export const actions: Actions = {
	deleteRole: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return {
				error: 'Role ID is required'
			};
		}

		try {
			const dataSource = await getDataSource();
			const roleRepository = dataSource.getRepository(Role);

			const role = await roleRepository.findOne({
				where: { id: parseInt(id) }
			});

			if (!role) {
				return {
					error: 'Role not found'
				};
			}

			await roleRepository.remove(role);

			return {
				success: true,
				message: 'Role deleted successfully'
			};
		} catch (error) {
			console.error('Error deleting role:', error);
			return {
				error: 'Failed to delete role'
			};
		}
	}
};
