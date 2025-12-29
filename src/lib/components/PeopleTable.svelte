<script lang="ts">
	import { onMount } from 'svelte';
	import Pagination from './Pagination.svelte';
	
	interface Props {
		people?: any[];
		financialAssistances?: any[];
		medicineAssistances?: any[];
		showLocationColumns?: boolean;
		onEdit?: ((person: any) => void) | null;
		onDelete?: ((id: number) => void) | null;
		onPageChange?: ((page: number) => Promise<void>) | null;
		onSort?: ((column: string, direction: 'asc' | 'desc') => void) | null;
		onSearch?: ((query: string) => void) | null;
		onTownFilter?: ((town: string) => void) | null;
		onBarangayFilter?: ((barangay: string) => void) | null;
		onSupporterFilter?: ((isSupporterFilter: boolean | null) => void) | null;
		recordsTotal?: number;
		recordsFiltered?: number;
		currentPage?: number;
		totalPages?: number;
		loading?: boolean;
		sortColumn?: string;
		sortDir?: 'asc' | 'desc';
		capabilities?: {
			canUpdatePersons: boolean;
			canDeletePersons: boolean;
		};
		townFilter?: string;
		barangayFilter?: string;
	}

	let {
		people = [],
		financialAssistances = [],
		medicineAssistances = [],
		showLocationColumns = true,
		onEdit = null,
		onDelete = null,
		onPageChange = null,
		onSort = null,
		onSearch = null,
		onTownFilter = null,
		onBarangayFilter = null,
		onSupporterFilter = null,
		recordsTotal = 0,
		recordsFiltered = 0,
		currentPage = 1,
		totalPages = 1,
		loading = false,
		sortColumn = 'lastName',
		sortDir = 'asc' as 'asc' | 'desc',
		capabilities = {
			canDeletePersons: true,
			canUpdatePersons: true,
		},
		townFilter = '',
		barangayFilter = ''
	}: Props = $props();

	let searchQuery = $state('');
	let isSupporterFilter = $state<boolean | null>(null);
	let towns: any[] = $state([]);
	let townLoading = $state(false);
	const pageSize = 10;

	let showAidModal = $state(false);
	let selectedPerson = $state<any>(null);
	let selectedAidType = $state<'financial' | 'medicine' | null>(null);

	async function loadTowns() {
		try {
			townLoading = true;
			const res = await fetch('/api/locations/town-barangay');
			if (!res.ok) throw new Error('Failed to load towns');
			const result = await res.json();
			towns = result.towns || [];
		} catch (e) {
			console.error('Error loading towns:', e);
		} finally {
			townLoading = false;
		}
	}

	onMount(async () => {
		// Load towns once on mount
		await loadTowns();
	});

	function handleSearch(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		if (onSearch) {
			onSearch(searchQuery);
		}
	}

	function toggleSupporterFilter() {
		if (isSupporterFilter === null) {
			isSupporterFilter = true;
		} else if (isSupporterFilter === true) {
			isSupporterFilter = false;
		} else {
			isSupporterFilter = null;
		}
		if (onSupporterFilter) {
			onSupporterFilter(isSupporterFilter);
		}
	}

	function getFinancialTotal(person: any): number {
		// Use pre-computed aggregate from server
		return person.financialTotal || 0;
	}

	function getMedicineCount(person: any): number {
		// Use pre-computed aggregate from server
		return person.medicineCount || 0;
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(value);
	}

	function openAidHistory(person: any, aidType: 'financial' | 'medicine') {
		selectedPerson = person;
		selectedAidType = aidType;
		showAidModal = true;
	}

	function closeAidModal() {
		showAidModal = false;
		selectedPerson = null;
		selectedAidType = null;
	}

	function getPersonFinancialAids(personId: number) {
		return financialAssistances.filter(fa => fa.personId === personId);
	}

	function getPersonMedicineAids(personId: number) {
		return medicineAssistances.filter(ma => ma.personId === personId);
	}

	const paginatedData = $derived(people);

	const editPerson = (person: any) => {
		if (onEdit) {
			onEdit(person);
		}
	};

	const deletePerson = (id: number) => {
		if (onDelete) {
			onDelete(id);
		}
	};

	function handlePageChange(page: number) {
		if (onPageChange) {
			onPageChange(page);
		}
	}

	function handleColumnSort(column: string) {
		let newDir: 'asc' | 'desc' = 'asc';
		if (sortColumn === column) {
			// Toggle direction if same column
			newDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, start with asc
			newDir = 'asc';
		}
		// Trigger sort through callback
		if (onSort) {
			onSort(column, newDir);
		}
	}
