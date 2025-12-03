import { json } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Locality } from '$lib/database/entities/Locality';
import { Like, In } from 'typeorm';
import type { RequestHandler } from './$types';

// GET all Siquijor barangays - ActiveRecord pattern
export const GET: RequestHandler = async () => {
	try {
		await getDataSource();

		// Step 1: Find Siquijor PROVINCE (type='province')
		const siquijorProvince = await Locality.findOne({
			where: {
				name: Like('%Siquijor%'),
				type: 'province'
			}
		});

		console.log('Siquijor Province:', siquijorProvince ? `${siquijorProvince.name} (ID: ${siquijorProvince.id})` : 'Not found');

		let municipalityIds: number[] = [];

		if (siquijorProvince) {
			// Step 2: Find ALL municipalities in Siquijor Province (parentId = province ID)
			const municipalities = await Locality.find({
				where: {
					type: In(['municipality', 'city']),
					parentId: siquijorProvince.id
				}
			});

			console.log(`Found ${municipalities.length} municipalities in Siquijor Province:`, 
				municipalities.map(m => m.name));

			municipalityIds = municipalities.map(m => m.id);
		} else {
			// Fallback: Find municipalities by name if province not found
			console.log('Province not found, trying to find municipalities by name...');
			const municipalities = await Locality.find({
				where: {
					name: Like('%Siquijor%'),
					type: In(['municipality', 'city'])
				}
			});
			
			console.log(`Found ${municipalities.length} municipalities with Siquijor in name`);
			municipalityIds = municipalities.map(m => m.id);
		}

		if (municipalityIds.length === 0) {
			console.log('No municipalities found');
			return json([]);
		}

		console.log('Municipality IDs:', municipalityIds);

		// Step 3: Find ALL barangays where parentId is one of these municipalities
		const barangays = await Locality.find({
			where: {
				type: 'barangay',
				parentId: In(municipalityIds)
			},
			select: ['id', 'name', 'code', 'type', 'boundaryGeoJSON', 'centroidLat', 'centroidLng', 'population', 'parentId']
		});

		console.log(`Found ${barangays.length} total Siquijor barangays`);

		return json(barangays);
	} catch (error: any) {
		console.error('Error fetching Siquijor localities:', error);
		console.error('Error stack:', error.stack);
		return json({ error: 'Failed to fetch Siquijor localities', details: error.message }, { status: 500 });
	}
};

