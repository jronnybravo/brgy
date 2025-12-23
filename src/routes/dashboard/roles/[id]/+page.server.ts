import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { Role } from '$lib/database/entities/Role';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const roleId = params.id;

	// If id is 'new', return empty role data for creation
	if (roleId === 'new') {
		return {
			role: null,
			isNew: true,
			currentUser: {
				id: locals.user.id,
				username: locals.user.username
			}
		};
	}

	// Otherwise, fetch the role for editing
	const numRoleId = parseInt(roleId || '0');
	if (isNaN(numRoleId)) {
		throw redirect(302, '/dashboard/roles');
	}

	const dataSource = await getDataSource();
	const roleRepository = dataSource.getRepository(Role);

	const role = await roleRepository.findOne({
		where: { id: numRoleId }
	});

	if (!role) {
		throw redirect(302, '/dashboard/roles');
	}

	return {
		role: {
			id: role.id,
			name: role.name,
			description: role.description || null,
			permissions: role.permissions || [],
			createdAt: role.createdAt.toISOString(),
			updatedAt: role.updatedAt.toISOString()
		},
		isNew: false,
		currentUser: {
			id: locals.user.id,
			username: locals.user.username
		}
	};
};

export const actions: Actions = {
	createRole: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const description = formData.get('description')?.toString();
		const permissionsStr = formData.get('permissions')?.toString() || '[]';

		if (!name || name.trim() === '') {
			return fail(400, {
				error: 'Role name is required'
			});
		}

		let permissions: string[] = [];
		try {
			permissions = JSON.parse(permissionsStr);
		} catch (e) {
			permissions = [];
		}

		try {
			const dataSource = await getDataSource();
			const roleRepository = dataSource.getRepository(Role);

			// Check if role already exists
			const existingRole = await roleRepository.findOne({
				where: { name: name.trim() }
			});

			if (existingRole) {
				return fail(400, {
					error: 'A role with this name already exists'
				});
			}

			const role = roleRepository.create({
				name: name.trim(),
				description: description?.trim() || undefined,
				permissions: permissions
			});

			await roleRepository.save(role);

			return {
				success: true,
				message: 'Role created successfully'
			};
		} catch (error) {
			console.error('Error creating role:', error);
			return fail(500, {
				error: 'Failed to create role'
			});
		}
	},

	updateRole: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString();
		const description = formData.get('description')?.toString();
		const permissionsStr = formData.get('permissions')?.toString() || '[]';

		if (!id || !name || name.trim() === '') {
			return fail(400, {
				error: 'Role ID and name are required'
			});
		}

		let permissions: string[] = [];
		try {
			permissions = JSON.parse(permissionsStr);
		} catch (e) {
			permissions = [];
		}

		try {
			const dataSource = await getDataSource();
			const roleRepository = dataSource.getRepository(Role);

			const role = await roleRepository.findOne({
				where: { id: parseInt(id) }
			});

			if (!role) {
				return fail(404, {
					error: 'Role not found'
				});
			}

			// Check if another role has this name
			if (name.trim() !== role.name) {
				const existingRole = await roleRepository.findOne({
					where: { name: name.trim() }
				});

				if (existingRole) {
					return fail(400, {
						error: 'A role with this name already exists'
					});
				}
			}

			role.name = name.trim();
			role.description = description?.trim() || undefined;
			role.permissions = permissions;

			await roleRepository.save(role);

			return {
				success: true,
				message: 'Role updated successfully'
			};
		} catch (error) {
			console.error('Error updating role:', error);
			return fail(500, {
				error: 'Failed to update role'
			});
		}
	}
};
