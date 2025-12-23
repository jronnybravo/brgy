import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async () => {
	try {
		// Get ALL localities with minimal data
		const allLocalities = await Locality.find({
			order: { id: 'ASC' }
		});

		// Group by parentId to see the structure
		const byParentId = new Map<number | null, any[]>();
		allLocalities.forEach(loc => {
			const parentId = loc.parentId === undefined ? null : loc.parentId;
			if (!byParentId.has(parentId)) {
				byParentId.set(parentId, []);
			}
			byParentId.get(parentId)!.push({
				id: loc.id,
				name: loc.name,
				type: loc.type,
				parentId: loc.parentId
			});
		});

		// Convert to array and show structure
		const structure: any[] = [];
		byParentId.forEach((items, parentId) => {
			structure.push({
				parentId: parentId === null ? 'NULL (roots)' : parentId,
				count: items.length,
				samples: items.slice(0, 3)
			});
		});

		return json({
			totalLocalities: allLocalities.length,
			rootCount: byParentId.get(null)?.length || 0,
			roots: byParentId.get(null) || [],
			structureByParentId: structure.sort((a, b) => {
				const aId = typeof a.parentId === 'number' ? a.parentId : 999999;
				const bId = typeof b.parentId === 'number' ? b.parentId : 999999;
				return aId - bId;
			})
		});
	} catch (error) {
		console.error('Error:', error);
		return json(
			{ success: false, error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
