import type { RequestHandler } from './$types';
import { Locality } from '$lib/database/entities/Locality';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { In } from 'typeorm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		const draw = parseInt(body.draw) || 1;
		const start = parseInt(body.start) || 0;
		const length = parseInt(body.length) || 10;
		const searchValue = body.search?.value || '';
		
		// Get sort column and direction
		const orderColumn = body.order?.[0]?.column || 0;
		const orderDir = body.order?.[0]?.dir || 'asc';
		
		// Column names mapping
		const columns = ['name', 'type', 'population', 'barangayCount', 'financialAssistanceCount'];
		const orderBy = columns[orderColumn] || 'name';

		// Get all municipalities
		const municipalities = await Locality.find({
			where: { type: In(['municipality', 'city']) },
			relations: { children: true }
		});

		// Fetch all assistances once
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});
		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		// Map to data with stats
		let data = municipalities.map((municipality) => {
			const barangayIds = municipality.children?.map(b => b.id) || [];
			
			const municipalityAssistances = allFinancialAssistances.filter(fa => 
				fa.person && fa.person.barangayId && barangayIds.includes(fa.person.barangayId)
			);
			
			const totalFinancialAssistance = municipalityAssistances.reduce(
				(sum, fa) => sum + parseFloat(fa.value.toString()),
				0
			);

			const municipalityMedicineAssistances = allMedicineAssistances.filter(ma =>
				ma.person && ma.person.barangayId && barangayIds.includes(ma.person.barangayId)
			);

			return {
				id: municipality.id,
				name: municipality.name,
				type: municipality.type,
				population: municipality.population || 0,
				barangayCount: municipality.children?.length || 0,
				financialAssistanceCount: municipalityAssistances.length,
				medicineAssistanceCount: municipalityMedicineAssistances.length,
				totalFinancialAssistance
			};
		});

		// Apply search filter
		if (searchValue) {
			const searchLower = searchValue.toLowerCase();
			data = data.filter(m =>
				m.name.toLowerCase().includes(searchLower) ||
				(m.type?.toLowerCase() || '').includes(searchLower)
			);
		}

		const recordsTotal = municipalities.length;
		const recordsFiltered = data.length;

		// Sort
		data.sort((a, b) => {
			let aVal: any = a[orderBy as keyof typeof a] ?? '';
			let bVal: any = b[orderBy as keyof typeof b] ?? '';

			if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = (bVal as string).toLowerCase();
			}

			if (aVal < bVal) return orderDir === 'asc' ? -1 : 1;
			if (aVal > bVal) return orderDir === 'asc' ? 1 : -1;
			return 0;
		});

		// Paginate
		const paginatedData = data.slice(start, start + length);

		return new Response(
			JSON.stringify({
				draw,
				recordsTotal,
				recordsFiltered,
				data: paginatedData
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Error in municipalities API:', error);
		return new Response(
			JSON.stringify({
				draw: 1,
				recordsTotal: 0,
				recordsFiltered: 0,
				data: [],
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
