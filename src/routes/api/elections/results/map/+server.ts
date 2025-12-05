import { json } from '@sveltejs/kit';
import { getDataSource, AppDataSource } from '$lib/database/data-source';
import { ElectionResult } from '$lib/database/entities/ElectionResult';
import type { RequestHandler } from './$types';

/**
 * GET election results formatted for map display
 * Returns winning candidate per locality for a given contest
 * 
 * Query params:
 *   - contestId (required): The election contest ID
 * 
 * Response format:
 * {
 *   contest: { id, name, position },
 *   candidates: [{ id, name, party, color, totalVotes }],
 *   results: {
 *     [localityId]: {
 *       winnerId: number,
 *       winnerName: string,
 *       winnerColor: string,
 *       totalVotes: number,
 *       votes: { [candidateId]: votes }
 *     }
 *   }
 * }
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();
		
		const contestId = url.searchParams.get('contestId');
		
		if (!contestId) {
			return json({ error: 'contestId is required' }, { status: 400 });
		}
		
		// Get all results for this contest with candidate and locality info
		const results = await AppDataSource.getRepository(ElectionResult)
			.createQueryBuilder('result')
			.leftJoinAndSelect('result.candidate', 'candidate')
			.leftJoinAndSelect('candidate.contest', 'contest')
			.leftJoinAndSelect('result.locality', 'locality')
			.where('contest.id = :contestId', { contestId: parseInt(contestId) })
			.getMany();
		
		if (results.length === 0) {
			return json({ 
				contest: null,
				candidates: [],
				results: {}
			});
		}
		
		// Build response
		const contest = results[0].candidate.contest;
		const candidatesMap = new Map();
		const localityResults: Record<number, any> = {};
		
		// Process results
		for (const result of results) {
			const candidate = result.candidate;
			const localityId = result.localityId;
			
			// Track candidate totals
			if (!candidatesMap.has(candidate.id)) {
				candidatesMap.set(candidate.id, {
					id: candidate.id,
					name: candidate.name,
					party: candidate.party,
					color: candidate.color,
					totalVotes: 0
				});
			}
			candidatesMap.get(candidate.id).totalVotes += result.votes;
			
			// Track locality results
			if (!localityResults[localityId]) {
				localityResults[localityId] = {
					localityName: result.locality?.name,
					winnerId: null,
					winnerName: null,
					winnerColor: null,
					winnerVotes: 0,
					totalVotes: 0,
					votes: {}
				};
			}
			
			localityResults[localityId].votes[candidate.id] = result.votes;
			localityResults[localityId].totalVotes += result.votes;
			
			// Update winner if this candidate has more votes
			if (result.votes > localityResults[localityId].winnerVotes) {
				localityResults[localityId].winnerId = candidate.id;
				localityResults[localityId].winnerName = candidate.name;
				localityResults[localityId].winnerColor = candidate.color;
				localityResults[localityId].winnerVotes = result.votes;
			}
		}
		
		// Sort candidates by total votes
		const candidates = Array.from(candidatesMap.values())
			.sort((a, b) => b.totalVotes - a.totalVotes);
		
		return json({
			contest: {
				id: contest.id,
				name: contest.name,
				position: contest.position,
				scope: contest.scope,
				jurisdiction: contest.jurisdiction
			},
			candidates,
			results: localityResults
		});
		
	} catch (error: any) {
		console.error('Error fetching map results:', error);
		return json({ error: 'Failed to fetch results', details: error.message }, { status: 500 });
	}
};

