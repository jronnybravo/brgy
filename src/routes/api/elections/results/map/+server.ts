import { json } from '@sveltejs/kit';
import { getDataSource, AppDataSource } from '$lib/database/data-source';
import type { RequestHandler } from './$types';

// Cache for results by contest ID (5-minute TTL)
const resultCache = new Map<number, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedResults(contestId: number): any | null {
	const cached = resultCache.get(contestId);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		console.log(`Returning cached election results for contest ${contestId}`);
		return cached.data;
	}
	return null;
}

function setCachedResults(contestId: number, data: any): void {
	resultCache.set(contestId, { data, timestamp: Date.now() });
}

/**
 * GET election results formatted for map display
 * Returns winning candidate per locality for a given contest
 * Optimized with server-side caching and SQL aggregation
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		await getDataSource();
		
		const contestId = url.searchParams.get('contestId');
		
		if (!contestId) {
			return json({ error: 'contestId is required' }, { status: 400 });
		}

		const contestIdNum = parseInt(contestId);
		
		// Check cache first
		const cachedResult = getCachedResults(contestIdNum);
		if (cachedResult) {
			return json(cachedResult, {
				headers: {
					'Cache-Control': 'public, max-age=300'
				}
			});
		}
		
		// Use optimized raw SQL query for faster aggregation
		const results = await AppDataSource.query(`
			SELECT 
				er.id,
				er.candidateId,
				er.localityId,
				er.votes,
				c.id as candidate_id,
				c.name as candidate_name,
				c.party,
				c.color,
				con.id as contest_id,
				con.name as contest_name,
				con.position,
				con.scope,
				con.jurisdiction,
				l.id as locality_id,
				l.name as locality_name
			FROM election_results er
			JOIN candidates c ON c.id = er.candidateId
			JOIN election_contests con ON con.id = c.contestId
			JOIN localities l ON l.id = er.localityId
			WHERE con.id = ?
			ORDER BY er.localityId, er.votes DESC
		`, [contestIdNum]);
		
		if (results.length === 0) {
			const response = { 
				contest: null,
				candidates: [],
				results: {}
			};
			setCachedResults(contestIdNum, response);
			return json(response);
		}
		
		// Build response from optimized SQL results
		const contest = {
			id: results[0].contest_id,
			name: results[0].contest_name,
			position: results[0].position,
			scope: results[0].scope,
			jurisdiction: results[0].jurisdiction
		};
		
		const candidatesMap = new Map();
		const localityResults: Record<number, any> = {};
		
		// Process results (already ordered by locality and votes DESC for correct winner detection)
		for (const row of results) {
			const candidateId = row.candidate_id;
			const localityId = row.locality_id;
			const votes = row.votes;
			
			// Track candidate totals
			if (!candidatesMap.has(candidateId)) {
				candidatesMap.set(candidateId, {
					id: candidateId,
					name: row.candidate_name,
					party: row.party,
					color: row.color,
					totalVotes: 0
				});
			}
			candidatesMap.get(candidateId).totalVotes += votes;
			
			// Track locality results - first result per locality is the winner (already sorted DESC by votes)
			if (!localityResults[localityId]) {
				localityResults[localityId] = {
					winnerId: candidateId,
					winnerName: row.candidate_name,
					winnerColor: row.color,
					totalVotes: 0,
					votes: {}
				};
			}
			
			localityResults[localityId].votes[candidateId] = votes;
			localityResults[localityId].totalVotes += votes;
		}
		
		// Sort candidates by total votes
		const candidates = Array.from(candidatesMap.values())
			.sort((a, b) => b.totalVotes - a.totalVotes);
		
		const response = {
			contest: {
				id: contest.id,
				name: contest.name,
				position: contest.position,
				scope: contest.scope,
				jurisdiction: contest.jurisdiction
			},
			candidates,
			results: localityResults
		};
		
		// Cache the result
		setCachedResults(contestIdNum, response);
		
		return json(response, {
			headers: {
				'Cache-Control': 'public, max-age=300'
			}
		});
		
	} catch (error: any) {
		console.error('Error fetching map results:', error);
		return json({ error: 'Failed to fetch results', details: error.message }, { status: 500 });
	}
};

