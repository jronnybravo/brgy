import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Voter } from '$lib/database/entities/Voter';
import type { RequestHandler } from './$types';

// GET all voters (with optional locality filter) - ActiveRecord pattern
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();

		const localityId = url.searchParams.get('localityId');

		// ActiveRecord pattern
		let voters;
		if (localityId) {
			voters = await Voter.find({
				where: { localityId: parseInt(localityId) },
				relations: ['locality']
			});
		} else {
			voters = await Voter.find({
				relations: ['locality']
			});
		}

		return json(voters);
	} catch (error) {
		console.error('Error fetching voters:', error);
		return json({ error: 'Failed to fetch voters', details: error.message }, { status: 500 });
	}
};

// POST - Create new voter - ActiveRecord pattern
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		// Validate required fields
		if (!data.firstName || !data.lastName || !data.localityId) {
			return json(
				{ error: 'First name, last name, and localityId are required' },
				{ status: 400 }
			);
		}

		// ActiveRecord pattern
		const voter = Voter.create(data);
		await voter.save();

		// Fetch with relations
		const savedVoter = await Voter.findOne({
			where: { id: voter.id },
			relations: ['locality']
		});

		return json(savedVoter, { status: 201 });
	} catch (error) {
		console.error('Error creating voter:', error);
		return json({ error: 'Failed to create voter', details: error.message }, { status: 500 });
	}
};

