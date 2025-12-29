import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Assistance, FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const assistance = await FinancialAssistance.findOne({
			where: { id: parseInt(params.id!) },
			relations: { person: true }
		});

		if (!assistance) {
			return json({ success: false, error: 'Assistance not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: assistance
		});
	} catch (error) {
		console.error('Error fetching assistance:', error);
		return json(
			{ success: false, error: 'Failed to fetch assistance', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const id = parseInt(params.id!);

		const assistance = await FinancialAssistance.findOne({ where: { id } });

		if (!assistance) {
			return json({ success: false, error: 'Assistance not found' }, { status: 404 });
		}

		if (data.personId !== undefined) assistance.personId = parseInt(data.personId);
		if (data.type !== undefined) {
			if (!['AICS', '4PS', 'MAIP'].includes(data.type)) {
				return json({ success: false, error: 'Invalid assistance type' }, { status: 400 });
			}
			assistance.type = data.type;
		}
		if (data.date_disbursed !== undefined) assistance.disbursed_date = new Date(data.date_disbursed);
		if (data.amount !== undefined) assistance.value = parseFloat(data.amount);

		await assistance.save();

		// Reload with person info
		const updated = await FinancialAssistance.findOne({
			where: { id },
			relations: { person: true }
		});

		return json({
			success: true,
			data: updated
		});
	} catch (error) {
		console.error('Error updating assistance:', error);
		return json(
			{ success: false, error: 'Failed to update assistance', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id!);

		// Try to find and delete from both tables
		let assistance = await FinancialAssistance.findOne({ where: { id } });
		
		if (!assistance) {
			assistance = await MedicineAssistance.findOne({ where: { id } });
		}

		if (!assistance) {
			return json({ success: false, error: 'Assistance not found' }, { status: 404 });
		}

		await assistance.remove();

		return json({
			success: true,
			data: { id }
		});
	} catch (error) {
		console.error('Error deleting assistance:', error);
		return json(
			{ success: false, error: 'Failed to delete assistance', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
