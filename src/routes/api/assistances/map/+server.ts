import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FinancialAssistance, MedicineAssistance, FinancialAssistanceType } from '$lib/database/entities/Assistance';
import { Locality } from '$lib/database/entities/Locality';

/**
 * GET assistances formatted for map display
 * Returns disbursement totals per barangay for each financial assistance type
 * 
 * Response format:
 * {
 *   barangays: [{ id, name, totalDisbursed, byType: { AICS: amount, 4PS: amount, ... } }],
 *   totals: { [type]: totalAmount }
 * }
 */
export const GET: RequestHandler = async () => {
	try {
		// Get all barangays first
		const allBarangays = await Locality.find({
			where: {
				type: 'Barangay'
			}
		});

		// Get all financial assistances with related person and barangay info
		const financialAssistances = await FinancialAssistance.find({
			relations: {
				person: {
					barangay: true
				}
			}
		});

		// Initialize barangay map with all barangays (even with 0 disbursements)
		// Initialize all assistance types with 0 values
		const barangayMap: Record<number, any> = {};
		const allTypes = Object.values(FinancialAssistanceType);
		
		allBarangays.forEach((barangay) => {
			const byType: Record<string, number> = {};
			allTypes.forEach((type) => {
				byType[type] = 0;
			});
			
			barangayMap[barangay.id] = {
				id: barangay.id,
				name: barangay.name,
				totalDisbursed: 0,
				byType: byType
			};
		});

		// Aggregate financial assistances
		financialAssistances.forEach((assistance) => {
			const barangayId = assistance.person?.barangay?.id;

			if (!barangayId || !barangayMap[barangayId]) return;

			const amount = parseFloat(String(assistance.value)) || 0;
			const type = assistance.type;

			barangayMap[barangayId].totalDisbursed += amount;
			barangayMap[barangayId].byType[type] = (barangayMap[barangayId].byType[type] || 0) + amount;
		});

		// Calculate totals by type
		const typeTotals: Record<string, number> = {};
		allTypes.forEach((type) => {
			typeTotals[type] = 0;
		});
		
		Object.values(barangayMap).forEach((barangay) => {
			Object.entries(barangay.byType).forEach(([type, amount]: [string, any]) => {
				typeTotals[type] = (typeTotals[type] || 0) + (amount as number);
			});
		});

		return json({
			success: true,
			barangays: Object.values(barangayMap),
			totals: typeTotals,
			types: allTypes
		});
	} catch (error) {
		console.error('Error fetching assistances for map:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch assistances for map',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
