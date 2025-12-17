import type { RequestHandler } from './$types';
import { Person } from '$lib/database/entities/Person';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const body = await request.json();
		const barangayId = parseInt(params.barangayId);
		
		const draw = parseInt(body.draw) || 1;
		const start = parseInt(body.start) || 0;
		const length = parseInt(body.length) || 10;
		const searchValue = body.search?.value || '';
		
		// Get sort column and direction
		const orderColumn = body.order?.[0]?.column || 0;
		const orderDir = body.order?.[0]?.dir || 'asc';
		
		// Column names mapping
		const columns = ['firstName', 'lastName', 'sex', 'birthdate', 'financialAssistanceCount', 'medicineAssistanceCount'];
		const orderBy = columns[orderColumn] || 'firstName';

		// Get people in barangay
		let people = await Person.find({
			where: { barangayId },
			relations: { barangay: true }
		});

		// Fetch all assistances
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});
		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		// Map people to data with stats
		let data = people.map((person) => {
			const personFinancialAssistances = allFinancialAssistances.filter(fa =>
				fa.personId === person.id
			);

			const personMedicineAssistances = allMedicineAssistances.filter(ma =>
				ma.personId === person.id
			);

			return {
				id: person.id,
				firstName: person.firstName,
				lastName: person.lastName,
				fullName: `${person.firstName} ${person.lastName}`,
				sex: person.sex,
				birthdate: person.birthdate?.toISOString().split('T')[0] || '',
				purok: person.purok || '',
				isSupporter: person.isSupporter,
				isLeader: person.isLeader,
				financialAssistanceCount: personFinancialAssistances.length,
				medicineAssistanceCount: personMedicineAssistances.length
			};
		});

		// Apply search filter
		if (searchValue) {
			const searchLower = searchValue.toLowerCase();
			data = data.filter(p =>
				p.firstName.toLowerCase().includes(searchLower) ||
				p.lastName.toLowerCase().includes(searchLower) ||
				p.fullName.toLowerCase().includes(searchLower) ||
				p.purok.toLowerCase().includes(searchLower)
			);
		}

		const recordsTotal = people.length;
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
		console.error('Error in people API:', error);
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
