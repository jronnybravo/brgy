import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Assistance, FinancialAssistance, MedicineAssistance, FinancialAssistanceType } from '$lib/database/entities/Assistance';
import { Like } from 'typeorm';
import qs from 'qs';
import { getDataSource } from '$lib/database/data-source';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const dataSource = await getDataSource();
		const type = url.searchParams.get('type');
		
		// Parse query parameters
		const params = qs.parse(url.searchParams.toString()) as {
			start?: string;
			length?: string;
			search?: { value: string };
			filter?: {
				town?: string;
				barangay?: string;
				isSupporter?: string;
			};
			assistanceType?: string;
			order?: 
				| { 
					name: string; 
					dir: 'asc' | 'desc' 
				}
				| { 
					name: string; 
					dir: 'asc' | 'desc' 
				}[];
		};

		const start = Number(params.start) || 0;
		const length = Number(params.length) || 10;
		
		// Determine sort column and direction
		let sortColumn = 'disbursed_date';
		let sortDir: 'ASC' | 'DESC' = 'DESC';
		if (params.order) {
			const orderArray = Array.isArray(params.order) ? params.order : [params.order];
			if (orderArray.length > 0) {
				const orderName = orderArray[0].name;
				// Map sort column names to proper field paths
				if (orderName === 'person' || orderName === 'personName') {
					sortColumn = 'person.lastName';
				} else if (orderName === 'town') {
					sortColumn = 'parent.name';
				} else if (orderName === 'barangay') {
					sortColumn = 'barangay.name';
				} else if (orderName === 'type') {
					sortColumn = 'assistance.type';
				} else {
					sortColumn = `assistance.${orderName}`;
				}
				sortDir = orderArray[0].dir.toUpperCase() as 'ASC' | 'DESC';
			}
		}

		const searchValue = params.search?.value?.trim();
		const townFilter = params.filter?.town?.trim();
		const barangayFilter = params.filter?.barangay?.trim();
		const assistanceTypeFilter = params.assistanceType?.trim();
		const supporterFilter = params.filter?.isSupporter?.trim();

		// Determine which assistance type to query
		const assistanceEntity = type === 'financial' ? FinancialAssistance : MedicineAssistance;
		const alias = 'assistance';

		// Build query
		let query = dataSource
			.createQueryBuilder(assistanceEntity, alias)
			.leftJoinAndSelect(`${alias}.person`, 'person')
			.leftJoinAndSelect('person.barangay', 'barangay')
			.leftJoinAndSelect('barangay.parent', 'parent');

		// Apply search filter (name only)
		if (searchValue) {
			query.andWhere(
				`(person.firstName LIKE :searchValue OR person.lastName LIKE :searchValue)`,
				{ searchValue: `%${searchValue}%` }
			);
		}

		// Apply town filter
		if (townFilter) {
			query.andWhere('parent.name = :townName', { townName: townFilter });
		}

		// Apply barangay filter
		if (barangayFilter) {
			query.andWhere('barangay.name = :barangayName', { barangayName: barangayFilter });
		}

		// Apply supporter filter
		if (supporterFilter === 'true') {
			query.andWhere('person.isSupporter = true');
		} else if (supporterFilter === 'false') {
			query.andWhere('person.isSupporter = false OR person.isSupporter IS NULL');
		}

		// Apply assistance type filter (only for financial)
		if (type === 'financial' && assistanceTypeFilter) {
			query.andWhere('assistance.type = :assistanceType', { assistanceType: assistanceTypeFilter });
		}

		// Get total count before pagination
		const recordsTotal = await query.getCount();

		// Apply sorting
		let orderByField = 'assistance.disbursed_date';
		if (sortColumn === 'person.lastName') {
			orderByField = 'person.lastName';
		} else if (sortColumn === 'parent.name') {
			orderByField = 'parent.name';
		} else if (sortColumn === 'barangay.name') {
			orderByField = 'barangay.name';
		} else if (sortColumn === 'type') {
			orderByField = 'assistance.type';
		}
		query.orderBy(orderByField, sortDir);

		// Apply pagination
		query.offset(start).limit(length);

		const data = await query.getMany();

		return json({
			success: true,
			data: data,
			recordsTotal: recordsTotal,
			recordsFiltered: data.length
		});
	} catch (error) {
		console.error('[ERROR] assistances GET:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Unknown error',
			data: [],
			recordsTotal: 0,
			recordsFiltered: 0
		}, { status: 500 });
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
