import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Locality } from '$lib/database/entities/Locality';
import type { RequestHandler } from './$types';

// GET all localities as GeoJSON FeatureCollection - ActiveRecord pattern
export const GET: RequestHandler = async () => {
	try {
		await getDataSource();

		// ActiveRecord pattern
		const localities = await Locality.find();

		// Convert to GeoJSON FeatureCollection
		const featureCollection = {
			type: 'FeatureCollection',
			features: localities.map((locality) => locality.toGeoJSONFeature())
		};

		return json(featureCollection);
	} catch (error) {
		console.error('Error fetching localities GeoJSON:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: 'Failed to fetch localities', details: errorMessage }, { status: 500 });
	}
};

