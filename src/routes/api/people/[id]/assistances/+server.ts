import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { getDataSource } from '$lib/database/data-source';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const personId = parseInt(params.id);

		if (isNaN(personId)) {
			return json({ error: 'Invalid person ID' }, { status: 400 });
		}

		const dataSource = await getDataSource();

		// Fetch financial assistances for this person
		const financialAssistances = await dataSource
			.createQueryBuilder(FinancialAssistance, 'fa')
			.where('fa.personId = :personId', { personId })
			.orderBy('fa.disbursed_date', 'DESC')
			.getMany();

		// Fetch medicine assistances for this person
		const medicineAssistances = await dataSource
			.createQueryBuilder(MedicineAssistance, 'ma')
			.where('ma.personId = :personId', { personId })
			.orderBy('ma.disbursed_date', 'DESC')
			.getMany();

		return json({
			success: true,
			financial: financialAssistances.map(fa => ({
				id: fa.id,
				type: fa.type,
				value: parseFloat(fa.value.toString()),
				disbursed_date: fa.disbursed_date
			})),
			medicine: medicineAssistances.map(ma => ({
				id: ma.id,
				medicine_name: ma.medicine_name,
				generic_name: ma.generic_name,
				dosage: ma.dosage,
				quantity: ma.quantity,
				unit: ma.unit,
				disbursed_date: ma.disbursed_date
			}))
		});
	} catch (e) {
		console.error('Error fetching person assistances:', e);
		return json(
			{ error: 'Failed to fetch assistance records' },
			{ status: 500 }
		);
	}
};
