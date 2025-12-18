import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Person } from '$lib/database/entities/Person';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const barangayId = url.searchParams.get('barangayId');

		const where: any = {};
		if (barangayId) {
			where.barangayId = parseInt(barangayId);
		}

		const people = await Person.find({
			select: {
				id: true,
				firstName: true,
				lastName: true,
				birthdate: true,
				purok: true,
				sex: true,
				isSupporter: true,
				barangay: { 
					id: true,
					name: true,
					parent: { 
						id: true,
						name: true
					},
				},
			},
			where: Object.keys(where).length > 0 ? where : {},
			relations: {
				barangay: {
					parent: true
				}
			},
			order: { lastName: 'ASC', firstName: 'ASC' }
		});

		return json({
			success: true,
			data: people
		});
	} catch (error) {
		console.error('Error fetching people:', error);
		return json(
			{ success: false, error: 'Failed to fetch people', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.lastName || !data.firstName || !data.birthdate || !data.sex) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		const person = new Person();
		person.firstName = data.firstName;
		person.lastName = data.lastName;
		person.birthdate = new Date(data.birthdate);
		person.sex = data.sex;
		person.barangayId = data.barangayId || null;
		person.purok = data.purok || null;

		await person.save();

		return json({
			success: true,
			data: person
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating person:', error);
		return json(
			{ success: false, error: 'Failed to create person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
