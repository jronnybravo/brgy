import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { Person } from '$lib/database/entities/Person';
import { FinancialAssistance, MedicineAssistance } from '$lib/database/entities/Assistance';
import { Like, In } from 'typeorm';
import type { FindOptionsWhere, FindOptionsOrder, FindManyOptions } from 'typeorm';
import qs from 'qs';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const params = qs.parse(url.searchParams.toString()) as {
			start?: string;
			length?: string;
			search?: { value: string };
			filter?: {
				barangayId?: string;
				isSupporter?: string;
				isLeader?: string;
				town?: string;
				barangay?: string;
			};
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

		const dataSource = await getDataSource();
		const whereConditions: FindOptionsWhere<Person>[] = [];

		// Search filter - searches firstName, lastName, middleName, purok
		if (params.search?.value?.trim()) {
			const searchValue = `%${params.search.value.trim()}%`;
			whereConditions.push(
				{ firstName: Like(searchValue) },
				{ lastName: Like(searchValue) },
				{ middleName: Like(searchValue) },
				{ purok: Like(searchValue) }
			);
		}

		const additionalFilters: FindOptionsWhere<Person> = {};

		// Filter by town (parent barangay name)
		const filterTown = params.filter?.town;
		let townFilter: string | null = null;
		if (filterTown) {
			townFilter = filterTown;
		}

		// Filter by barangay name
		const filterBarangay = params.filter?.barangay;
		let barangayFilter: string | null = null;
		if (filterBarangay) {
			barangayFilter = filterBarangay;
		}

		// Filter by barangayId (old method, still support for backward compatibility)
		const filterBarangayId = params.filter?.barangayId;
		if (filterBarangayId) {
			const barangayId = parseInt(filterBarangayId);
			additionalFilters.barangayId = barangayId;
		}

		// Filter by isSupporter
		const filterIsSupporter = params.filter?.isSupporter;
		if (filterIsSupporter !== undefined && filterIsSupporter !== '') {
			additionalFilters.isSupporter = String(filterIsSupporter) === 'true';
		}

		// Filter by isLeader
		const filterIsLeader = params.filter?.isLeader;
		if (filterIsLeader !== undefined && filterIsLeader !== '') {
			additionalFilters.isLeader = String(filterIsLeader) === 'true';
		}

		let finalWhere: FindOptionsWhere<Person> | FindOptionsWhere<Person>[];
		if (whereConditions.length > 0) {
			// If we have search conditions, merge them with filters
			finalWhere = whereConditions.map(condition => ({
				...condition,
				...additionalFilters
			}));
		} else {
			// No search conditions, just use filters if any exist
			finalWhere = Object.keys(additionalFilters).length > 0 ? additionalFilters : {};
		}

		// Pagination
		const start = Number(params.start) || 0;
		const length = Number(params.length) || 10;

		// Determine sort column and direction
		let sortColumn = 'lastName';
		let sortDir = 'ASC';
		if (params.order) {
			const orderArray = Array.isArray(params.order) ? params.order : [params.order];
			if (orderArray.length > 0) {
				sortColumn = orderArray[0].name;
				sortDir = orderArray[0].dir.toUpperCase();
			}
		}

		// Get total count before filtering
		const recordsTotal = await Person.count();

		// For simple column sorts, use standard find
		if (!['financialTotal', 'medicineCount'].includes(sortColumn)) {
			const order: FindOptionsOrder<Person> = {};
			order[sortColumn as keyof Person] = (sortDir === 'ASC' ? 'ASC' : 'DESC') as any;

			let query = dataSource
				.createQueryBuilder(Person, 'person')
				.leftJoinAndSelect('person.barangay', 'barangay')
				.leftJoinAndSelect('barangay.parent', 'parent')
				.select([
					'person.id',
					'person.firstName',
					'person.lastName',
					'person.middleName',
					'person.extensionName',
					'person.birthdate',
					'person.barangayId',
					'person.purok',
					'person.sex',
					'person.isSupporter',
					'person.isLeader',
					'barangay.id',
					'barangay.name',
					'parent.id',
					'parent.name'
				]);

			// Apply where conditions
			if (Array.isArray(finalWhere)) {
				const orConditions = finalWhere.map((condition, idx) => {
					const parts: string[] = [];
					if (condition.firstName) parts.push(`person.firstName LIKE :firstName${idx}`);
					if (condition.lastName) parts.push(`person.lastName LIKE :lastName${idx}`);
					if (condition.middleName) parts.push(`person.middleName LIKE :middleName${idx}`);
					if (condition.purok) parts.push(`person.purok LIKE :purok${idx}`);
					return parts.length > 0 ? `(${parts.join(' OR ')})` : null;
				}).filter(Boolean);

				if (orConditions.length > 0) {
					query.where(orConditions.map((_, idx) => `(${orConditions[idx]})`).join(' OR '));
					finalWhere.forEach((condition, idx) => {
						if (condition.firstName) query.setParameter(`firstName${idx}`, `%${(condition.firstName as any).value || ''}%`);
						if (condition.lastName) query.setParameter(`lastName${idx}`, `%${(condition.lastName as any).value || ''}%`);
						if (condition.middleName) query.setParameter(`middleName${idx}`, `%${(condition.middleName as any).value || ''}%`);
						if (condition.purok) query.setParameter(`purok${idx}`, `%${(condition.purok as any).value || ''}%`);
					});
				}

				// Apply additional filters as AND conditions
				if (additionalFilters.barangayId) query.andWhere('person.barangayId = :barangayId', { barangayId: additionalFilters.barangayId });
				if (additionalFilters.isSupporter !== undefined) query.andWhere('person.isSupporter = :isSupporter', { isSupporter: additionalFilters.isSupporter });
				if (additionalFilters.isLeader !== undefined) query.andWhere('person.isLeader = :isLeader', { isLeader: additionalFilters.isLeader });
			} else if (Object.keys(finalWhere).length > 0) {
				if (finalWhere.barangayId) query.andWhere('person.barangayId = :barangayId', { barangayId: finalWhere.barangayId });
				if (finalWhere.isSupporter !== undefined) query.andWhere('person.isSupporter = :isSupporter', { isSupporter: finalWhere.isSupporter });
				if (finalWhere.isLeader !== undefined) query.andWhere('person.isLeader = :isLeader', { isLeader: finalWhere.isLeader });
			}

			// Apply town filter
			if (townFilter) {
				query.andWhere('parent.name = :townName', { townName: townFilter });
			}

			// Apply barangay filter
			if (barangayFilter) {
				query.andWhere('barangay.name = :barangayName', { barangayName: barangayFilter });
			}

			// Apply sorting
			query.orderBy(`person.${sortColumn}`, sortDir.toUpperCase() as 'ASC' | 'DESC');

			// Get filtered count
			const recordsFiltered = await query.getCount();

			// Apply pagination
			query.offset(start).limit(length);

			const data = await query.getMany();

			// Fetch all assistances for the people on this page
			const personIds = data.map(p => p.id);
			const financialAssistances = personIds.length > 0 
				? await FinancialAssistance.find({ where: { personId: In(personIds) } })
				: [];
			const medicineAssistances = personIds.length > 0
				? await MedicineAssistance.find({ where: { personId: In(personIds) } })
				: [];

			// Compute aggregates for each person
			const dataWithAggregates = data.map(person => {
				const financial = financialAssistances
					.filter(fa => fa.personId === person.id)
					.reduce((sum, fa) => sum + (parseFloat(fa.value.toString()) || 0), 0);
				const medicine = medicineAssistances
					.filter(ma => ma.personId === person.id)
					.length;

				return {
					...person,
					financialTotal: financial,
					medicineCount: medicine
				};
			});

			return json({
				success: true,
				recordsTotal,
				recordsFiltered,
				data: dataWithAggregates,
				message: 'People retrieved successfully'
			});
		} else {
			// For aggregate column sorts, use query builder with JOINs and GROUP BY for database-level sorting
			const query = dataSource
				.createQueryBuilder(Person, 'person')
				.leftJoinAndSelect('person.barangay', 'barangay')
				.leftJoinAndSelect('barangay.parent', 'parent')
				.leftJoin(FinancialAssistance, 'fa', 'fa.personId = person.id')
				.leftJoin(MedicineAssistance, 'ma', 'ma.personId = person.id')
				.select([
					'person.id',
					'person.firstName',
					'person.lastName',
					'person.middleName',
					'person.extensionName',
					'person.birthdate',
					'person.barangayId',
					'person.purok',
					'person.sex',
					'person.isSupporter',
					'person.isLeader',
					'barangay.id',
					'barangay.name',
					'parent.id',
					'parent.name'
				])
				.addSelect('COALESCE(SUM(CAST(fa.value AS DECIMAL(10,2))), 0)', 'financialTotal')
				.addSelect('COUNT(DISTINCT ma.id)', 'medicineCount')
				.groupBy('person.id')
				.addGroupBy('barangay.id')
				.addGroupBy('parent.id');

			// Apply where conditions
			if (Array.isArray(finalWhere)) {
				// Multiple OR conditions
				const orConditions = finalWhere.map((condition, idx) => {
					const parts: string[] = [];
					if (condition.firstName) parts.push(`person.firstName LIKE :firstName${idx}`);
					if (condition.lastName) parts.push(`person.lastName LIKE :lastName${idx}`);
					if (condition.middleName) parts.push(`person.middleName LIKE :middleName${idx}`);
					if (condition.purok) parts.push(`person.purok LIKE :purok${idx}`);
					return parts.length > 0 ? `(${parts.join(' OR ')})` : null;
				}).filter(Boolean);

				if (orConditions.length > 0) {
					query.where(orConditions.map((_, idx) => `(${orConditions[idx]})`).join(' OR '));
					finalWhere.forEach((condition, idx) => {
						if (condition.firstName) query.setParameter(`firstName${idx}`, `%${(condition.firstName as any).value || ''}%`);
						if (condition.lastName) query.setParameter(`lastName${idx}`, `%${(condition.lastName as any).value || ''}%`);
						if (condition.middleName) query.setParameter(`middleName${idx}`, `%${(condition.middleName as any).value || ''}%`);
						if (condition.purok) query.setParameter(`purok${idx}`, `%${(condition.purok as any).value || ''}%`);
					});
				}
			} else if (Object.keys(finalWhere).length > 0) {
				// Single condition
				if (finalWhere.barangayId) query.andWhere('person.barangayId = :barangayId', { barangayId: finalWhere.barangayId });
				if (finalWhere.isSupporter !== undefined) query.andWhere('person.isSupporter = :isSupporter', { isSupporter: finalWhere.isSupporter });
				if (finalWhere.isLeader !== undefined) query.andWhere('person.isLeader = :isLeader', { isLeader: finalWhere.isLeader });
			}

			// Apply town filter
			if (townFilter) {
				query.andWhere('parent.name = :townName', { townName: townFilter });
			}

			// Apply barangay filter
			if (barangayFilter) {
				query.andWhere('barangay.name = :barangayName', { barangayName: barangayFilter });
			}

			// Add sorting by aggregate
			if (sortColumn === 'financialTotal') {
				query.orderBy('financialTotal', sortDir.toUpperCase() as 'ASC' | 'DESC');
			} else if (sortColumn === 'medicineCount') {
				query.orderBy('medicineCount', sortDir.toUpperCase() as 'ASC' | 'DESC');
			} else {
				// Default sort by name for other columns
				query.orderBy('person.lastName', 'ASC').addOrderBy('person.firstName', 'ASC');
			}

			// Get total count before pagination (requires a separate count query)
			const countQuery = dataSource
				.createQueryBuilder(Person, 'person')
				.select('COUNT(DISTINCT person.id)', 'count');

			if (Array.isArray(finalWhere)) {
				// Apply where for count
				const orConditions = finalWhere.map((_, idx) => `(person.firstName LIKE :firstName${idx} OR person.lastName LIKE :lastName${idx} OR person.middleName LIKE :middleName${idx} OR person.purok LIKE :purok${idx})`).join(' OR ');
				countQuery.where(orConditions);
				finalWhere.forEach((condition, idx) => {
					if (condition.firstName) countQuery.setParameter(`firstName${idx}`, `%${(condition.firstName as any).value || ''}%`);
					if (condition.lastName) countQuery.setParameter(`lastName${idx}`, `%${(condition.lastName as any).value || ''}%`);
					if (condition.middleName) countQuery.setParameter(`middleName${idx}`, `%${(condition.middleName as any).value || ''}%`);
					if (condition.purok) countQuery.setParameter(`purok${idx}`, `%${(condition.purok as any).value || ''}%`);
				});
			} else if (Object.keys(finalWhere).length > 0) {
				if (finalWhere.barangayId) countQuery.andWhere('person.barangayId = :barangayId', { barangayId: finalWhere.barangayId });
				if (finalWhere.isSupporter !== undefined) countQuery.andWhere('person.isSupporter = :isSupporter', { isSupporter: finalWhere.isSupporter });
				if (finalWhere.isLeader !== undefined) countQuery.andWhere('person.isLeader = :isLeader', { isLeader: finalWhere.isLeader });
			}

			const countResult = await countQuery.getRawOne();
			const recordsFiltered = parseInt(countResult?.count || '0', 10);

			// Apply pagination
			query.offset(start).limit(length);

			const results = await query.getRawAndEntities();
			const dataWithAggregates = results.entities.map((person, idx) => ({
				...person,
				financialTotal: parseFloat(results.raw[idx].financialTotal || '0'),
				medicineCount: parseInt(results.raw[idx].medicineCount || '0', 10)
			}));

			return json({
				success: true,
				recordsTotal,
				recordsFiltered,
				data: dataWithAggregates,
				message: 'People retrieved successfully'
			});
		}
	} catch (error) {
		console.error('Error fetching people:', error);
		return json(
			{ 
				success: false, 
				recordsTotal: 0,
				recordsFiltered: 0,
				data: [],
				error: 'Failed to fetch people', 
				details: error instanceof Error ? error.message : String(error) 
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.lastName || !data.firstName || !data.birthdate || !data.sex) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		const person = new Person();
		person.firstName = data.firstName;
		person.lastName = data.lastName;
		person.middleName = data.middleName || null;
		person.extensionName = data.extensionName || null;
		person.birthdate = new Date(data.birthdate);
		person.sex = data.sex;
		person.barangayId = data.barangayId || null;
		person.purok = data.purok || null;
		person.isSupporter = data.isSupporter !== undefined ? data.isSupporter : null;
		person.isLeader = data.isLeader || false;

		await person.save();

		return json({
			success: true,
			data: person
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating person:', error);
		return json(
			{ success: false, error: 'Failed to create person', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
};
