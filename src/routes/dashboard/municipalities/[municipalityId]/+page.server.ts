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

		// Get all barangays under this municipality
		const barangays = municipality.children || [];
		const barangayIds = barangays.map(b => b.id);

		// Get all people in this municipality's barangays
		const allPeopleInMunicipality = await Person.find({
			where: barangayIds.length > 0 ? undefined : undefined
		});
		const peopleByBarangay = new Map<number, number>();
		const peopleInMunicipality = allPeopleInMunicipality.filter(p => {
			if (p.barangayId && barangayIds.includes(p.barangayId)) {
				peopleByBarangay.set(p.barangayId, (peopleByBarangay.get(p.barangayId) || 0) + 1);
				return true;
			}
			return false;
		});

		// Get all financial assistances
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});

		const financialAssistances = allFinancialAssistances.filter(fa =>
			fa.person && fa.person.barangayId && barangayIds.includes(fa.person.barangayId)
		);

		// Get all medicine assistances
		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		const medicineAssistances = allMedicineAssistances.filter(ma =>
			ma.person && ma.person.barangayId && barangayIds.includes(ma.person.barangayId)
		);

		const peopleCount = peopleInMunicipality.length;

		// Aggregate assistance data by type
		const assistanceByType: Record<string, number> = {};
		const assistanceByMonth: Record<string, number> = {};

		for (const fa of financialAssistances) {
			const type = fa.type || 'Unknown';
			assistanceByType[type] = (assistanceByType[type] || 0) + parseFloat(fa.value.toString());

			const month = new Date(fa.disbursed_date).toISOString().substring(0, 7);
			assistanceByMonth[month] = (assistanceByMonth[month] || 0) + parseFloat(fa.value.toString());
		}

		// Calculate financial assistance by barangay
		const financialByBarangay: Record<string, number> = {};
		for (const barangay of barangays) {
			const barangayFinancial = financialAssistances.filter(
				fa => fa.person?.barangayId === barangay.id
			);
			const total = barangayFinancial.reduce(
				(sum, fa) => sum + parseFloat(fa.value.toString()),
				0
			);
			if (total > 0) {
				financialByBarangay[barangay.name] = total;
			}
		}

		// Calculate medicine assistance by barangay (count of records)
		const medicineByBarangay: Record<string, number> = {};
		for (const barangay of barangays) {
			const barangayMedicine = medicineAssistances.filter(
				ma => ma.person?.barangayId === barangay.id
			);
			if (barangayMedicine.length > 0) {
				medicineByBarangay[barangay.name] = barangayMedicine.length;
			}
		}

		// Total calculations
		const totalFinancialAssistance = financialAssistances.reduce(
			(sum, fa) => sum + parseFloat(fa.value.toString()),
			0
		);

		const totalMedicineAssistances = medicineAssistances.length;

		// Only return serializable data (convert Locality objects to plain objects)
		const serializableMunicipality = {
			id: municipality.id,
			name: municipality.name,
			code: municipality.code,
			type: municipality.type,
			population: municipality.population
		};

		const serializableBarangays = barangays.map(b => ({
			id: b.id,
			name: b.name,
			code: b.code,
			type: b.type,
			population: peopleByBarangay.get(b.id) || 0
		}));

		const serializableFinancialAssistances = financialAssistances.map(fa => ({
			id: fa.id,
			personId: fa.personId,
			type: fa.type,
			value: parseFloat(fa.value.toString()),
			disbursed_date: fa.disbursed_date,
			person: fa.person ? {
				id: fa.person.id,
				firstName: fa.person.firstName,
				lastName: fa.person.lastName
			} : null
		}));

		const serializableMedicineAssistances = medicineAssistances.map(ma => ({
			id: ma.id,
			personId: ma.personId,
			medicine_name: ma.medicine_name,
			generic_name: ma.generic_name,
			dosage: ma.dosage,
			quantity: ma.quantity,
			unit: ma.unit,
			disbursed_date: ma.disbursed_date,
			person: ma.person ? {
				id: ma.person.id,
				firstName: ma.person.firstName,
				lastName: ma.person.lastName
			} : null
		}));

		return {
			municipality: serializableMunicipality,
			barangays: serializableBarangays,
			peopleCount,
			financialAssistances: serializableFinancialAssistances,
			medicineAssistances: serializableMedicineAssistances,
			totalFinancialAssistance,
			totalMedicineAssistances,
			assistanceByType,
			assistanceByMonth,
			financialByBarangay,
			medicineByBarangay
		};
	} catch (e) {
		console.error('Error loading municipality details:', e);
		throw e;
	}
};
