import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { People } from '$lib/database/entities/People';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const dataSource = await getDataSource();
		const peopleRepository = dataSource.getRepository(People);

		const person = await peopleRepository.findOne({
			where: { id: parseInt(params.id!) },
			relations: ['barangay']
		});

		if (!person) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		return json(person);
	} catch (error) {
		console.error('Error fetching person:', error);
		return json(
			{ error: 'Failed to fetch person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const dataSource = await getDataSource();
		const peopleRepository = dataSource.getRepository(People);

		const person = await peopleRepository.findOne({
			where: { id: parseInt(params.id!) }
		});

		if (!person) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		if (data.lastName) person.lastName = data.lastName;
		if (data.firstName) person.firstName = data.firstName;
		if (data.birthdate) person.birthdate = new Date(data.birthdate);
		if (data.sex) person.sex = data.sex;
		if (data.barangayId !== undefined) person.barangayId = data.barangayId;
		if (data.purok !== undefined) person.purok = data.purok;

		await peopleRepository.save(person);

		return json(person);
	} catch (error) {
		console.error('Error updating person:', error);
		return json(
			{ error: 'Failed to update person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const dataSource = await getDataSource();
		const peopleRepository = dataSource.getRepository(People);

		const person = await peopleRepository.findOne({
			where: { id: parseInt(params.id!) }
		});

		if (!person) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		await peopleRepository.remove(person);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting person:', error);
		return json(
			{ error: 'Failed to delete person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
