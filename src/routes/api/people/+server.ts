import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { People } from '$lib/database/entities/People';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const dataSource = await getDataSource();
		const peopleRepository = dataSource.getRepository(People);

		// Get query parameters
		const barangayId = url.searchParams.get('barangayId');

		// Build where clause
		const where: any = {};
		if (barangayId) {
			where.barangayId = parseInt(barangayId);
		}

		const people = await peopleRepository.find({
			where: Object.keys(where).length > 0 ? where : undefined,
			relations: ['barangay'],
			order: { lastName: 'ASC', firstName: 'ASC' }
		});

		return json(people);
	} catch (error) {
		console.error('Error fetching people:', error);
		return json(
			{ error: 'Failed to fetch people', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.lastName || !data.firstName || !data.birthdate || !data.sex) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const dataSource = await getDataSource();
		const peopleRepository = dataSource.getRepository(People);

		const person = peopleRepository.create({
			lastName: data.lastName,
			firstName: data.firstName,
			birthdate: new Date(data.birthdate),
			sex: data.sex,
			barangayId: data.barangayId || null,
			purok: data.purok || null
		});

		await peopleRepository.save(person);

		return json(person, { status: 201 });
	} catch (error) {
		console.error('Error creating person:', error);
		return json(
			{ error: 'Failed to create person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
