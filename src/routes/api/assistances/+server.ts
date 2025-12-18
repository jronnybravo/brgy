import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Assistance, FinancialAssistance, MedicineAssistance, FinancialAssistanceType } from '$lib/database/entities/Assistance';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const personId = url.searchParams.get('personId');
		const type = url.searchParams.get('type');

		const where: any = {};
		if (personId) {
			where.personId = parseInt(personId);
		}

		// If specific type requested, return only that type
		if (type === 'financial') {
			const financialAssistances = await FinancialAssistance.find({
				where: Object.keys(where).length > 0 ? where : {},
				relations: { person: true},
				order: { disbursed_date: 'DESC', createdAt: 'DESC' }
			});
			return json({
				success: true,
				data: financialAssistances
			});
		}

		if (type === 'medicine') {
			const medicineAssistances = await MedicineAssistance.find({
				where: Object.keys(where).length > 0 ? where : {},
				relations: { person: true},
				order: { disbursed_date: 'DESC', createdAt: 'DESC' }
			});
			return json({
				success: true,
				data: medicineAssistances
			});
		}

		// If no type specified, return both
		const financialAssistances = await FinancialAssistance.find({
			where: Object.keys(where).length > 0 ? where : {},
			relations: { person: true},
			order: { disbursed_date: 'DESC', createdAt: 'DESC' }
		});

		const medicineAssistances = await MedicineAssistance.find({
			where: Object.keys(where).length > 0 ? where : {},
			relations: { person: true},
			order: { disbursed_date: 'DESC', createdAt: 'DESC' }
		});

		return json({
			success: true,
			data: {
				financialAssistances,
				medicineAssistances
			}
		});
	} catch (error) {
		console.error('Error fetching assistances:', error);
		return json(
			{ success: false, error: 'Failed to fetch assistances', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Determine if this is a financial or medicine assistance
		const isFinancial = data.type && data.amount !== undefined && !data.medicine_name;
		const isMedicine = data.medicine_name && !data.type;

		if (!data.personId || !data.date_disbursed) {
			return json({ success: false, error: 'Missing required fields: personId and date_disbursed' }, { status: 400 });
		}

		if (isFinancial) {
			// Handle Financial Assistance
			if (!data.type || data.amount === undefined) {
				return json({ success: false, error: 'Missing required fields for financial assistance: type and amount' }, { status: 400 });
			}

			const validTypes = Object.values(FinancialAssistanceType);
			if (!validTypes.includes(data.type)) {
				return json({ success: false, error: `Invalid assistance type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
			}

			const assistance = new FinancialAssistance();
			assistance.personId = parseInt(data.personId);
			assistance.type = data.type;
			assistance.disbursed_date = new Date(data.date_disbursed);
			assistance.value = parseFloat(data.amount);
			await assistance.save();

			// Reload with person info
			const saved = await FinancialAssistance.findOne({
				where: { id: assistance.id },
				relations: { person: true }
			});

			return json({
				success: true,
				data: saved
			}, { status: 201 });
		} else if (isMedicine) {
			// Handle Medicine Assistance
			if (!data.medicine_name || !data.quantity) {
				return json({ success: false, error: 'Missing required fields for medicine assistance: medicine_name and quantity' }, { status: 400 });
			}

			const assistance = new MedicineAssistance();
			assistance.personId = parseInt(data.personId);
			assistance.medicine_name = data.medicine_name;
			assistance.generic_name = data.generic_name || null;
			assistance.dosage = data.dosage || null;
			assistance.quantity = parseInt(data.quantity);
			assistance.unit = data.unit || null;
			assistance.disbursed_date = new Date(data.date_disbursed);
			await assistance.save();

			// Reload with person info
			const saved = await MedicineAssistance.findOne({
				where: { id: assistance.id },
				relations: { person: true }
			});

			return json({
				success: true,
				data: saved
			}, { status: 201 });
		} else {
			return json({ success: false, error: 'Unable to determine assistance type' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error creating assistance:', error);
		return json(
			{ success: false, error: 'Failed to create assistance', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
