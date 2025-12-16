import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Assistance } from '$lib/database/entities/Assistance';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const personId = url.searchParams.get('personId');

		const where: any = {};
		if (personId) {
			where.personId = parseInt(personId);
		}

		const assistances = await Assistance.find({
			where: Object.keys(where).length > 0 ? where : {},
			relations: { person: true},
			order: { date_disbursed: 'DESC', createdAt: 'DESC' }
		});

		return json({
			success: true,
			data: assistances
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

		if (!data.personId || !data.type || !data.date_disbursed || data.amount === undefined) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		if (!['AICS', '4PS', 'MAIP'].includes(data.type)) {
			return json({ success: false, error: 'Invalid assistance type' }, { status: 400 });
		}

		const assistance = new Assistance();
		assistance.personId = parseInt(data.personId);
		assistance.type = data.type;
		assistance.date_disbursed = new Date(data.date_disbursed);
		assistance.amount = parseFloat(data.amount);

		await assistance.save();

		// Reload with person info
		const saved = await Assistance.findOne({
			where: { id: assistance.id },
			relations: ['person']
		});

		return json({
			success: true,
			data: saved
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating assistance:', error);
		return json(
			{ success: false, error: 'Failed to create assistance', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
