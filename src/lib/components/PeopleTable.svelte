<script lang="ts">
	import { onMount } from 'svelte';
	import Pagination from './Pagination.svelte';
	import type { Locality } from '$lib/database/entities/Locality';
	
	interface Props {
		showLocationColumns?: boolean;
		capabilities?: {
			canUpdatePersons: boolean;
			canDeletePersons: boolean;
			canCreatePersons?: boolean;
		};
	}

	let {
		showLocationColumns = true,
		capabilities = {
			canDeletePersons: true,
			canUpdatePersons: true,
		}
	}: Props = $props();

	// Data state
	let people: any[] = $state([]);
	let towns: Locality[] = $state([]);
	let barangays: Locality[] = $state([]);
	
	// Pagination & sorting state
	let recordsTotal = $state(0);
	let recordsFiltered = $state(0);
	let currentPage = $state(1);
	let sortColumn = $state('lastName');
	let sortDir = $state<'asc' | 'desc'>('asc');
	
	// Filter state
	let searchQuery = $state('');
	let selectedTown = $state<Locality | null>(null);
	let selectedBarangay = $state<Locality | null>(null);
	let supporterFilter = $state<boolean | null>(null);
	
	// UI state
	let loading = $state(false);
	let error = $state('');
	let showAidModal = $state(false);
	let selectedPerson = $state<any>(null);
	let selectedAidType = $state<'financial' | 'medicine' | null>(null);
	let selectedPersonAids = $state<any[]>([]);

	const pageSize = 10;
	const totalPages = $derived(Math.ceil((recordsFiltered || 1) / pageSize));

	// Load people data with filters and pagination
	async function loadPeople(page?: number) {
		if (page !== undefined && page !== null) {
			currentPage = page;
		}

		loading = true;
		error = '';

		try {
			const queryParams = new URLSearchParams();
			queryParams.append('start', ((currentPage - 1) * pageSize).toString());
			queryParams.append('length', pageSize.toString());
			queryParams.append('order[0][name]', sortColumn);
			queryParams.append('order[0][dir]', sortDir);

			if (searchQuery.trim()) {
				queryParams.append('search[value]', searchQuery.trim());
			}

			if (selectedTown) {
				queryParams.append('filter[town]', selectedTown.id.toString());
				if(selectedBarangay?.parentId !== selectedTown.id) {
					selectedBarangay = null;
				}
			}

			if (selectedBarangay) {
				queryParams.append('filter[barangay]', selectedBarangay.id.toString());
			}

			if (supporterFilter !== null) {
				queryParams.append('filter[isSupporter]', supporterFilter.toString());
			}

			const res = await fetch(`/api/people?${queryParams.toString()}`);
			if (!res.ok) throw new Error('Failed to load people');

			const result = await res.json();
			people = result.data || [];
			recordsTotal = result.recordsTotal || 0;
			recordsFiltered = result.recordsFiltered || 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading people';
			console.error('Error in loadPeople:', e);
		} finally {
			loading = false;
		}
	}

	async function loadTowns() {
		try {
			const response = await fetch('/api/localities/towns/jurisdictional/');
			const { success, data } = await response.json();
			if (success) {
				towns = data;
			}
		} catch (e) {
			console.error('Error loading towns:', e);
		}
	}

	async function loadBarangays() {
		try {
			const response = await fetch('/api/localities/barangays/jurisdictional/');
			const { success, data } = await response.json();
			if (success) {
				barangays = data;
			}
		} catch (e) {
			console.error('Error loading barangays:', e);
		}
	}

	// Delete a person
	async function deletePerson(id: number) {
		if (!confirm('Are you sure you want to delete this person?')) return;

		try {
			const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete person');
			await loadPeople();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error deleting person';
		}
	}

	// Handle search
	function handleSearch(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		currentPage = 1;
		loadPeople(1);
	}

	// Handle column sorting
	function handleColumnSort(column: string) {
		let newDir: 'asc' | 'desc' = 'asc';
		if (sortColumn === column) {
			newDir = sortDir === 'asc' ? 'desc' : 'asc';
		}
		sortColumn = column;
		sortDir = newDir;
		currentPage = 1;
		loadPeople(1);
	}

	// Handle supporter filter
	function toggleSupporterFilter() {
		if (supporterFilter === null) {
			supporterFilter = true;
		} else if (supporterFilter === true) {
			supporterFilter = false;
		} else {
			supporterFilter = null;
		}
		currentPage = 1;
		loadPeople(1);
	}

	// Handle page change
	function handlePageChange(page: number) {
		loadPeople(page);
	}

	// Format currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(value);
	}

	// Get financial total for a person
	function getFinancialTotal(person: any): number {
		return person.financialTotal || 0;
	}

	// Get medicine count for a person
	function getMedicineCount(person: any): number {
		return person.medicineCount || 0;
	}

	// Open aid history modal
	async function openAidHistory(person: any, aidType: 'financial' | 'medicine') {
		selectedPerson = person;
		selectedAidType = aidType;

		try {
			const endpoint = aidType === 'financial'
				? `/api/people/${person.id}/assistances?type=financial`
				: `/api/people/${person.id}/assistances?type=medicine`;

			const res = await fetch(endpoint);
			selectedPersonAids = res.ok ? await res.json() : [];
		} catch (e) {
			console.error('Error loading aid history:', e);
			selectedPersonAids = [];
		}

		showAidModal = true;
	}

	// Close aid modal
	function closeAidModal() {
		showAidModal = false;
		selectedPerson = null;
		selectedAidType = null;
		selectedPersonAids = [];
	}

	// Initialize on mount
	onMount(async () => {
		loadPeople();
		await loadTowns();
		await loadBarangays();
	});
