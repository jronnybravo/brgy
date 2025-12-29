import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async () => {
	try {
        const towns = await Locality.find({
            select: { 
                id: true, 
                name: true, 
                children: { id: true, name: true, parentId: true } 
            },
            relations: { children: true },
            where: { type: 'municipality' },
            order: { name: 'ASC' }
        });

		return json({
			success: true,
			towns,
		});
	} catch (error) {
		console.error('Error fetching towns and barangays:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch towns and barangays',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
