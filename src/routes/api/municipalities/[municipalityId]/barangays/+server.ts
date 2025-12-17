import type { RequestHandler } from './$types';
import { Locality } from '$lib/database/entities/Locality';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { In } from 'typeorm';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const body = await request.json();
		const municipalityId = parseInt(params.municipalityId);
		
		const draw = parseInt(body.draw) || 1;
		const start = parseInt(body.start) || 0;
		const length = parseInt(body.length) || 10;
		const searchValue = body.search?.value || '';
		
		// Get sort column and direction
		const orderColumn = body.order?.[0]?.column || 0;
		const orderDir = body.order?.[0]?.dir || 'asc';
		
		// Column names mapping
		const columns = ['name', 'population', 'financialAssistanceCount', 'medicineAssistanceCount', 'totalFinancialAssistance'];
		const orderBy = columns[orderColumn] || 'name';

		// Get municipality
		const municipality = await Locality.findOne({
			where: { id: municipalityId },
			relations: { children: true }
		});

		if (!municipality) {
			return new Response(
				JSON.stringify({
					draw,
					recordsTotal: 0,
					recordsFiltered: 0,
					data: []
				}),
				{
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Get barangays
		const barangayIds = municipality.children?.map(b => b.id) || [];
		const barangays = await Locality.find({
			where: { id: In(barangayIds) }
		});

		// Fetch all assistances
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});
		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		// Map barangays to data with stats
		let data = barangays.map((barangay) => {
			const barangayAssistances = allFinancialAssistances.filter(fa =>
				fa.person && fa.person.barangayId === barangay.id
			);

			const totalFinancialAssistance = barangayAssistances.reduce(
				(sum, fa) => sum + parseFloat(fa.value.toString()),
				0
			);

			const barangayMedicineAssistances = allMedicineAssistances.filter(ma =>
				ma.person && ma.person.barangayId === barangay.id
			);

			return {
				id: barangay.id,
				name: barangay.name,
				population: barangay.population || 0,
				financialAssistanceCount: barangayAssistances.length,
				medicineAssistanceCount: barangayMedicineAssistances.length,
				totalFinancialAssistance
			};
		});

		// Apply search filter
		if (searchValue) {
			const searchLower = searchValue.toLowerCase();
			data = data.filter(b =>
				b.name.toLowerCase().includes(searchLower)
			);
		}

		const recordsTotal = barangays.length;
		const recordsFiltered = data.length;

		// Sort
		data.sort((a, b) => {
			let aVal = a[orderBy as keyof typeof a];
			let bVal = b[orderBy as keyof typeof b];

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
		console.error('Error in barangays API:', error);
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