</script>

{#if error}
	<div class="alert alert-danger alert-dismissible fade show" role="alert">
		<strong>Error!</strong> {error}
		<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
	</div>
{/if}

<div class="card shadow-sm border-0">
	<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
		<div class="row align-items-center g-2">
			<div class="col-md-3">
				<input
					type="text"
					class="form-control form-control-sm"
					placeholder="Search people..."
					value={searchQuery}
					oninput={handleSearch}
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
				/>
			</div>
			<div class="col-md-3">
				<select bind:value={selectedTown}
					onchange={() => { loadPeople(1); } }
					class="form-select form-select-sm"
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
					<option value={null}>All Towns</option>
					{#each towns as town}
						<option value={town}>{town.name}</option>
					{/each}
				</select>
			</div>
			<div class="col-md-3">
				<select bind:value={selectedBarangay}
					onchange={() => { loadPeople(1);} }
					class="form-select form-select-sm"
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
					<option value={null}>All Barangays</option>
					{#each towns as town}
						{@const townBarangays = barangays.filter(b => b.parentId === town.id)	}
						{@const disabled = selectedTown && selectedTown.id !== town.id}
						{#if townBarangays}
							<optgroup label={town.name}>
								{#each townBarangays as barangay}
									<option value={barangay} disabled={disabled}>
										{barangay.name}
									</option>
								{/each}
							</optgroup>
						{/if}
					{/each}
				</select>
			</div>
			<div class="col-md-3">
				<div class="form-check form-check-inline">
					<input
						class="form-check-input"
						type="checkbox"
						id="supporterFilter"
						checked={supporterFilter === true}
						onchange={toggleSupporterFilter}
						style="cursor: pointer;"
					/>
					<label class="form-check-label text-white" for="supporterFilter" style="cursor: pointer; font-size: 0.9rem;">
						Supporters
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
				{:else if people.length === 0}
					<tr>
						<td colspan="8" class="text-center py-5 text-muted">
							<p class="mb-0 fs-5">No people found</p>
							<small class="text-muted">Add your first person to get started</small>
						</td>
					</tr>
				{:else}
					{#each people as person (person.id)}
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
									<a href={`/dashboard/people/${person.id}`}
										class="btn btn-sm btn-warning"
										title="Edit person">
										✏️
									</a>
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
						{#if selectedPersonAids.length > 0}
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
										{#each selectedPersonAids as aid}
											<tr>
												<td><strong>{aid.type}</strong></td>
												<td class="text-end">{formatCurrency(parseFloat(aid.value || 0))}</td>
												<td>{new Date(aid.disbursed_date).toLocaleDateString('en-PH')}</td>
											</tr>
										{/each}
										<tr style="background-color: #f8f9fa; font-weight: bold;">
											<td colspan="1">Total:</td>
											<td class="text-end">
												{formatCurrency(selectedPersonAids.reduce((sum, aid) => sum + parseFloat(aid.value || 0), 0))}
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
						{#if selectedPersonAids.length > 0}
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
										{#each selectedPersonAids as aid}
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
												{selectedPersonAids.reduce((sum, aid) => sum + (aid.quantity || 0), 0)}
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
