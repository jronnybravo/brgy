<script lang="ts">
	import { FinancialAssistanceType } from '$lib/database/entities/Assistance';
	import { onMount } from 'svelte';

	let financialAssistances: any[] = [];
	let medicineAssistances: any[] = [];
	let people: any[] = [];
	let localities: any[] = [];
	let loading = true;
	let error = '';
	let toast: { message: string; type: 'success' | 'error' | 'info' } | null = null;
	let showFinancialModal = false;
	let showMedicineModal = false;
	let editingId: number | null = null;
	let editingType: 'financial' | 'medicine' | null = null;
	let activeTab: 'financial' | 'medicine' | 'map' = 'financial';

	// Modal state for location selection
	let selectedMunicipality = '';
	let selectedBarangay = '';
	let filteredPeopleByLocation: any[] = [];
	let barangaysForMunicipality: any[] = [];

	// Financial table state
	let financialTableData: any[] = [];
	let financialFilteredTableData: any[] = [];
	let financialSearchQuery = '';
	let financialTypeFilter = '';
	let financialSortColumn = 'date_disbursed';
	let financialSortDirection: 'asc' | 'desc' = 'desc';
	let financialCurrentPage = 1;

	// Medicine table state
	let medicineTableData: any[] = [];
	let medicineFilteredTableData: any[] = [];
	let medicineSearchQuery = '';
	let medicineSortColumn = 'date_disbursed';
	let medicineSortDirection: 'asc' | 'desc' = 'desc';
	let medicineCurrentPage = 1;

	const pageSize = 10;

	// Initialize and manage table data
	$: {
		financialTableData = financialAssistances;
		applyFinancialFiltersAndSort();
	}

	$: {
		medicineTableData = medicineAssistances;
		applyMedicineFiltersAndSort();
	}

	function applyFinancialFiltersAndSort() {
		let filtered = financialTableData;
		if (financialSearchQuery) {
			const query = financialSearchQuery.toLowerCase();
			filtered = filtered.filter(a =>
				`${a.person?.lastName} ${a.person?.firstName}`.toLowerCase().includes(query) ||
				a.type?.toLowerCase().includes(query)
			);
		}

		if (financialTypeFilter) {
			filtered = filtered.filter(a => a.type === financialTypeFilter);
		}

		filtered.sort((a, b) => {
			let aVal = a[financialSortColumn] ?? '';
			let bVal = b[financialSortColumn] ?? '';

			if (financialSortColumn === 'date_disbursed') {
				aVal = new Date(aVal).getTime();
				bVal = new Date(bVal).getTime();
			} else if (financialSortColumn === 'value') {
				aVal = parseFloat(aVal);
				bVal = parseFloat(bVal);
			} else if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = (bVal as string).toLowerCase();
			}

			if (aVal < bVal) return financialSortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return financialSortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		financialFilteredTableData = filtered;
		financialCurrentPage = 1;
	}

	function applyMedicineFiltersAndSort() {
		let filtered = medicineTableData;
		if (medicineSearchQuery) {
			const query = medicineSearchQuery.toLowerCase();
			filtered = filtered.filter(a =>
				`${a.person?.lastName} ${a.person?.firstName}`.toLowerCase().includes(query) ||
				a.medicine_name?.toLowerCase().includes(query)
			);
		}

		filtered.sort((a, b) => {
			let aVal = a[medicineSortColumn] ?? '';
			let bVal = b[medicineSortColumn] ?? '';

			if (medicineSortColumn === 'date_disbursed') {
				aVal = new Date(aVal).getTime();
				bVal = new Date(bVal).getTime();
			} else if (medicineSortColumn === 'quantity') {
				aVal = parseInt(aVal);
				bVal = parseInt(bVal);
			} else if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = (bVal as string).toLowerCase();
			}

			if (aVal < bVal) return medicineSortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return medicineSortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		medicineFilteredTableData = filtered;
		medicineCurrentPage = 1;
	}

	function handleFinancialSort(column: string) {
		if (financialSortColumn === column) {
			financialSortDirection = financialSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			financialSortColumn = column;
			financialSortDirection = 'asc';
		}
		applyFinancialFiltersAndSort();
	}

	function handleMedicineSort(column: string) {
		if (medicineSortColumn === column) {
			medicineSortDirection = medicineSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			medicineSortColumn = column;
			medicineSortDirection = 'asc';
		}
		applyMedicineFiltersAndSort();
	}

	function handleFinancialSearch(e: Event) {
		financialSearchQuery = (e.target as HTMLInputElement).value;
		applyFinancialFiltersAndSort();
	}

	function handleMedicineSearch(e: Event) {
		medicineSearchQuery = (e.target as HTMLInputElement).value;
		applyMedicineFiltersAndSort();
	}

	$: paginatedFinancialAssistances = financialFilteredTableData.slice(
		(financialCurrentPage - 1) * pageSize,
		financialCurrentPage * pageSize
	);
	$: financialTotalPages = Math.ceil(financialFilteredTableData.length / pageSize);

	$: paginatedMedicineAssistances = medicineFilteredTableData.slice(
		(medicineCurrentPage - 1) * pageSize,
		medicineCurrentPage * pageSize
	);
	$: medicineTotalPages = Math.ceil(medicineFilteredTableData.length / pageSize);

	let financialFormData = {
		personId: '',
		type: 'AICS',
		date_disbursed: '',
		amount: ''
	};

	let medicineFormData = {
		personId: '',
		medicine_name: '',
		generic_name: '',
		dosage: '',
		quantity: '',
		unit: '',
		date_disbursed: ''
	};

	async function loadAssistances() {
		try {
			const res = await fetch('/api/assistances');
			if (!res.ok) throw new Error('Failed to load assistances');
			const result = await res.json();
			
			// Handle nested data structure from API
			if (result.data) {
				// API returns { data: { financialAssistances, medicineAssistances } }
				financialAssistances = (result.data.financialAssistances || []).map((a: any) => ({
					...a,
					date_disbursed: a.disbursed_date,
					value: a.value
				}));
				medicineAssistances = (result.data.medicineAssistances || []).map((a: any) => ({
					...a,
					date_disbursed: a.disbursed_date
				}));
			}
			
			error = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading assistances';
		}
	}

	async function loadPeople() {
		try {
			const res = await fetch('/api/people');
			if (!res.ok) throw new Error('Failed to load people');
			const result = await res.json();
			people = result.data || [];
		} catch (e) {
			console.error('Error loading people:', e);
		}
	}

	async function loadLocalities() {
		try {
			const res = await fetch('/api/localities?withRelations=true');
			if (!res.ok) throw new Error('Failed to load localities');
			const result = await res.json();
			localities = result.data || result;
		} catch (e) {
			console.error('Error loading localities:', e);
		}
	}

	function handleMunicipalityChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedMunicipality = target.value;
		
		if (selectedMunicipality && localities.length > 0) {
			const municipalityId = parseInt(selectedMunicipality);
			const municipality = localities.find(l => l.id === municipalityId);
			barangaysForMunicipality = municipality?.children || [];
			selectedBarangay = ''; // Reset barangay when municipality changes
			filteredPeopleByLocation = []; // Clear people
		} else {
			barangaysForMunicipality = [];
			selectedBarangay = '';
			filteredPeopleByLocation = [];
		}
	}

	async function handleBarangayChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedBarangay = target.value;
		
		if (selectedBarangay) {
			try {
				const res = await fetch(`/api/people?barangayId=${selectedBarangay}`);
				if (!res.ok) throw new Error('Failed to load people');
				const result = await res.json();
				console.log('API Response:', result);
				console.log('Filtered People:', result.data);
				filteredPeopleByLocation = result.data || [];
			} catch (err) {
				console.error('Error loading people for barangay:', err);
				filteredPeopleByLocation = [];
			}
		} else {
			filteredPeopleByLocation = [];
		}
	}

	async function saveFinancialAssistance(e: SubmitEvent) {
		e.preventDefault();
		
		if (!financialFormData.personId || !financialFormData.type || !financialFormData.date_disbursed || !financialFormData.amount) {
			error = 'Please fill in all required fields';
			showToast('Please fill in all required fields', 'error');
			return;
		}

		try {
			const method = editingId && editingType === 'financial' ? 'PUT' : 'POST';
			const endpoint = editingId && editingType === 'financial' ? `/api/assistances/${editingId}` : '/api/assistances';

			const payload = {
				personId: parseInt(financialFormData.personId),
				type: financialFormData.type,
				date_disbursed: financialFormData.date_disbursed,
				amount: parseFloat(financialFormData.amount)
			};

			console.log('Saving financial assistance:', payload);

			const res = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.json();
				console.error('API Error:', errorData);
				throw new Error(errorData.error || errorData.details || 'Failed to save assistance');
			}

			const result = await res.json();
			console.log('Save successful:', result);
			const successMessage = editingId && editingType === 'financial' ? 'Financial Assistance updated successfully!' : 'Financial Assistance created successfully!';
			showToast(successMessage, 'success');
			resetFinancialForm();
			await loadAssistances();
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Error saving assistance';
			error = errorMessage;
			showToast(errorMessage, 'error');
			console.error('Full error:', e);
		}
	}

	async function saveMedicineAssistance(e: SubmitEvent) {
		e.preventDefault();
		
		if (!medicineFormData.personId || !medicineFormData.medicine_name || !medicineFormData.date_disbursed || !medicineFormData.quantity) {
			error = 'Please fill in all required fields';
			showToast('Please fill in all required fields', 'error');
			return;
		}

		try {
			const method = editingId && editingType === 'medicine' ? 'PUT' : 'POST';
			const endpoint = editingId && editingType === 'medicine' ? `/api/assistances/${editingId}` : '/api/assistances';

			const payload = {
				personId: parseInt(medicineFormData.personId),
				medicine_name: medicineFormData.medicine_name,
				generic_name: medicineFormData.generic_name,
				dosage: medicineFormData.dosage,
				quantity: parseInt(medicineFormData.quantity),
				unit: medicineFormData.unit,
				date_disbursed: medicineFormData.date_disbursed
			};

			console.log('Saving medicine assistance:', payload);

			const res = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.json();
				console.error('API Error:', errorData);
				throw new Error(errorData.error || errorData.details || 'Failed to save assistance');
			}

			const result = await res.json();
			console.log('Save successful:', result);
			const successMessage = editingId && editingType === 'medicine' ? 'Medicine Assistance updated successfully!' : 'Medicine Assistance created successfully!';
			showToast(successMessage, 'success');
			resetMedicineForm();
			await loadAssistances();
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Error saving assistance';
			error = errorMessage;
			showToast(errorMessage, 'error');
			console.error('Full error:', e);
		}
	}

	async function deleteAssistance(id: number) {
		if (!confirm('Are you sure you want to delete this assistance?')) return;

		try {
			const res = await fetch(`/api/assistances/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete assistance');
			showToast('Assistance deleted successfully!', 'success');
			await loadAssistances();
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Error deleting assistance';
			error = errorMessage;
			showToast(errorMessage, 'error');
		}
	}

	function editFinancialAssistance(assistance: any) {
		financialFormData = { ...assistance };
		financialFormData.date_disbursed = assistance.date_disbursed.split('T')[0];
		selectedMunicipality = assistance.person?.municipality || '';
		selectedBarangay = assistance.person?.barangay || '';
		editingId = assistance.id;
		editingType = 'financial';
		showFinancialModal = true;
		error = '';
	}

	function editMedicineAssistance(assistance: any) {
		medicineFormData = { ...assistance };
		medicineFormData.date_disbursed = assistance.date_disbursed.split('T')[0];
		selectedMunicipality = assistance.person?.municipality || '';
		selectedBarangay = assistance.person?.barangay || '';
		editingId = assistance.id;
		editingType = 'medicine';
		showMedicineModal = true;
		error = '';
	}

	function resetFinancialForm() {
		financialFormData = {
			personId: '',
			type: 'AICS',
			date_disbursed: '',
			amount: ''
		};
		selectedMunicipality = '';
		selectedBarangay = '';
		barangaysForMunicipality = [];
		filteredPeopleByLocation = [];
		editingId = null;
		editingType = null;
		showFinancialModal = false;
		error = '';
	}

	function resetMedicineForm() {
		medicineFormData = {
			personId: '',
			medicine_name: '',
			generic_name: '',
			dosage: '',
			quantity: '',
			unit: '',
			date_disbursed: ''
		};
		selectedMunicipality = '';
		selectedBarangay = '';
		barangaysForMunicipality = [];
		filteredPeopleByLocation = [];
		editingId = null;
		editingType = null;
		showMedicineModal = false;
		error = '';
	}

	function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
		toast = { message, type };
		setTimeout(() => {
			toast = null;
		}, 3000);
	}

	onMount(async () => {
		await Promise.all([loadAssistances(), loadPeople(), loadLocalities()]);
		loading = false;
	});
</script>

<div class="container-fluid p-4">
	<div class="mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">Assistances Management</h1>
	</div>

	{#if toast}
		<div class="alert alert-{toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'info'} alert-dismissible fade show" role="alert" style="position: sticky; top: 1rem; z-index: 1050;">
			<strong>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</strong> {toast.message}
			<button type="button" class="btn-close" on:click={() => toast = null}></button>
		</div>
	{/if}

	{#if error}
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			<strong>Error!</strong> {error}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	{/if}

	<div class="card shadow-sm border-0" style="border-top: 4px solid #e74c3c;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<ul class="nav nav-tabs card-header-tabs" role="tablist">
				<li class="nav-item" role="presentation">
					<button
						class="nav-link"
						class:active={activeTab === 'financial'}
						id="financial-tab"
						on:click={() => activeTab = 'financial'}
						type="button"
						role="tab"
						aria-controls="financial-content"
						aria-selected={activeTab === 'financial'}
					>
						💰 Financial Assistances
					</button>
				</li>
				<li class="nav-item" role="presentation">
					<button
						class="nav-link"
						class:active={activeTab === 'medicine'}
						id="medicine-tab"
						on:click={() => activeTab = 'medicine'}
						type="button"
						role="tab"
						aria-controls="medicine-content"
						aria-selected={activeTab === 'medicine'}
					>
						💊 Medicine Assistances
					</button>
				</li>
			</ul>
		</div>
		<div class="card-body">
			<!-- Financial Assistances Tab -->
			{#if activeTab === 'financial'}
				<div role="tabpanel" id="financial-content">
					<div class="mb-3">
						<button on:click={() => (showFinancialModal = true)} class="btn btn-primary">
							+ Add Financial Assistance
						</button>
					</div>

					<div class="row align-items-center mb-3">
						<div class="col-md-8">
							<input
								type="text"
								placeholder="Search financial assistances..."
								value={financialSearchQuery}
								on:input={handleFinancialSearch}
								class="form-control form-control-sm"
								style="background-color: #f0f0f0;"
							/>
						</div>
						<div class="col-md-4">
							<select 
								class="form-select form-select-sm" 
								bind:value={financialTypeFilter}
								on:change={() => applyFinancialFiltersAndSort()}
								style="background-color: #f0f0f0;"
							>
								<option value="">-- All Types --</option>
								{#each Object.values(FinancialAssistanceType) as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>

					{#if loading}
						<div class="text-center py-5 text-muted">
							<div class="spinner-border me-2" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
							Loading financial assistances...
						</div>
					{:else if paginatedFinancialAssistances.length === 0}
						<div class="text-center py-5 text-muted">
							<p class="mb-0 fs-5">No financial assistances found</p>
							<small class="text-muted">
								{financialSearchQuery ? 'Try adjusting your search' : 'Add your first assistance to get started'}
							</small>
						</div>
					{:else}
						<div class="table-responsive">
							<table class="table table-hover table-striped">
								<thead class="table-light">
									<tr>
										<th 
											style="cursor: pointer;"
											class:fw-bold={financialSortColumn === 'person'}
											on:click={() => handleFinancialSort('person')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleFinancialSort('person')}
										>
											Person
											{#if financialSortColumn === 'person'}
												<span class="float-end">{financialSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={financialSortColumn === 'type'}
											on:click={() => handleFinancialSort('type')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleFinancialSort('type')}
										>
											Type
											{#if financialSortColumn === 'type'}
												<span>{financialSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={financialSortColumn === 'date_disbursed'}
											on:click={() => handleFinancialSort('date_disbursed')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleFinancialSort('date_disbursed')}
										>
											Date Disbursed
											{#if financialSortColumn === 'date_disbursed'}
												<span>{financialSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={financialSortColumn === 'value'}
											on:click={() => handleFinancialSort('value')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleFinancialSort('value')}
										>
											Amount
											{#if financialSortColumn === 'value'}
												<span>{financialSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th scope="col" class="text-center">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each paginatedFinancialAssistances as assistance}
										<tr>
											<td>{assistance.person?.lastName}, {assistance.person?.firstName}</td>
											<td>
												<span class="badge bg-secondary">
													{assistance.type}
												</span>
											</td>
											<td>{new Date(assistance.date_disbursed).toLocaleDateString('en-US')}</td>
											<td class="fw-bold">₱{parseFloat(assistance.value).toFixed(2)}</td>
											<td class="text-center">
												<button on:click={() => editFinancialAssistance(assistance)} class="btn btn-sm btn-outline-primary me-1">
													✎ Edit
												</button>
												<button on:click={() => deleteAssistance(assistance.id)} class="btn btn-sm btn-outline-danger">
													🗑 Delete
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="card-footer bg-light d-flex justify-content-between align-items-center">
							<div class="text-muted small">
								Showing {Math.min((financialCurrentPage - 1) * pageSize + 1, financialFilteredTableData.length)} to {Math.min(financialCurrentPage * pageSize, financialFilteredTableData.length)} of {financialFilteredTableData.length}
							</div>
							<nav aria-label="Table pagination">
								<ul class="pagination mb-0">
									<li class="page-item" class:disabled={financialCurrentPage === 1}>
										<button
											class="page-link"
											on:click={() => financialCurrentPage = 1}
											disabled={financialCurrentPage === 1}
										>
											First
										</button>
									</li>
									<li class="page-item" class:disabled={financialCurrentPage === 1}>
										<button
											class="page-link"
											on:click={() => financialCurrentPage = Math.max(1, financialCurrentPage - 1)}
											disabled={financialCurrentPage === 1}
										>
											Prev
										</button>
									</li>
									<li class="page-item active">
										<span class="page-link">
											Page {financialCurrentPage} of {financialTotalPages || 1}
										</span>
									</li>
									<li class="page-item" class:disabled={financialCurrentPage === financialTotalPages || financialTotalPages === 0}>
										<button
											class="page-link"
											on:click={() => financialCurrentPage = Math.min(financialTotalPages, financialCurrentPage + 1)}
											disabled={financialCurrentPage === financialTotalPages || financialTotalPages === 0}
										>
											Next
										</button>
									</li>
									<li class="page-item" class:disabled={financialCurrentPage === financialTotalPages || financialTotalPages === 0}>
										<button
											class="page-link"
											on:click={() => financialCurrentPage = financialTotalPages}
											disabled={financialCurrentPage === financialTotalPages || financialTotalPages === 0}
										>
											Last
										</button>
									</li>
								</ul>
							</nav>
						</div>
					{/if}
				</div>

			<!-- Medicine Assistances Tab -->
			{:else if activeTab === 'medicine'}
				<div role="tabpanel" id="medicine-content">
					<div class="mb-3">
						<button on:click={() => (showMedicineModal = true)} class="btn btn-primary">
							+ Add Medicine Assistance
						</button>
					</div>

					<div class="row align-items-center mb-3">
						<div class="col-md-12">
							<input
								type="text"
								placeholder="Search medicine assistances..."
								value={medicineSearchQuery}
								on:input={handleMedicineSearch}
								class="form-control form-control-sm"
								style="background-color: #f0f0f0;"
							/>
						</div>
					</div>

					{#if loading}
						<div class="text-center py-5 text-muted">
							<div class="spinner-border me-2" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
							Loading medicine assistances...
						</div>
					{:else if paginatedMedicineAssistances.length === 0}
						<div class="text-center py-5 text-muted">
							<p class="mb-0 fs-5">No medicine assistances found</p>
							<small class="text-muted">
								{medicineSearchQuery ? 'Try adjusting your search' : 'Add your first assistance to get started'}
							</small>
						</div>
					{:else}
						<div class="table-responsive">
							<table class="table table-hover table-striped">
								<thead class="table-light">
									<tr>
										<th 
											style="cursor: pointer;"
											class:fw-bold={medicineSortColumn === 'person'}
											on:click={() => handleMedicineSort('person')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleMedicineSort('person')}
										>
											Person
											{#if medicineSortColumn === 'person'}
												<span class="float-end">{medicineSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={medicineSortColumn === 'medicine_name'}
											on:click={() => handleMedicineSort('medicine_name')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleMedicineSort('medicine_name')}
										>
											Medicine
											{#if medicineSortColumn === 'medicine_name'}
												<span>{medicineSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={medicineSortColumn === 'date_disbursed'}
											on:click={() => handleMedicineSort('date_disbursed')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleMedicineSort('date_disbursed')}
										>
											Date Disbursed
											{#if medicineSortColumn === 'date_disbursed'}
												<span>{medicineSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th 
											style="cursor: pointer;"
											class:fw-bold={medicineSortColumn === 'quantity'}
											on:click={() => handleMedicineSort('quantity')}
											role="button"
											tabindex="0"
											on:keydown={(e) => e.key === 'Enter' && handleMedicineSort('quantity')}
										>
											Quantity
											{#if medicineSortColumn === 'quantity'}
												<span>{medicineSortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</th>
										<th scope="col">Unit</th>
										<th scope="col" class="text-center">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each paginatedMedicineAssistances as assistance}
										<tr>
											<td>{assistance.person?.lastName}, {assistance.person?.firstName}</td>
											<td>{assistance.medicine_name}</td>
											<td>{new Date(assistance.date_disbursed).toLocaleDateString('en-US')}</td>
											<td class="fw-bold">{assistance.quantity}</td>
											<td>{assistance.unit}</td>
											<td class="text-center">
												<button on:click={() => editMedicineAssistance(assistance)} class="btn btn-sm btn-outline-primary me-1">
													✎ Edit
												</button>
												<button on:click={() => deleteAssistance(assistance.id)} class="btn btn-sm btn-outline-danger">
													🗑 Delete
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="card-footer bg-light d-flex justify-content-between align-items-center">
							<div class="text-muted small">
								Showing {Math.min((medicineCurrentPage - 1) * pageSize + 1, medicineFilteredTableData.length)} to {Math.min(medicineCurrentPage * pageSize, medicineFilteredTableData.length)} of {medicineFilteredTableData.length}
							</div>
							<nav aria-label="Table pagination">
								<ul class="pagination mb-0">
									<li class="page-item" class:disabled={medicineCurrentPage === 1}>
										<button
											class="page-link"
											on:click={() => medicineCurrentPage = 1}
											disabled={medicineCurrentPage === 1}
										>
											First
										</button>
									</li>
									<li class="page-item" class:disabled={medicineCurrentPage === 1}>
										<button
											class="page-link"
											on:click={() => medicineCurrentPage = Math.max(1, medicineCurrentPage - 1)}
											disabled={medicineCurrentPage === 1}
										>
											Prev
										</button>
									</li>
									<li class="page-item active">
										<span class="page-link">
											Page {medicineCurrentPage} of {medicineTotalPages || 1}
										</span>
									</li>
									<li class="page-item" class:disabled={medicineCurrentPage === medicineTotalPages || medicineTotalPages === 0}>
										<button
											class="page-link"
											on:click={() => medicineCurrentPage = Math.min(medicineTotalPages, medicineCurrentPage + 1)}
											disabled={medicineCurrentPage === medicineTotalPages || medicineTotalPages === 0}
										>
											Next
										</button>
									</li>
									<li class="page-item" class:disabled={medicineCurrentPage === medicineTotalPages || medicineTotalPages === 0}>
										<button
											class="page-link"
											on:click={() => medicineCurrentPage = medicineTotalPages}
											disabled={medicineCurrentPage === medicineTotalPages || medicineTotalPages === 0}
										>
											Last
										</button>
									</li>
								</ul>
							</nav>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Financial Assistance Modal -->
{#if showFinancialModal}
	<div class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog modal-lg">
			<div class="modal-content">
				<div class="modal-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
					<h5 class="modal-title fw-bold" style="color: #2c3e50;">
						{editingType === 'financial' && editingId ? 'Edit Financial Assistance' : 'Add New Financial Assistance'}
					</h5>
					<button type="button" class="btn-close" on:click={resetFinancialForm}></button>
				</div>
				<div class="modal-body">
					<form on:submit={saveFinancialAssistance}>
					<div class="row mb-3">
						<div class="col-md-6">
							<label for="fin-municipality" class="form-label fw-500">Municipality *</label>
							<select id="fin-municipality" class="form-select form-select-lg" value={selectedMunicipality} on:change={handleMunicipalityChange} required>
								<option value="">-- Select Municipality --</option>
								{#each localities.filter(l => l.type === 'municipality') as municipality}
									<option value={String(municipality.id)}>{municipality.name}</option>
								{/each}
							</select>
						</div>
						<div class="col-md-6">
							<label for="fin-barangay" class="form-label fw-500">Barangay *</label>
							<select id="fin-barangay" class="form-select form-select-lg" value={selectedBarangay} on:change={handleBarangayChange} required disabled={!selectedMunicipality}>
								<option value="">-- Select Barangay --</option>
								{#each barangaysForMunicipality as barangay}
									<option value={String(barangay.id)}>{barangay.name}</option>
								{/each}
							</select>
						</div>
					</div>						<div class="mb-3">
						<label for="fin-personId" class="form-label fw-500">Person *</label>
						<select id="fin-personId" class="form-select form-select-lg" bind:value={financialFormData.personId} required disabled={!selectedBarangay}>
							<option value="">-- Select Person --</option>
							{#each filteredPeopleByLocation as person}
								<option value={String(person.id)}>{person.lastName}, {person.firstName}</option>
							{/each}
						</select>
					</div>						<div class="row mb-4">
							<div class="col-md-4">
								<label for="fin-type" class="form-label fw-500">Assistance Type *</label>
								<select id="fin-type" class="form-select form-select-lg" bind:value={financialFormData.type} required>
									{#each Object.values(FinancialAssistanceType) as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>
							<div class="col-md-4">
								<label for="fin-date" class="form-label fw-500">Date Disbursed *</label>
								<input 
									type="date" 
									id="fin-date" 
									class="form-control form-control-lg"
									bind:value={financialFormData.date_disbursed}
									required
								/>
							</div>
							<div class="col-md-4">
								<label for="fin-amount" class="form-label fw-500">Amount *</label>
								<input
									type="number"
									id="fin-amount"
									class="form-control form-control-lg"
									bind:value={financialFormData.amount}
									step="0.01"
									min="0"
									placeholder="0.00"
									required
								/>
							</div>
						</div>

						<div class="d-flex gap-2">
							<button type="submit" class="btn btn-success">
								{editingType === 'financial' && editingId ? '💾 Update' : '💾 Create'}
							</button>
							<button type="button" on:click={resetFinancialForm} class="btn btn-outline-secondary">Cancel</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Medicine Assistance Modal -->
{#if showMedicineModal}
	<div class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog modal-lg">
			<div class="modal-content">
				<div class="modal-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
					<h5 class="modal-title fw-bold" style="color: #2c3e50;">
						{editingType === 'medicine' && editingId ? 'Edit Medicine Assistance' : 'Add New Medicine Assistance'}
					</h5>
					<button type="button" class="btn-close" on:click={resetMedicineForm}></button>
				</div>
				<div class="modal-body">
					<form on:submit={saveMedicineAssistance}>
					<div class="row mb-3">
						<div class="col-md-6">
							<label for="med-municipality" class="form-label fw-500">Municipality *</label>
							<select id="med-municipality" class="form-select form-select-lg" value={selectedMunicipality} on:change={handleMunicipalityChange} required>
								<option value="">-- Select Municipality --</option>
								{#each localities.filter(l => l.type === 'municipality') as municipality}
									<option value={String(municipality.id)}>{municipality.name}</option>
								{/each}
							</select>
						</div>
						<div class="col-md-6">
							<label for="med-barangay" class="form-label fw-500">Barangay *</label>
							<select id="med-barangay" class="form-select form-select-lg" value={selectedBarangay} on:change={handleBarangayChange} required disabled={!selectedMunicipality}>
								<option value="">-- Select Barangay --</option>
								{#each barangaysForMunicipality as barangay}
									<option value={String(barangay.id)}>{barangay.name}</option>
								{/each}
							</select>
						</div>
					</div>						<div class="mb-3">
							<label for="med-personId" class="form-label fw-500">Person *</label>
							<select id="med-personId" class="form-select form-select-lg" bind:value={medicineFormData.personId} required disabled={!selectedBarangay}>
								<option value="">-- Select Person --</option>
								{#each filteredPeopleByLocation as person}
									<option value={String(person.id)}>{person.lastName}, {person.firstName}</option>
								{/each}
							</select>
						</div>

						<div class="mb-3">
							<label for="med-medicineName" class="form-label fw-500">Medicine Name *</label>
							<input 
								type="text" 
								id="med-medicineName" 
								class="form-control form-control-lg"
								bind:value={medicineFormData.medicine_name}
								required
							/>
						</div>

						<div class="row mb-3">
							<div class="col-md-6">
								<label for="med-genericName" class="form-label fw-500">Generic Name</label>
								<input 
									type="text" 
									id="med-genericName" 
									class="form-control form-control-lg"
									bind:value={medicineFormData.generic_name}
								/>
							</div>
							<div class="col-md-6">
								<label for="med-dosage" class="form-label fw-500">Dosage</label>
								<input 
									type="text" 
									id="med-dosage" 
									class="form-control form-control-lg"
									bind:value={medicineFormData.dosage}
								/>
							</div>
						</div>

						<div class="row mb-4">
							<div class="col-md-4">
								<label for="med-quantity" class="form-label fw-500">Quantity *</label>
								<input
									type="number"
									id="med-quantity"
									class="form-control form-control-lg"
									bind:value={medicineFormData.quantity}
									min="1"
									required
								/>
							</div>
							<div class="col-md-4">
								<label for="med-unit" class="form-label fw-500">Unit</label>
								<input 
									type="text" 
									id="med-unit" 
									class="form-control form-control-lg"
									bind:value={medicineFormData.unit}
								/>
							</div>
							<div class="col-md-4">
								<label for="med-date" class="form-label fw-500">Date Disbursed *</label>
								<input 
									type="date" 
									id="med-date" 
									class="form-control form-control-lg"
									bind:value={medicineFormData.date_disbursed}
									required
								/>
							</div>
						</div>

						<div class="d-flex gap-2">
							<button type="submit" class="btn btn-success">
								{editingType === 'medicine' && editingId ? '💾 Update' : '💾 Create'}
							</button>
							<button type="button" on:click={resetMedicineForm} class="btn btn-outline-secondary">Cancel</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>

