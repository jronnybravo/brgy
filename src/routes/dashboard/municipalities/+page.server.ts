import type { PageServerLoad } from './$types';
import { Locality } from '$lib/database/entities/Locality';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { Person } from '$lib/database/entities/Person';
import { In } from 'typeorm';

export const load: PageServerLoad = async () => {
	try {
		// Get all municipalities and cities (type='municipality' or 'city' with a parent province)
		const municipalities = await Locality.find({
			where: { type: In(['municipality', 'city']) },
			relations: { children: true, parent: true }
		});

		// Fetch all financial and medicine assistances once with person data
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});

		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		// Fetch all people to count by municipality
		const allPeople = await Person.find();

		// Get statistics for each municipality
		const municipalitiesWithStats = municipalities.map((municipality) => {
			// Get barangay IDs under this municipality
			const barangayIds = municipality.children?.map(b => b.id) || [];
			
			// Count people registered in this municipality's barangays
			const peopleCount = allPeople.filter(p => 
				p.barangayId && barangayIds.includes(p.barangayId)
			).length;

			// Filter financial assistances for people in this municipality
			const municipalityAssistances = allFinancialAssistances.filter(fa => 
				fa.person && fa.person.barangayId && barangayIds.includes(fa.person.barangayId)
			);

			const totalFinancialAssistance = municipalityAssistances.reduce((sum, fa) => sum + parseFloat(fa.value.toString()), 0);

			// Filter medicine assistances for people in this municipality
			const municipalityMedicineAssistances = allMedicineAssistances.filter(ma =>
				ma.person && ma.person.barangayId && barangayIds.includes(ma.person.barangayId)
			);

			// Return only serializable data (no circular references)
			return {
				id: municipality.id,
				name: municipality.name,
				code: municipality.code,
				type: municipality.type,
				population: peopleCount,
				barangayCount: municipality.children?.length || 0,
				financialAssistanceCount: municipalityAssistances.length,
				medicineAssistanceCount: municipalityMedicineAssistances.length,
				totalFinancialAssistance
			};
		});

		// Calculate chart data
		// 1. Total financial assistance by municipality
		const totalFinancialByMunicipality: Record<string, number> = {};
		municipalitiesWithStats.forEach(m => {
			totalFinancialByMunicipality[m.name] = m.totalFinancialAssistance;
		});

		// 2. Total medicines by municipality (count of records)
		const totalMedicinesByMunicipality: Record<string, number> = {};
		municipalities.forEach(municipality => {
			const barangayIds = municipality.children?.map(b => b.id) || [];
			const count = allMedicineAssistances.filter(ma =>
				ma.person && ma.person.barangayId && barangayIds.includes(ma.person.barangayId)
			).length;
			if (count > 0) {
				totalMedicinesByMunicipality[municipality.name] = count;
			}
		});

		// 3. Financial assistance types distribution (all municipalities)
		const assistanceByType: Record<string, number> = {};
		allFinancialAssistances.forEach(fa => {
			const type = fa.type || 'Unknown';
			assistanceByType[type] = (assistanceByType[type] || 0) + parseFloat(fa.value.toString());
		});

		// 4. Medicine names distribution (all municipalities)
		const medicineNames: Record<string, number> = {};
		allMedicineAssistances.forEach(ma => {
			const name = ma.medicine_name || 'Unknown';
			medicineNames[name] = (medicineNames[name] || 0) + 1;
		});

		return {
			municipalities: municipalitiesWithStats,
			totalFinancialByMunicipality,
			totalMedicinesByMunicipality,
			assistanceByType,
			medicineNames
		};
	} catch (error) {
		console.error('Error loading municipalities:', error);
		return {
			municipalities: [],
			error: error instanceof Error ? error.message : 'Failed to load municipalities'
		};
	}
};
