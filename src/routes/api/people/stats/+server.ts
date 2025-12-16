import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async () => {
	try {
		// Get SIQUIJOR province with municipalities and their barangays (with person counts)
		const siquijorProvince = await Locality.findOne({
			where: {
				name: 'SIQUIJOR',
				type: 'province'
			},
			relations: {
				children: { // municipalities
					children: { // barangays
						persons: true
					}
				}
			},
			order: {
				children: {
					name: 'ASC',
					children: {
						name: 'ASC'
					}
				}
			}
		});

		if (!siquijorProvince?.children?.length) {
			return json({
				success: true,
				data: {
					municipalities: []
				}
			});
		}

		// Transform and filter in one pass, already ordered from query
		const municipalities = siquijorProvince.children
			.filter((m) => m.type === 'municipality')
			.map((municipality) => ({
				id: municipality.id,
				name: municipality.name,
				barangays: (municipality.children || [])
					.filter((b) => b.type === 'barangay')
					.map((barangay) => ({
						id: barangay.id,
						name: barangay.name,
						peopleCount: barangay.persons?.length || 0
					}))
			}))
			.sort((a, b) => {
				const aTotal = a.barangays.reduce((sum, bar) => sum + bar.peopleCount, 0);
				const bTotal = b.barangays.reduce((sum, bar) => sum + bar.peopleCount, 0);
				return bTotal - aTotal;
			});

		return json({
			success: true,
			data: {
				municipalities
			}
		});
	} catch (error) {
		console.error('Error fetching people stats:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch people statistics',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
