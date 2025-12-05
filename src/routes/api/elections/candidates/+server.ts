import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Candidate } from '$lib/database/entities/Candidate';
import type { RequestHandler } from './$types';

// GET all candidates (with optional filters)
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();
		
		const contestId = url.searchParams.get('contestId');
		
		const where: any = {};
		if (contestId) where.contestId = parseInt(contestId);
		
		const candidates = await Candidate.find({
			where: Object.keys(where).length > 0 ? where : undefined,
			relations: ['contest'],
			order: { ballotNumber: 'ASC', name: 'ASC' }
		});
		
		return json(candidates);
	} catch (error: any) {
		console.error('Error fetching candidates:', error);
		return json({ error: 'Failed to fetch candidates', details: error.message }, { status: 500 });
	}
};

// POST - Create new candidate
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		if (!data.name || !data.contestId) {
			return json({ error: 'Name and contestId are required' }, { status: 400 });
		}

		// Check if candidate already exists
		const existing = await Candidate.findOne({
			where: { 
				name: data.name,
				contestId: data.contestId
			}
		});

		if (existing) {
			return json(existing);
		}

		const candidate = Candidate.create(data);
		await candidate.save();

		return json(candidate, { status: 201 });
	} catch (error: any) {
		console.error('Error creating candidate:', error);
		return json({ error: 'Failed to create candidate', details: error.message }, { status: 500 });
	}
};

