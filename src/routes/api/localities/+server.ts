import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Locality } from '$lib/database/entities/Locality';
import type { RequestHandler } from './$types';

// GET all localities (with optional filters) - ActiveRecord pattern
export const GET: RequestHandler = async ({ url }) => {
	try {
		// Ensure database is initialized
		await getDataSource();

		// Get query parameters
		const typeFilter = url.searchParams.get('type');
		const nameFilter = url.searchParams.get('name');
		const parentIdFilter = url.searchParams.get('parentId');
		const limit = parseInt(url.searchParams.get('limit') || '1000'); // Default limit 1000
		const offset = parseInt(url.searchParams.get('offset') || '0');

		console.log('Query params:', { typeFilter, nameFilter, parentIdFilter, limit, offset });
		
		// Build where clause for ActiveRecord
		const where: any = {};
		
		if (typeFilter) {
			where.type = typeFilter;
		}
		
		if (parentIdFilter) {
			where.parentId = parseInt(parentIdFilter);
		}
		
		// ActiveRecord pattern - pure find() method
		const localities = await Locality.find({
			where: Object.keys(where).length > 0 ? where : undefined,
			take: limit,
			skip: offset,
			select: ['id', 'name', 'code', 'type', 'boundaryGeoJSON', 'centroidLat', 'centroidLng', 'population', 'parentId']
		});

		console.log(`Found ${localities.length} localities`);

		return json(localities);
	} catch (error: any) {
		console.error('Error fetching localities:', error);
		console.error('Error stack:', error.stack);
		return json({ error: 'Failed to fetch localities', details: error.message }, { status: 500 });
	}
};

// POST - Create new locality - ActiveRecord pattern
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		// Validate required fields
		if (!data.name || !data.boundaryGeoJSON) {
			return json({ error: 'Name and boundaryGeoJSON are required' }, { status: 400 });
		}

		// Calculate centroid if coordinates provided
		if (
			data.boundaryGeoJSON.type === 'Polygon' &&
			data.boundaryGeoJSON.coordinates &&
			data.boundaryGeoJSON.coordinates[0]
		) {
			const coords = data.boundaryGeoJSON.coordinates[0];
			const avgLng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
			const avgLat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;
			data.centroidLat = avgLat;
			data.centroidLng = avgLng;
		}

		// ActiveRecord pattern - create and save directly on entity
		const locality = Locality.create(data);
		await locality.save();

		return json(locality, { status: 201 });
	} catch (error: any) {
		console.error('Error creating locality:', error);
		return json({ error: 'Failed to create locality', details: error.message }, { status: 500 });
	}
};

