<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import PeopleTable from '$lib/components/PeopleTable.svelte';
	import FinancialAssistanceTable from '$lib/components/FinancialAssistanceTable.svelte';
	import MedicineAssistanceTable from '$lib/components/MedicineAssistanceTable.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const capabilities = $derived(data.capabilities as {
		canCreatePersons: boolean;
		canUpdatePersons: boolean;
		canDeletePersons: boolean;
	});
	const towns = $derived(data.towns || []);
	const assistanceCapabilities = $derived({
		canCreateAssistances: capabilities.canCreatePersons,
		canDeleteAssistances: capabilities.canDeletePersons
	});

	let people: any[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let showUpload = $state(false);
	let uploadLoading = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');
	let uploadResults: any = $state(null);
	let recordsTotal = $state(0);
	let recordsFiltered = $state(0);
	let currentPage = $state(1);
	let sortColumn = $state('lastName');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let townFilter = $state('');
	let barangayFilter = $state('');
	let supporterFilter = $state<boolean | null>(null);
	let searchQuery = $state('');
	const totalPages = $derived(Math.ceil((recordsFiltered || 1) / 10));

	async function loadPeople(page?: number) {
		console.log('[DEBUG] loadPeople called with page:', page);
		if (page !== undefined && page !== null) {
			currentPage = page;
		}
		
		loading = true;
		console.log('[DEBUG] loading set to true, about to fetch');
		try {
			const queryParams = new URLSearchParams();
			const pageNum = currentPage;
			const pageSize = 10;
			
			queryParams.append('start', ((pageNum - 1) * pageSize).toString());
			queryParams.append('length', pageSize.toString());
			queryParams.append('order[0][name]', sortColumn);
			queryParams.append('order[0][dir]', sortDir);
			
			// Add search parameter
			if (searchQuery.trim()) {
				queryParams.append('search[value]', searchQuery.trim());
			}
			
			// Add filter parameters
			if (townFilter) {
				// Convert town ID to town name for API
				const selectedTown = towns.find(t => t.id == parseInt(townFilter));
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
			console.log('[DEBUG] fetching from /api/people with params:', queryString);
			const res = await fetch(`/api/people?${queryString}`);
			console.log('[DEBUG] fetch response received:', res.status);
			if (!res.ok) throw new Error('Failed to load people');
			const result = await res.json();
			console.log('[DEBUG] json parsed, setting state');
			people = result.data || [];
			recordsTotal = result.recordsTotal || 0;
			recordsFiltered = result.recordsFiltered || 0;
			console.log('Loaded people with pagination:', { total: result.recordsTotal, filtered: result.recordsFiltered, dataLength: people.length });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading people';
			console.error('[DEBUG] Error in loadPeople:', e);
		} finally {
			loading = false;
			console.log('[DEBUG] loading set to false');
		}
	}

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

	function editPerson(person: any) {
		goto(`/dashboard/people/${person.id}`);
	}



	function handleSort(column: string, direction: 'asc' | 'desc') {
		sortColumn = column;
		sortDir = direction;
		currentPage = 1;
		loadPeople(1);
	}

	function handleTownFilter(townId: string) {
		townFilter = townId; // Keep as ID for dropdown display
		barangayFilter = ''; // Reset barangay filter when town changes
		currentPage = 1;
		loadPeople(1);
	}

	function handleBarangayFilter(barangay: string) {
		barangayFilter = barangay;
		currentPage = 1;
		loadPeople(1);
	}

	function handleSupporterFilter(isSupporter: boolean | null) {
		supporterFilter = isSupporter;
		currentPage = 1;
		loadPeople(1);
	}

	function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
		loadPeople(1);
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		if (!file.name.endsWith('.csv')) {
			uploadError = 'Please select a CSV file';
			return;
		}

		uploadLoading = true;
		uploadError = '';
		uploadSuccess = '';
		uploadResults = null;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch('/api/people/upload', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();

			if (!res.ok) {
				uploadError = result.error || 'Failed to upload CSV';
				return;
			}

			uploadResults = result.results;
			uploadSuccess = result.message;
			
			// Reset file input
			target.value = '';
			
			// Reload people list
			await loadPeople();

			// Close upload after 2 seconds
			setTimeout(() => {
				showUpload = false;
			}, 2000);
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Error uploading file';
		} finally {
			uploadLoading = false;
		}
	}

	onMount(async () => {
		console.log('[DEBUG] onMount started');
		await loadPeople();
		console.log('[DEBUG] onMount completed');
	});
</script>

<div class="container-fluid p-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">People Management</h1>

		{#if capabilities.canCreatePersons}
			<div class="d-flex gap-2">
				<button onclick={() => (showUpload = !showUpload)} class="btn btn-info btn-lg">
					{showUpload ? '✕ Cancel' : '📤 Upload CSV'}
				</button>
				<button onclick={() => goto('/dashboard/people/new')} class="btn btn-primary btn-lg">
					+ Add Person
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			<strong>Error!</strong> {error}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	{/if}

	{#if showUpload}
		<div class="card mb-4 shadow-sm border-0" style="border-top: 4px solid #17a2b8;">
			<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Upload People from CSV</h5>
			</div>
			<div class="card-body">
				{#if uploadError}
					<div class="alert alert-danger alert-dismissible fade show" role="alert">
						<strong>Upload Error!</strong> {uploadError}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				{#if uploadSuccess}
					<div class="alert alert-success alert-dismissible fade show" role="alert">
						<strong>Success!</strong> {uploadSuccess}
						{#if uploadResults}
							<ul class="mb-0 mt-2">
								<li>Successful: {uploadResults.successful}/{uploadResults.total}</li>
								{#if uploadResults.failed > 0}
									<li class="text-danger">Failed: {uploadResults.failed}/{uploadResults.total}</li>
									{#if uploadResults.errors.length > 0}
										<li>
											<details class="mt-2">
												<summary class="cursor-pointer">View Errors ({uploadResults.errors.length})</summary>
												<div class="mt-2" style="max-height: 300px; overflow-y: auto; background-color: #f8f9fa; padding: 1rem; border-radius: 4px;">
													{#each uploadResults.errors as errorItem}
														<div class="mb-2 p-2 border-bottom">
															<strong>Row {errorItem.rowNumber}:</strong> {errorItem.error}
														</div>
													{/each}
												</div>
											</details>
										</li>
									{/if}
								{/if}
							</ul>
						{/if}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				<div class="mb-4 p-4" style="background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; text-align: center;">
					<div class="mb-3">
						<p class="text-muted mb-2">
							<strong>CSV Format Required:</strong>
						</p>
						<p class="text-muted small mb-3">
							First Name, Middle Name, Last Name, Extension Name, Town, Barangay, Purok, Precinct, Is Supporter, Is Leader, Comments
						</p>
					</div>
					
					<label for="csvFile" class="btn btn-info btn-lg">
						📁 Select CSV File
					</label>
					<input id="csvFile"
						type="file"
						accept=".csv"
						onchange={handleFileUpload}
						disabled={uploadLoading}
						style="display: none;" />
				</div>

				{#if uploadLoading}
					<div class="text-center py-3">
						<div class="spinner-border text-info me-2" role="status">
							<span class="visually-hidden">Uploading...</span>
						</div>
						Processing CSV file...
					</div>
				{:else}
					<div class="alert alert-info mb-0">
						<strong>Note:</strong> The CSV file must contain the following columns: First Name, Last Name, Town, and Barangay. 
						Other fields (Middle Name, Extension Name, Purok, Precinct, Is Supporter, Is Leader, Comments) are optional.
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="card shadow-sm border-0" style="border-top: 4px solid #27ae60; margin-top: 2rem;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People List</h5>
		</div>
		<div class="card-body">
			<PeopleTable {capabilities}
				{people}
				{recordsTotal}
				{recordsFiltered}
				{currentPage}
				{totalPages}
				{loading}
				{sortColumn}
				{sortDir}
				{townFilter}
				{barangayFilter}
				onEdit={editPerson}
				onDelete={deletePerson}
				onPageChange={loadPeople}
				onSort={handleSort}
				onSearch={handleSearch}
				onTownFilter={handleTownFilter}
				onBarangayFilter={handleBarangayFilter}
				onSupporterFilter={handleSupporterFilter}
			/>
		</div>
	</div>

	<FinancialAssistanceTable capabilities={assistanceCapabilities} />
	<MedicineAssistanceTable capabilities={assistanceCapabilities} />
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>
