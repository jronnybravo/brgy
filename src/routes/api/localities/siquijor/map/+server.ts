import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET Siquijor barangays with GeoJSON for the map - optimized for fast loading
export const GET: RequestHandler = async () => {
	try {
		// Single raw SQL query optimized for map rendering
		// Returns all barangays with their real GeoJSON boundaries
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

		return json(barangays);
	} catch (error: any) {
		console.error('Error fetching map localities:', error);
		return json(
			{ error: 'Failed to fetch map localities', details: error.message },
			{ status: 500 }
		);
	}
};
