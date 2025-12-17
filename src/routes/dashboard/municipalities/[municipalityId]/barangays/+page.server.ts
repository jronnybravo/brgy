import type { PageServerLoad } from './$types';
import { Locality } from '$lib/database/entities/Locality';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { Person } from '$lib/database/entities/Person';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const municipalityId = parseInt(params.municipalityId);

		// Get the municipality
		const municipality = await Locality.findOne({
			where: { id: municipalityId },
			relations: { children: true }
		});

		if (!municipality) {
			throw error(404, 'Municipality not found');
		}

		// Get all barangays
		const barangays = municipality.children || [];
		const barangayIds = barangays.map(b => b.id);

		// Fetch all people to count by barangay
		const allPeople = await Person.find();
		const peopleByBarangay = new Map<number, number>();
		allPeople.forEach(p => {
			if (p.barangayId && barangayIds.includes(p.barangayId)) {
				peopleByBarangay.set(p.barangayId, (peopleByBarangay.get(p.barangayId) || 0) + 1);
			}
		});

		// Get all assistances once
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});

		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		// Get all barangays with statistics
		const barangaysWithStats = (municipality.children || []).map((barangay) => {
			// Filter financial assistances for this barangay
			const barangayFinancialAssistances = allFinancialAssistances.filter(fa =>
				fa.person && fa.person.barangayId === barangay.id
			);

			const totalFinancialAssistance = barangayFinancialAssistances.reduce(
				(sum, fa) => sum + parseFloat(fa.value.toString()),
				0
			);

			// Filter medicine assistances for this barangay
			const barangayMedicineAssistances = allMedicineAssistances.filter(ma =>
				ma.person && ma.person.barangayId === barangay.id
			);

			return {
				id: barangay.id,
				name: barangay.name,
				code: barangay.code,
				type: barangay.type,
				population: peopleByBarangay.get(barangay.id) || 0,
				financialAssistanceCount: barangayFinancialAssistances.length,
				medicineAssistanceCount: barangayMedicineAssistances.length,
				totalFinancialAssistance
			};
		});

		// Return only serializable municipality data
		const serializableMunicipality = {
			id: municipality.id,
			name: municipality.name,
			code: municipality.code,
			type: municipality.type,
			population: municipality.population
		};

		return {
			municipality: serializableMunicipality,
			barangays: barangaysWithStats
		};
	} catch (e) {
		console.error('Error loading barangays:', e);
		throw e;
	}
};
