import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Role } from '$lib/database/entities/Role';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const dataSource = await getDataSource();
		const roleRepository = dataSource.getRepository(Role);
		const roles = await roleRepository.find({
			order: {
				createdAt: 'ASC'
			}
		});

		return json({ roles });
	} catch (error) {
		console.error('Error fetching roles:', error);
		return json(
			{ error: 'Failed to fetch roles' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, description } = await request.json();

		if (!name || name.trim() === '') {
			return json(
				{ error: 'Role name is required' },
				{ status: 400 }
			);
		}

		const dataSource = await getDataSource();
		const roleRepository = dataSource.getRepository(Role);

		// Check if role already exists
		const existingRole = await roleRepository.findOne({
			where: { name: name.trim() }
		});

		if (existingRole) {
			return json(
				{ error: 'A role with this name already exists' },
				{ status: 400 }
			);
		}

		const role = roleRepository.create({
			name: name.trim(),
			description: description?.trim() || undefined
		});

		await roleRepository.save(role);

		return json({ role }, { status: 201 });
	} catch (error) {
		console.error('Error creating role:', error);
		return json(
			{ error: 'Failed to create role' },
			{ status: 500 }
		);
	}
};
