import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Cache for map data with 5-minute TTL
let mapDataCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
	return mapDataCache && Date.now() - cacheTimestamp < CACHE_TTL;
}

// GET Siquijor barangays with GeoJSON for the map - optimized for fast loading
export const GET: RequestHandler = async () => {
	try {
		// Return cached data if available
		if (isCacheValid()) {
			console.log('Returning cached map data');
			return json(mapDataCache, {
				headers: {
					'Cache-Control': 'public, max-age=300'
				}
			});
		}

		// Single raw SQL query optimized for map rendering
		const dataSource = await import('$lib/database/data-source').then(m => m.getDataSource());

		const barangays = await dataSource.query(`
			SELECT 
				id,
				name,
				code,
				type,
				boundaryGeoJSON,
				centroidLat,
				centroidLng,
				population,
				parentId
			FROM localities
			WHERE type = 'barangay'
			AND parentId IN (
				SELECT id FROM localities WHERE type = 'municipality' AND parentId = (
					SELECT id FROM localities WHERE name = 'SIQUIJOR' AND type = 'province'
				)
			)
			ORDER BY name ASC
		`);

		// Cache the result
		mapDataCache = barangays;
		cacheTimestamp = Date.now();

		return json(barangays, {
			headers: {
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (error: any) {
		console.error('Error fetching map localities:', error);
		return json(
			{ error: 'Failed to fetch map localities', details: error.message },
			{ status: 500 }
		);
	}
};