</script>

<div class="card shadow-sm border-0">
	<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
		<div class="row align-items-center">
			<div class="col-md-2">
				<input
					type="text"
					class="form-control form-control-sm"
					placeholder="Search people..."
					value={searchQuery}
					oninput={handleSearch}
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
				/>
			</div>
			<div class="col-md-2">
				<select
					class="form-select form-select-sm"
					value={String(townFilter)}
					onchange={(e) => {
						const town = (e.target as HTMLSelectElement).value;
						if (onTownFilter) onTownFilter(town);
					}}
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
				>
					<option value="">All Towns</option>
					{#each towns as town}
						<option value={String(town.id)}>{town.name}</option>
					{/each}
				</select>
			</div>
			<div class="col-md-2">
				<select
					class="form-select form-select-sm"
					value={barangayFilter}
					onchange={(e) => {
						const barangay = (e.target as HTMLSelectElement).value;
						if (onBarangayFilter) onBarangayFilter(barangay);
					}}
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
				>
					<option value="">All Barangays</option>
					{#if townFilter}
					{#each towns.find(t => t.id == townFilter)?.children || [] as barangay}
							<option value={barangay.name}>{barangay.name}</option>
						{/each}
					{:else}
						{#each towns as town}
							<optgroup label={town.name}>
								{#each town.children || [] as barangay}
									<option value={barangay.name}>{barangay.name}</option>
								{/each}
							</optgroup>
						{/each}
					{/if}
				</select>
			</div>
			<div class="col-md-2">
				<div class="form-check form-check-inline">
					<input class="form-check-input"
						type="checkbox"
						id="supporterFilter"
						checked={isSupporterFilter}
						onchange={toggleSupporterFilter}
						style="cursor: pointer;"
					/>
					<label class="form-check-label text-white" for="supporterFilter" style="cursor: pointer;">
						Supporters Only
					</label>
				</div>
			</div>
		</div>
	</div>

	<div class="table-responsive">
		<table class="table table-hover mb-0">
			<thead class="table-light">
				<tr>
					<th style="cursor: pointer;" onclick={() => handleColumnSort('lastName')}>
						Name {#if sortColumn === 'lastName'}{sortDir === 'asc' ? '↑' : '↓'}{/if}
					</th>
					{#if showLocationColumns}
						<th>Town</th>
						<th>Barangay</th>
					{/if}
					<th>Purok</th>
					<th>Is Supporter</th>
					<th class="text-end" style="cursor: pointer;" onclick={() => handleColumnSort('financialTotal')}>
						Financial Aid (total) {#if sortColumn === 'financialTotal'}{sortDir === 'asc' ? '↑' : '↓'}{/if}
					</th>
					<th class="text-center" style="cursor: pointer;" onclick={() => handleColumnSort('medicineCount')}>
						Medicine Aid (count) {#if sortColumn === 'medicineCount'}{sortDir === 'asc' ? '↑' : '↓'}{/if}
					</th>
					<th class="text-center">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="8" class="text-center py-5 text-muted">
							<div class="spinner-border me-2" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
							Loading people...
						</td>
					</tr>
				{:else if paginatedData.length === 0}
					<tr>
						<td colspan="8" class="text-center py-5 text-muted">
							<p class="mb-0 fs-5">No people found</p>
							<small class="text-muted">Add your first person to get started</small>
						</td>
					</tr>
				{:else}
					{#each paginatedData as person (person.id)}
					<tr>
						<td class="fw-bold" style="color: #2c3e50;">
							{person.lastName}{person.firstName ? `, ${person.firstName}` : ''}{person.middleName ? ` ${person.middleName.charAt(0)}.` : ''}
						</td>
						{#if showLocationColumns}
							<td>{person.barangay?.parent?.name || '-'}</td>
							<td>{person.barangay?.name || '-'}</td>
						{/if}
						<td>{person.purok || '-'}</td>
						<td>
							{#if person.isSupporter === null}
								<span class="badge bg-secondary">Unsure</span>
							{:else if person.isSupporter}
								<span class="badge bg-success">Yes</span>
							{:else}
								<span class="badge bg-danger">No</span>
							{/if}
						</td>
						<td class="text-end">
							{#if getFinancialTotal(person) > 0}
								<button onclick={() => openAidHistory(person, 'financial')}
									class="badge bg-success" 
									style="border: none; cursor: pointer; padding: 0.5em 0.75em;"
									title="Click to view history">
									{formatCurrency(getFinancialTotal(person))}
								</button>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>
						<td class="text-center">
							{#if getMedicineCount(person) > 0}
								<button onclick={() => openAidHistory(person, 'medicine')}
									class="badge bg-info" 
									style="border: none; cursor: pointer; padding: 0.5em 0.75em;"
									title="Click to view history">
									{getMedicineCount(person)}
								</button>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>
						<td class="text-center">
							<div style="display: flex; gap: 0.5rem; justify-content: center;">
								{#if capabilities.canUpdatePersons}
									<button onclick={() => editPerson(person)}
										class="btn btn-sm btn-warning"
										title="Edit person">
										✏️
									</button>
								{/if}
								{#if capabilities.canDeletePersons}
									<button onclick={() => deletePerson(person.id)}
										class="btn btn-sm btn-danger"
										title="Delete person">
										🗑️
									</button>
								{/if}
							</div>
						</td>
					</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<div class="card-footer bg-light d-flex justify-content-between align-items-center">
		<div class="text-muted small">
			Showing {Math.min((currentPage - 1) * pageSize + 1, recordsFiltered)} to {Math.min(currentPage * pageSize, recordsFiltered)} of {recordsFiltered} ({recordsTotal} total)
		</div>
		<Pagination 
			{currentPage}
			totalPages={totalPages}
			onPageChange={handlePageChange}
		/>
	</div>
</div>

<!-- Aid History Modal -->
{#if showAidModal && selectedPerson && selectedAidType}
	<div class="modal d-block" style="background-color: rgba(0, 0, 0, 0.5);">
		<div class="modal-dialog modal-lg">
			<div class="modal-content">
				<div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="modal-title">
						{#if selectedAidType === 'financial'}
							💰 Financial Aid History - {selectedPerson.firstName} {selectedPerson.lastName}
						{:else}
							💊 Medicine Aid History - {selectedPerson.firstName} {selectedPerson.lastName}
						{/if}
					</h5>
					<button type="button" class="btn-close btn-close-white" aria-label="Close modal" onclick={closeAidModal}></button>
				</div>
				<div class="modal-body">
					{#if selectedAidType === 'financial'}
						{@const aids = getPersonFinancialAids(selectedPerson.id)}
						{#if aids.length > 0}
							<div class="table-responsive">
								<table class="table table-striped">
									<thead class="table-light">
										<tr>
											<th>Type</th>
											<th>Amount</th>
											<th>Date Disbursed</th>
										</tr>
									</thead>
									<tbody>
										{#each aids as aid}
											<tr>
												<td><strong>{aid.type}</strong></td>
												<td class="text-end">{formatCurrency(parseFloat(aid.value || 0))}</td>
												<td>{new Date(aid.disbursed_date).toLocaleDateString('en-PH')}</td>
											</tr>
										{/each}
										<tr style="background-color: #f8f9fa; font-weight: bold;">
											<td colspan="1">Total:</td>
											<td class="text-end">
												{formatCurrency(aids.reduce((sum, aid) => sum + parseFloat(aid.value || 0), 0))}
											</td>
											<td></td>
										</tr>
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-center py-4 text-muted">
								<p>No financial aid records found</p>
							</div>
						{/if}
					{:else if selectedAidType === 'medicine'}
						{@const aids = getPersonMedicineAids(selectedPerson.id)}
						{#if aids.length > 0}
							<div class="table-responsive">
								<table class="table table-striped">
									<thead class="table-light">
										<tr>
											<th>Medicine Name</th>
											<th>Generic Name</th>
											<th>Dosage</th>
											<th>Quantity</th>
											<th>Date Disbursed</th>
										</tr>
									</thead>
									<tbody>
										{#each aids as aid}
											<tr>
												<td><strong>{aid.medicine_name}</strong></td>
												<td>{aid.generic_name || '-'}</td>
												<td>{aid.dosage || '-'}</td>
												<td>{aid.quantity} {aid.unit || ''}</td>
												<td>{new Date(aid.disbursed_date).toLocaleDateString('en-PH')}</td>
											</tr>
										{/each}
										<tr style="background-color: #f8f9fa; font-weight: bold;">
											<td colspan="3">Total Quantity:</td>
											<td>
												{aids.reduce((sum, aid) => sum + (aid.quantity || 0), 0)}
											</td>
											<td></td>
										</tr>
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-center py-4 text-muted">
								<p>No medicine aid records found</p>
							</div>
						{/if}
					{/if}
				</div>
				<div class="modal-footer">
					<button onclick={closeAidModal}
						type="button"
						class="btn btn-secondary">
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
