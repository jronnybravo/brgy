import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FinancialAssistanceType } from '$lib/database/entities/Assistance';

// Cache for assistance data (5-minute TTL)
let assistanceCache: any = null;
let assistanceCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET assistances formatted for map display
 * Returns disbursement totals per barangay for each financial assistance type
 * Optimized with caching and direct SQL aggregation
 */
export const GET: RequestHandler = async () => {
	try {
		// Check cache first
		if (assistanceCache && Date.now() - assistanceCacheTimestamp < CACHE_TTL) {
			console.log('Returning cached assistance data');
			return json(
				{
					success: true,
					barangays: assistanceCache.barangays,
					totals: assistanceCache.totals,
					types: assistanceCache.types
				},
				{
					headers: {
						'Cache-Control': 'public, max-age=300'
					}
				}
			);
		}

		// Use optimized SQL query to aggregate data directly in the database
		const dataSource = await import('$lib/database/data-source').then(m => m.getDataSource());
		
		// Single query to get all Siquijor barangays with aggregated financial assistance data
		const barangayData = await dataSource.query(`
			SELECT 
				l.id,
				l.name,
				COALESCE(SUM(fa.value), 0) as totalDisbursed,
				COALESCE(fa.type, 'UNKNOWN') as type,
				COALESCE(SUM(CASE WHEN fa.type IS NOT NULL THEN fa.value ELSE 0 END), 0) as typeAmount
			FROM localities l
			LEFT JOIN people p ON p.barangayId = l.id
			LEFT JOIN financial_assistances fa ON fa.personId = p.id
			WHERE l.type = 'barangay'
			AND l.parentId IN (
				SELECT id FROM localities WHERE type = 'municipality' AND parentId = (
					SELECT id FROM localities WHERE name = 'SIQUIJOR' AND type = 'province'
				)
			)
			GROUP BY l.id, l.name, fa.type
			ORDER BY l.name ASC
		`);

		// Process results into barangay map with Siquijor-only data
		const barangayMap: Record<number, any> = {};
		const typeTotals: Record<string, number> = {};
		const allTypes = Object.values(FinancialAssistanceType);
		
		// Initialize type totals
		allTypes.forEach((type) => {
			typeTotals[type] = 0;
		});

		// Group results by barangay and type
		for (const row of barangayData) {
			const barangayId = row.id;
			
			if (!barangayMap[barangayId]) {
				const byType: Record<string, number> = {};
				allTypes.forEach((type) => {
					byType[type] = 0;
				});
				
				barangayMap[barangayId] = {
					id: barangayId,
					name: row.name,
					totalDisbursed: parseFloat(row.totalDisbursed) || 0,
					byType
				};
			}

			if (row.type && row.type !== 'UNKNOWN') {
				const amount = parseFloat(row.typeAmount) || 0;
				barangayMap[barangayId].byType[row.type] = amount;
				typeTotals[row.type] = (typeTotals[row.type] || 0) + amount;
			}
		}

		// Cache the result
		assistanceCache = {
			barangays: Object.values(barangayMap),
			totals: typeTotals,
			types: allTypes
		};
		assistanceCacheTimestamp = Date.now();

		return json({
			success: true,
			barangays: assistanceCache.barangays,
			totals: assistanceCache.totals,
			types: assistanceCache.types
		}, {
			headers: {
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (error) {
		console.error('Error fetching assistances for map:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch assistances for map',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
