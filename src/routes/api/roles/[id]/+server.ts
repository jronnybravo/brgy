import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Role } from '$lib/database/entities/Role';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const roleId = parseInt(params.id || '0');
		if (isNaN(roleId)) {
			return json(
				{ error: 'Invalid role ID' },
				{ status: 400 }
			);
		}

		const dataSource = await getDataSource();
		const roleRepository = dataSource.getRepository(Role);
		const role = await roleRepository.findOne({
			where: { id: roleId }
		});

		if (!role) {
			return json(
				{ error: 'Role not found' },
				{ status: 404 }
			);
		}

		return json({ role });
	} catch (error) {
		console.error('Error fetching role:', error);
		return json(
			{ error: 'Failed to fetch role' },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const roleId = parseInt(params.id || '0');
		if (isNaN(roleId)) {
			return json(
				{ error: 'Invalid role ID' },
				{ status: 400 }
			);
		}

		const { name, description } = await request.json();

		if (!name || name.trim() === '') {
			return json(
				{ error: 'Role name is required' },
				{ status: 400 }
			);
		}

		const dataSource = await getDataSource();
		const roleRepository = dataSource.getRepository(Role);

		const role = await roleRepository.findOne({
			where: { id: roleId }
		});

		if (!role) {
			return json(
				{ error: 'Role not found' },
				{ status: 404 }
			);
		}

		// Check if another role has this name
		if (name.trim() !== role.name) {
			const existingRole = await roleRepository.findOne({
				where: { name: name.trim() }
			});

			if (existingRole) {
				return json(
					{ error: 'A role with this name already exists' },
					{ status: 400 }
				);
			}
		}

		role.name = name.trim();
		role.description = description?.trim() || undefined;

		await roleRepository.save(role);

		return json({ role });
	} catch (error) {
		console.error('Error updating role:', error);
		return json(
			{ error: 'Failed to update role' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const roleId = parseInt(params.id || '0');
		if (isNaN(roleId)) {
			return json(
				{ error: 'Invalid role ID' },
				{ status: 400 }
			);
		}

		const dataSource = await getDataSource();
		const roleRepository = dataSource.getRepository(Role);

		const role = await roleRepository.findOne({
			where: { id: roleId }
		});

		if (!role) {
			return json(
				{ error: 'Role not found' },
				{ status: 404 }
			);
		}

		await roleRepository.remove(role);

		return json({ message: 'Role deleted successfully' });
	} catch (error) {
		console.error('Error deleting role:', error);
		return json(
			{ error: 'Failed to delete role' },
			{ status: 500 }
		);
	}
};
