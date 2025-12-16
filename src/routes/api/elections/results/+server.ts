import { json } from '@sveltejs/kit';
import { getDataSource, AppDataSource } from '$lib/database/data-source';
import { ElectionResult } from '$lib/database/entities/ElectionResult';
import { Candidate } from '$lib/database/entities/Candidate';
import type { RequestHandler } from './$types';

// GET election results (with filters)
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();
		
		const contestId = url.searchParams.get('contestId');
		const localityId = url.searchParams.get('localityId');
		const candidateId = url.searchParams.get('candidateId');
		
		if (!contestId && !localityId && !candidateId) {
			return json({ error: 'At least one filter is required (contestId, localityId, or candidateId)' }, { status: 400 });
		}
		
		// Build query with joins
		const query = AppDataSource.getRepository(ElectionResult)
			.createQueryBuilder('result')
			.leftJoinAndSelect('result.candidate', 'candidate')
			.leftJoinAndSelect('candidate.contest', 'contest')
			.leftJoinAndSelect('result.locality', 'locality');
		
		if (contestId) {
			query.andWhere('contest.id = :contestId', { contestId: parseInt(contestId) });
		}
		
		if (localityId) {
			query.andWhere('result.localityId = :localityId', { localityId: parseInt(localityId) });
		}
		
		if (candidateId) {
			query.andWhere('result.candidateId = :candidateId', { candidateId: parseInt(candidateId) });
		}
		
		const results = await query.getMany();
		
		return json(results);
	} catch (error: any) {
		console.error('Error fetching results:', error);
		return json({ error: 'Failed to fetch results', details: error.message }, { status: 500 });
	}
};

// POST - Create new result
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		if (!data.candidateId || !data.localityId || data.votes === undefined) {
			return json({ error: 'candidateId, localityId, and votes are required' }, { status: 400 });
		}

		// Check if result already exists (update if so)
		let result = await ElectionResult.findOne({
			where: { 
				candidateId: data.candidateId,
				localityId: data.localityId
			}
		});

		if (result) {
			// Aggregate votes from multiple precincts
			result.votes += data.votes;
			await result.save();
		} else {
			result = ElectionResult.create(data);
			if(result) {
				await result.save();
			}
		}

		return json(result, { status: 201 });
	} catch (error: any) {
		console.error('Error creating result:', error);
		return json({ error: 'Failed to create result', details: error.message }, { status: 500 });
	}
};

