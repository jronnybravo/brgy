import type { PageServerLoad } from './$types';
import { Locality } from '$lib/database/entities/Locality';
import { Person } from '$lib/database/entities/Person';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { error, redirect } from '@sveltejs/kit';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await User.findOne({
		where: { id: locals.user.id },
		relations: { role: true }
	});
	if (!currentUser) {
		cookies.delete('auth_token', { path: '/' });
		throw redirect(302, '/login');
	}

	const capabilities = {
		canReadPersons: currentUser.can(Permission.READ_PERSONS),
		canUpdatePersons: currentUser.can(Permission.UPDATE_PERSONS),
		canDeletePersons: currentUser.can(Permission.DELETE_PERSONS),
	};

	try {
		const barangayId = parseInt(params.barangayId);
		const municipalityId = parseInt(params.municipalityId);

		// Get the barangay
		const barangay = await Locality.findOne({
			where: { id: barangayId },
			relations: { parent: true }
		});

		if (!barangay) {
			throw error(404, 'Barangay not found');
		}

		// Verify it belongs to the municipality
		if (barangay.parentId !== municipalityId) {
			throw error(404, 'Barangay not found in this municipality');
		}

		// Get all people in this barangay
		const people = await Person.find({
			where: { barangayId },
			relations: { financialAssistances: true, medicineAssistances: true }
		});

		// Get all financial assistances for this barangay
		const allFinancialAssistances = await FinancialAssistance.find({
			relations: { person: true }
		});

		const financialAssistances = allFinancialAssistances.filter(fa =>
			fa.person && fa.person.barangayId === barangayId
		);

		// Get all medicine assistances for this barangay
		const allMedicineAssistances = await MedicineAssistance.find({
			relations: { person: true }
		});

		const medicineAssistances = allMedicineAssistances.filter(ma =>
			ma.person && ma.person.barangayId === barangayId
		);

		// Aggregate assistance data by type
		const assistanceByType: Record<string, number> = {};
		const assistanceByMonth: Record<string, number> = {};
		const peopleWithAssistance: Record<number, number> = {};

		for (const fa of financialAssistances) {
			const type = fa.type || 'Unknown';
			assistanceByType[type] = (assistanceByType[type] || 0) + parseFloat(fa.value.toString());

			const month = new Date(fa.disbursed_date).toISOString().substring(0, 7);
			assistanceByMonth[month] = (assistanceByMonth[month] || 0) + parseFloat(fa.value.toString());

			peopleWithAssistance[fa.personId] = (peopleWithAssistance[fa.personId] || 0) + 1;
		}

		// Total calculations
		const totalFinancialAssistance = financialAssistances.reduce(
			(sum, fa) => sum + parseFloat(fa.value.toString()),
			0
		);

		const totalMedicineAssistances = medicineAssistances.length;
		const uniquePeopleWithAssistance = Object.keys(peopleWithAssistance).length;

		// Convert to serializable objects
		const serializableMunicipality = barangay.parent ? {
			id: barangay.parent.id,
			name: barangay.parent.name,
			code: barangay.parent.code,
			type: barangay.parent.type
		} : null;

		const serializableBarangay = {
			id: barangay.id,
			name: barangay.name,
			code: barangay.code,
			type: barangay.type,
			population: barangay.population
		};

		const serializablePeople = people.map(p => ({
			id: p.id,
			firstName: p.firstName,
			lastName: p.lastName,
			middleName: p.middleName,
			extensionName: p.extensionName,
			birthdate: p.birthdate,
			sex: p.sex,
			purok: p.purok,
			isSupporter: p.isSupporter,
			isLeader: p.isLeader
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

		// Calculate person-level assistance data
		const assistanceByPerson: Record<string, number> = {};
		const medicinesByPerson: Record<string, number> = {};

		for (const fa of financialAssistances) {
			if (fa.person) {
				const personName = `${fa.person.firstName} ${fa.person.lastName}`;
				assistanceByPerson[personName] = (assistanceByPerson[personName] || 0) + parseFloat(fa.value.toString());
			}
		}

		for (const ma of medicineAssistances) {
			if (ma.person) {
				const personName = `${ma.person.firstName} ${ma.person.lastName}`;
				medicinesByPerson[personName] = (medicinesByPerson[personName] || 0) + 1;
			}
		}

		// Calculate medicine names distribution
		const medicineNames: Record<string, number> = {};
		for (const ma of medicineAssistances) {
			const name = ma.medicine_name || 'Unknown';
			medicineNames[name] = (medicineNames[name] || 0) + 1;
		}

		// Calculate supporter distribution
		const supporterDistribution: Record<string, number> = {
			'Supporters': 0,
			'Non-Supporters': 0,
			'Unsure': 0
		};
		people.forEach(person => {
			if (person.isSupporter === true) {
				supporterDistribution['Supporters']++;
			} else if (person.isSupporter === false) {
				supporterDistribution['Non-Supporters']++;
			} else {
				supporterDistribution['Unsure']++;
			}
		});

		return {
			municipality: serializableMunicipality,
			barangay: serializableBarangay,
			people: serializablePeople,
			financialAssistances: serializableFinancialAssistances,
			medicineAssistances: serializableMedicineAssistances,
			totalFinancialAssistance,
			totalMedicineAssistances,
			uniquePeopleWithAssistance,
			assistanceByType,
			assistanceByPerson,
			medicinesByPerson,
			medicineNames,
			supporterDistribution,
			capabilities
		};
	} catch (e) {
		console.error('Error loading barangay details:', e);
		throw e;
	}
};
