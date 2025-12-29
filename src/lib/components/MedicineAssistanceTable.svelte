<script lang="ts">
	import Pagination from './Pagination.svelte';
	import { onMount } from 'svelte';

	interface Props {
		capabilities?: {
			canCreateAssistances: boolean;
			canDeleteAssistances: boolean;
		};
	}

	let {
		capabilities = {
			canCreateAssistances: true,
			canDeleteAssistances: true
		}
	}: Props = $props();

	let assistances: any[] = $state([]);
	let towns: any[] = $state([]);
	let loading = $state(false);
	let townLoading = $state(false);
	let error = $state('');
	let searchQuery = $state('');
	let currentPage = $state(1);
	let sortColumn = $state('disbursed_date');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let recordsTotal = $state(0);
	let recordsFiltered = $state(0);
	let townFilter = $state('');
	let barangayFilter = $state('');
	let supporterFilter = $state<boolean | null>(null);
	const pageSize = 10;
	const totalPages = $derived(Math.ceil((recordsFiltered || 1) / pageSize));

	// Modal state
	let showModal = $state(false);
	let formData = $state({
		personId: '',
		medicine_name: '',
		generic_name: '',
		dosage: '',
		quantity: '',
		unit: '',
		disbursed_date: ''
	});
	let formError = $state('');

	// Delete confirmation modal
	let showDeleteConfirm = $state(false);
	let deleteConfirmId: number | null = $state(null);

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

	async function loadAssistances(page?: number) {
		if (page !== undefined && page !== null) {
			currentPage = page;
		}

		loading = true;
		error = '';
		
		try {
			const queryParams = new URLSearchParams();
			const pageNum = currentPage;
			
			queryParams.append('start', ((pageNum - 1) * pageSize).toString());
			queryParams.append('length', pageSize.toString());
			queryParams.append('order[0][name]', sortColumn);
			queryParams.append('order[0][dir]', sortDir);
			queryParams.append('type', 'medicine');

			if (searchQuery.trim()) {
				queryParams.append('search[value]', searchQuery.trim());
			}

			if (townFilter) {
				// Convert town ID to town name for API (like PeopleTable does)
				const selectedTown = towns.find(t => String(t.id) === townFilter);
				if (selectedTown) {
					queryParams.append('filter[town]', selectedTown.name);
				}
			}

			if (barangayFilter) {
				queryParams.append('filter[barangay]', barangayFilter);
			}

			if (supporterFilter !== null) {
				queryParams.append('filter[isSupporter]', supporterFilter.toString());
			}

			const queryString = queryParams.toString();
			const res = await fetch(`/api/assistances?${queryString}`);
			
			if (!res.ok) throw new Error('Failed to load medicine assistances');
			
			const result = await res.json();
			assistances = result.data || [];
			recordsTotal = result.recordsTotal || 0;
			recordsFiltered = result.recordsFiltered || 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading medicine assistances';
			console.error('[DEBUG] Error loading medicine assistances:', e);
		} finally {
			loading = false;
		}
	}

	function confirmDelete(id: number) {
		deleteConfirmId = id;
		showDeleteConfirm = true;
	}

	async function deleteAssistance() {
		if (deleteConfirmId === null) return;

		try {
			const res = await fetch(`/api/assistances/${deleteConfirmId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete assistance');
			showDeleteConfirm = false;
			deleteConfirmId = null;
			await loadAssistances();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error deleting assistance';
			showDeleteConfirm = false;
			deleteConfirmId = null;
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		deleteConfirmId = null;
	}

	function handleSort(column: string, direction: 'asc' | 'desc') {
		sortColumn = column;
		sortDir = direction;
		currentPage = 1;
		loadAssistances(1);
	}

	function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
		loadAssistances(1);
	}

	function handleTownFilter(town: string) {
		townFilter = town;
		barangayFilter = '';
		currentPage = 1;
		loadAssistances(1);
	}

	function handleBarangayFilter(barangay: string) {
		barangayFilter = barangay;
		currentPage = 1;
		loadAssistances(1);
	}

	function toggleSupporterFilter() {
		if (supporterFilter === null) {
			supporterFilter = true;
		} else if (supporterFilter === true) {
			supporterFilter = false;
		} else {
			supporterFilter = null;
		}
		currentPage = 1;
		loadAssistances(1);
	}

	function handlePageChange(page: number) {
		loadAssistances(page);
	}

	function openModal() {
		showModal = true;
		formError = '';
		formData = {
			personId: '',
			medicine_name: '',
			generic_name: '',
			dosage: '',
			quantity: '',
			unit: '',
			disbursed_date: ''
		};
	}

	function closeModal() {
		showModal = false;
		formError = '';
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		formError = '';

		if (!formData.personId || !formData.medicine_name || !formData.disbursed_date || !formData.quantity) {
			formError = 'Please fill in all required fields';
			return;
		}

		try {
			const res = await fetch('/api/assistances', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					personId: parseInt(formData.personId),
					medicine_name: formData.medicine_name,
					generic_name: formData.generic_name,
					dosage: formData.dosage,
					quantity: parseInt(formData.quantity),
					unit: formData.unit,
					date_disbursed: formData.disbursed_date
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to create assistance');
			}

			closeModal();
			await loadAssistances();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error creating assistance';
		}
	}

	onMount(async () => {
		// Load towns once on mount, then load assistances
		await loadTowns();
		await loadAssistances();
	});

	$effect(() => {
		// Load assistances when filters/sort/page changes
		// Reference all reactive dependencies to track them
		searchQuery;
		townFilter;
		barangayFilter;
		supporterFilter;
		sortColumn;
		sortDir;
		currentPage;
		
		loadAssistances();
	});
</script>

<div class="card shadow-sm border-0" style="border-top: 4px solid #9b59b6; margin-top: 2rem;">
	<div class="card-header" style="background-color: #f8f9fa;">
			<div class="d-flex justify-content-between align-items-center">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Medicine Assistance</h5>
				{#if capabilities.canCreateAssistances}
					<button class="btn btn-primary btn-sm" onclick={openModal}>
						+ Add New Medicine Assistance
					</button>
				{/if}
			</div>
	</div>
	<div class="card-body">
		{#if error}
			<div class="alert alert-danger alert-dismissible fade show" role="alert">
				<strong>Error!</strong> {error}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			</div>
		{/if}

		<div class="mb-3">
			<div class="table-responsive">
				<table class="table table-hover table-striped">
					<thead class="table-light">
						<tr>
							<th style="width: 20%;">
								<div class="d-flex flex-column gap-2">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('personName', sortColumn === 'personName' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Person {sortColumn === 'personName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
									<input
										type="text"
										class="form-control form-control-sm"
										placeholder="Search name..."
										value={searchQuery}
										oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
										style="font-size: 0.85rem;"
									/>
								</div>
							</th>
							<th style="width: 15%;">
								<div class="d-flex flex-column gap-2">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('town', sortColumn === 'town' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Town {sortColumn === 'town' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
									<select
										class="form-select form-select-sm"
										value={townFilter}
										onchange={(e) => handleTownFilter((e.target as HTMLSelectElement).value)}
										style="font-size: 0.85rem;"
									>
										<option value="">All</option>
										{#each towns as town}
											<option value={String(town.id)}>{town.name}</option>
										{/each}
									</select>
								</div>
							</th>
							<th style="width: 15%;">
								<div class="d-flex flex-column gap-2">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('barangay', sortColumn === 'barangay' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Barangay {sortColumn === 'barangay' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
									<select
										class="form-select form-select-sm"
										value={barangayFilter}
										onchange={(e) => handleBarangayFilter((e.target as HTMLSelectElement).value)}
										style="font-size: 0.85rem;"
									>
										<option value="">All</option>
										{#if townFilter}
											{#each towns.find(t => String(t.id) === townFilter)?.children || [] as barangay}
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
							</th>
							<th style="width: 15%;">
								<div class="d-flex flex-column gap-2">
									<span class="btn btn-link btn-sm p-0 text-start text-decoration-none" style="color: inherit;">
										Is Supporter
									</span>
									<div class="form-check">
										<input 
											type="checkbox" 
											class="form-check-input" 
											id="supporter-filter"
											checked={supporterFilter === true}
											onchange={() => toggleSupporterFilter()}
										/>
										<label class="form-check-label" for="supporter-filter" style="font-size: 0.85rem;">
											Supporters Only
										</label>
									</div>
								</div>
							</th>
							<th class="cursor-pointer" onclick={() => handleSort('medicine_name', sortColumn === 'medicine_name' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}>
								Medicine {sortColumn === 'medicine_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th class="cursor-pointer" onclick={() => handleSort('quantity', sortColumn === 'quantity' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}>
								Quantity {sortColumn === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th class="cursor-pointer" onclick={() => handleSort('disbursed_date', sortColumn === 'disbursed_date' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}>
								Date Disbursed {sortColumn === 'disbursed_date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
							</th>
							{#if capabilities.canDeleteAssistances}
								<th style="width: 100px;">Actions</th>
							{/if}
						</tr>
					</thead>
				<tbody>
					{#if loading}
						<tr>
							<td colspan={capabilities.canDeleteAssistances ? 8 : 7} class="text-center py-4">
								<div class="spinner-border text-danger me-2" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
								Loading...
							</td>
						</tr>
					{:else if assistances.length === 0}
						<tr>
							<td colspan={capabilities.canDeleteAssistances ? 8 : 7} class="text-center py-4 text-muted">
								No medicine assistance records found
							</td>
						</tr>
					{:else}
						{#each assistances as assistance (assistance.id)}
							<tr>
								<td>
									{#if assistance.person}
										<strong>{assistance.person.lastName}, {assistance.person.firstName}</strong>
									{:else}
										—
									{/if}
								</td>
								<td>{assistance.person?.barangay?.parent?.name || '—'}</td>
								<td>{assistance.person?.barangay?.name || '—'}</td>
								<td>
									{#if assistance.person?.isSupporter}
										<span class="badge bg-success">Yes</span>
									{:else}
										<span class="badge bg-secondary">No</span>
									{/if}
								</td>
								<td>
                                    {assistance.medicine_name || '—'} 
                                    {#if assistance.generic_name}
                                        <br />
                                        <small class="text-muted">({assistance.generic_name})</small>
                                    {/if}
                                    {#if assistance.dosage}
                                        <br />
                                        <small class="text-muted">Dosage: {assistance.dosage}</small>
                                    {/if}
                                </td>
								<td>
                                    {assistance.quantity || '—'}
                                    {#if assistance.unit}
                                        &nbsp;{assistance.unit}
                                    {/if}
                                </td>
								<td>{assistance.disbursed_date ? new Date(assistance.disbursed_date).toLocaleDateString() : '—'}</td>
								{#if capabilities.canDeleteAssistances}
									<td>
										<button
											class="btn btn-sm btn-danger"
											title="Delete"
											onclick={() => confirmDelete(assistance.id)}
										>
											🗑️
										</button>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
			</div>
		</div>

		<div class="d-flex justify-content-between align-items-center mt-3">
			<small class="text-muted">
				Showing {assistances.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, recordsFiltered)} of {recordsFiltered} records
			</small>
			<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
		</div>
	</div>

	{#if showModal}
		<div class="modal fade show d-block" style="background-color: rgba(0, 0, 0, 0.5);">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Add Medicine Assistance</h5>
					<button type="button" class="btn-close" onclick={closeModal} aria-label="Close modal"></button>
					</div>
					<form onsubmit={submitForm}>
						<div class="modal-body">
							{#if formError}
								<div class="alert alert-danger alert-dismissible fade show" role="alert">
									{formError}
									<button type="button" class="btn-close" onclick={() => (formError = '')} aria-label="Close alert"></button>
								</div>
							{/if}

							<div class="mb-3">
								<label for="personId" class="form-label">Person <span class="text-danger">*</span></label>
								<input
									type="number"
									class="form-control"
									id="personId"
									bind:value={formData.personId}
									placeholder="Person ID"
									required
								/>
							</div>

							<div class="mb-3">
								<label for="medicine_name" class="form-label">Medicine Name <span class="text-danger">*</span></label>
								<input
									type="text"
									class="form-control"
									id="medicine_name"
									bind:value={formData.medicine_name}
									placeholder="Medicine name"
									required
								/>
							</div>

							<div class="mb-3">
								<label for="generic_name" class="form-label">Generic Name</label>
								<input
									type="text"
									class="form-control"
									id="generic_name"
									bind:value={formData.generic_name}
									placeholder="Generic name"
								/>
							</div>

							<div class="mb-3">
								<label for="dosage" class="form-label">Dosage</label>
								<input
									type="text"
									class="form-control"
									id="dosage"
									bind:value={formData.dosage}
									placeholder="e.g., 500mg, 1 tablet"
								/>
							</div>

							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="quantity" class="form-label">Quantity <span class="text-danger">*</span></label>
									<input
										type="number"
										class="form-control"
										id="quantity"
										bind:value={formData.quantity}
										placeholder="Quantity"
										required
									/>
								</div>
								<div class="col-md-6 mb-3">
									<label for="unit" class="form-label">Unit</label>
									<input
										type="text"
										class="form-control"
										id="unit"
										bind:value={formData.unit}
										placeholder="e.g., tablets, bottles"
									/>
								</div>
							</div>

							<div class="mb-3">
								<label for="disbursed_date" class="form-label">Date Disbursed <span class="text-danger">*</span></label>
								<input
									type="date"
									class="form-control"
									id="disbursed_date"
									bind:value={formData.disbursed_date}
									required
								/>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" onclick={closeModal}>Cancel</button>
							<button type="submit" class="btn btn-primary">Create Assistance</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header bg-danger text-white">
					<h5 class="modal-title">Confirm Delete</h5>
					<button type="button" class="btn-close btn-close-white" onclick={cancelDelete}></button>
				</div>
				<div class="modal-body">
					<p>Are you sure you want to delete this medicine assistance record? This action cannot be undone.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={cancelDelete}>Cancel</button>
					<button type="button" class="btn btn-danger" onclick={deleteAssistance}>Delete</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.cursor-pointer {
		cursor: pointer;
		user-select: none;
	}

	.cursor-pointer:hover {
		background-color: #f0f0f0;
	}
</style>
