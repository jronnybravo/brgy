import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async () => {
	try {
		// Debug: Get all municipalities
		const municipalities = await Locality.find({
			where: { type: 'municipality' },
			relations: { children: true, parent: true }
		});

		const totalLocalities = await Locality.count();

		return json({
			success: true,
			data: {
				totalLocalities,
				municipalitiesFound: municipalities.length,
				municipalities: municipalities.map(m => ({
					id: m.id,
					name: m.name,
					type: m.type,
					parentId: m.parentId,
					barangayCount: m.children?.length || 0
				}))
			}
		});
	} catch (error) {
		console.error('Error fetching municipalities:', error);
		return json(
			{ success: false, error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
