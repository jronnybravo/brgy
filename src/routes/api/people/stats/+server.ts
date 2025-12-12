import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async () => {
	try {
		const dataSource = await getDataSource();

		// Use raw query for maximum performance - single query to get everything
		const result = await dataSource.query(`
			SELECT 
				m.id as municipality_id,
				m.name as municipality_name,
				b.id as barangay_id,
				b.name as barangay_name,
				COUNT(p.id) as people_count
			FROM localities m
			INNER JOIN localities b ON b.parentId = m.id
			LEFT JOIN people p ON p.barangayId = b.id
			WHERE m.parentId = (
				SELECT id FROM localities WHERE name = 'SIQUIJOR' AND type = 'province'
			)
			AND m.type = 'municipality'
			AND b.type = 'barangay'
			GROUP BY m.id, m.name, b.id, b.name
			ORDER BY m.name ASC, people_count DESC
		`);

		if (!result || result.length === 0) {
			return json({
				success: true,
				data: {
					municipalities: []
				}
			});
		}

		// Transform flat result into hierarchical structure
		const municipalitiesMap = new Map();

		result.forEach((row: any) => {
			const munId = row.municipality_id;
			const barangayId = row.barangay_id;

			if (!municipalitiesMap.has(munId)) {
				municipalitiesMap.set(munId, {
					id: munId,
					name: row.municipality_name,
					barangays: []
				});
			}

			municipalitiesMap.get(munId).barangays.push({
				id: barangayId,
				name: row.barangay_name,
				peopleCount: parseInt(row.people_count) || 0
			});
		});

		// Convert to array and sort municipalities by total people count
		const municipalities = Array.from(municipalitiesMap.values()).sort((a, b) => {
			const aTotal = a.barangays.reduce((sum: number, bar: any) => sum + bar.peopleCount, 0);
			const bTotal = b.barangays.reduce((sum: number, bar: any) => sum + bar.peopleCount, 0);
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
