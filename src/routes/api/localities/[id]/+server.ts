import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Locality } from '$lib/database/entities/Locality';
import type { RequestHandler } from './$types';

// GET single locality by ID - ActiveRecord pattern
export const GET: RequestHandler = async ({ params }) => {
	try {
		await getDataSource();

		// ActiveRecord pattern
		const locality = await Locality.findOne({
			where: { id: parseInt(params.id) },
			relations: ['parent', 'children']
		});

		if (!locality) {
			return json({ error: 'Locality not found' }, { status: 404 });
		}

		return json(locality);
	} catch (error: any) {
		console.error('Error fetching locality:', error);
		return json({ error: 'Failed to fetch locality', details: error.message }, { status: 500 });
	}
};

// PUT - Update locality - ActiveRecord pattern
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		await getDataSource();

		// ActiveRecord pattern
		const locality = await Locality.findOne({
			where: { id: parseInt(params.id) }
		});

		if (!locality) {
			return json({ error: 'Locality not found' }, { status: 404 });
		}

		// Update centroid if boundary changed
		if (
			data.boundaryGeoJSON &&
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

		// Merge and save using ActiveRecord
		Object.assign(locality, data);
		await locality.save();

		return json(locality);
	} catch (error: any) {
		console.error('Error updating locality:', error);
		return json({ error: 'Failed to update locality', details: error.message }, { status: 500 });
	}
};

// DELETE locality - ActiveRecord pattern
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await getDataSource();

		// ActiveRecord pattern
		const locality = await Locality.findOne({
			where: { id: parseInt(params.id) }
		});

		if (!locality) {
			return json({ error: 'Locality not found' }, { status: 404 });
		}

		await locality.remove();

		return json({ message: 'Locality deleted successfully' });
	} catch (error: any) {
		console.error('Error deleting locality:', error);
		return json({ error: 'Failed to delete locality', details: error.message }, { status: 500 });
	}
};

