import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { ElectionContest } from '$lib/database/entities/ElectionContest';
import type { RequestHandler } from './$types';

// GET all contests (with optional filters)
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();
		
		const electionId = url.searchParams.get('electionId');
		const scope = url.searchParams.get('scope');
		const position = url.searchParams.get('position');
		
		const where: any = {};
		if (electionId) where.electionId = parseInt(electionId);
		if (scope) where.scope = scope;
		if (position) where.position = position;
		
		const contests = await ElectionContest.find({
			where: Object.keys(where).length > 0 ? where : undefined,
			relations: ['election'],
			order: { position: 'ASC', jurisdiction: 'ASC' }
		});
		
		return json(contests);
	} catch (error: any) {
		console.error('Error fetching contests:', error);
		return json({ error: 'Failed to fetch contests', details: error.message }, { status: 500 });
	}
};

// POST - Create new contest
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		if (!data.name || !data.position || !data.electionId) {
			return json({ error: 'Name, position, and electionId are required' }, { status: 400 });
		}

		// Check if contest already exists
		const existing = await ElectionContest.findOne({
			where: { 
				name: data.name,
				electionId: data.electionId
			}
		});

		if (existing) {
			return json(existing);
		}

		const contest = ElectionContest.create(data);
		await contest.save();

		return json(contest, { status: 201 });
	} catch (error: any) {
		console.error('Error creating contest:', error);
		return json({ error: 'Failed to create contest', details: error.message }, { status: 500 });
	}
};

