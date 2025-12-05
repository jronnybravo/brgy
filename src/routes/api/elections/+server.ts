import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Election } from '$lib/database/entities/Election';
import type { RequestHandler } from './$types';

// GET all elections
export const GET: RequestHandler = async () => {
	try {
		await getDataSource();
		const elections = await Election.find({
			order: { year: 'DESC' }
		});
		return json(elections);
	} catch (error: any) {
		console.error('Error fetching elections:', error);
		return json({ error: 'Failed to fetch elections', details: error.message }, { status: 500 });
	}
};

// POST - Create new election
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		if (!data.name || !data.year) {
			return json({ error: 'Name and year are required' }, { status: 400 });
		}

		// Check if election already exists
		const existing = await Election.findOne({
			where: { year: data.year }
		});

		if (existing) {
			return json(existing);
		}

		const election = Election.create(data);
		await election.save();

		return json(election, { status: 201 });
	} catch (error: any) {
		console.error('Error creating election:', error);
		return json({ error: 'Failed to create election', details: error.message }, { status: 500 });
	}
};

