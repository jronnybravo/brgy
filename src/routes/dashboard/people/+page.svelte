<script lang="ts">
	import { onMount } from 'svelte';
	import PeopleTable from '$lib/components/PeopleTable.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const capabilities = $derived(data.capabilities as {
		canCreatePersons: boolean;
		canUpdatePersons: boolean;
		canDeletePersons: boolean;
	});

	let people: any[] = $state([]);
	let financialAssistances: any[] = $state([]);
	let medicineAssistances: any[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let showForm = $state(false);
	let showUpload = $state(false);
	let editingId: number | null = $state(null);
	let municipalities: any[] = $state([]);
	let barangays: any[] = $state([]);
	let selectedMunicipality = $state('');
	let uploadLoading = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');
	let uploadResults: any = $state(null);

	let formData = $state({
		firstName: '',
		lastName: '',
		middleName: '',
		extensionName: '',
		birthdate: '',
		sex: 'Male',
		barangayId: '',
		purok: '',
		isSupporter: null as boolean | null,
		isLeader: false
	});

	async function loadPeople() {
		loading = true;
		try {
			const res = await fetch('/api/people');
			if (!res.ok) throw new Error('Failed to load people');
			const result = await res.json();
			people = result.data || result;
			console.log('Loaded people:', people);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading people';
		} finally {
			loading = false;
		}
	}

	async function loadAssistances() {
		try {
			const [financialRes, medicineRes] = await Promise.all([
				fetch('/api/assistances?type=financial'),
				fetch('/api/assistances?type=medicine')
			]);

			if (financialRes.ok) {
				const financialResult = await financialRes.json();
				financialAssistances = financialResult.data || financialResult || [];
			}

			if (medicineRes.ok) {
				const medicineResult = await medicineRes.json();
				medicineAssistances = medicineResult.data || medicineResult || [];
			}
		} catch (e) {
			console.error('Error loading assistances:', e);
		}
	}

	async function loadMunicipalitiesAndBarangays() {
		try {
			// Get Siquijor Province
			const locRes = await fetch('/api/localities');
			if (!locRes.ok) throw new Error('Failed to load localities');
			const allLocalities = await locRes.json();

			// Find Siquijor Province
			const siquijor = allLocalities.find((l: any) => l.name.includes('SIQUIJOR') && l.type === 'province');
			if (!siquijor) throw new Error('Siquijor Province not found');

			// Get municipalities in Siquijor
			const muns = allLocalities.filter((l: any) => l.parentId === siquijor.id && (l.type === 'municipality' || l.type === 'city'));
			municipalities = muns.sort((a: any, b: any) => a.name.localeCompare(b.name));

			// Get all barangays in Siquijor
			const barIds = muns.map((m: any) => m.id);
			const allBarangays = allLocalities.filter((l: any) => barIds.includes(l.parentId) && l.type === 'barangay');
			barangays = allBarangays.sort((a: any, b: any) => a.name.localeCompare(b.name));
		} catch (e) {
			console.error('Error loading municipalities and barangays:', e);
		}
	}

	let filteredBarangays = $derived.by(() => {
		if (!selectedMunicipality) {
			return barangays;
		}
		const municipalityId = parseInt(selectedMunicipality);
		return barangays.filter((b: any) => b.parentId === municipalityId);
	});

	async function savePerson(e?: Event) {
		e?.preventDefault();
		
		if (!formData.firstName || !formData.lastName || !formData.birthdate || !formData.barangayId) {
			error = 'Please fill in all required fields';
			return;
		}

		try {
			const method = editingId ? 'PUT' : 'POST';
			const endpoint = editingId ? `/api/people/${editingId}` : '/api/people';

			// Convert barangayId back to number for API
			const dataToSend = {
				...formData,
				barangayId: parseInt(formData.barangayId as any)
			};

			const res = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(dataToSend)
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to save person');
			}

			resetForm();
			await loadPeople();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error saving person';
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
		formData = { ...person };
		editingId = person.id;
		
		// Convert barangayId to string for select binding
		formData.barangayId = person.barangayId?.toString() || '';
		
		// Find and set the municipality for the barangay
		const barangay = barangays.find(b => b.id === person.barangayId);
		if (barangay) {
			selectedMunicipality = barangay.parentId.toString();
		}
		
		showForm = true;
		error = '';
	}

	function resetForm() {
		formData = {
			firstName: '',
			lastName: '',
			middleName: '',
			extensionName: '',
			birthdate: '',
			sex: 'Male',
			barangayId: '',
			purok: '',
			isSupporter: null,
			isLeader: false
		};
		selectedMunicipality = '';
		editingId = null;
		showForm = false;
		error = '';
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
		await loadPeople();
		await loadMunicipalitiesAndBarangays();
		await loadAssistances();
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
				<button onclick={() => (showForm = !showForm)} class="btn btn-primary btn-lg">
					{showForm ? '✕ Cancel' : '+ Add Person'}
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

	{#if showForm}
		<div class="modal d-block" style="background-color: rgba(0, 0, 0, 0.5);">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
						<h5 class="modal-title">{editingId ? '✏️ Edit Person' : '➕ Add New Person'}</h5>
						<button type="button" class="btn-close btn-close-white" onclick={resetForm}></button>
					</div>
					<div class="modal-body">
						<form onsubmit={savePerson} id="personForm">
							<div class="row mb-3">
								<div class="col-md-6">
									<label for="lastName" class="form-label fw-500">Last Name *</label>
									<input
										type="text"
										id="lastName"
										class="form-control form-control-lg"
										bind:value={formData.lastName}
										placeholder="Enter last name"
										required
									/>
								</div>
								<div class="col-md-6">
									<label for="firstName" class="form-label fw-500">First Name *</label>
									<input
										type="text"
										id="firstName"
										class="form-control form-control-lg"
										bind:value={formData.firstName}
										placeholder="Enter first name"
										required
									/>
								</div>
							</div>

							<div class="row mb-3">
								<div class="col-md-6">
									<label for="middleName" class="form-label fw-500">Middle Name</label>
									<input
										type="text"
										id="middleName"
										class="form-control form-control-lg"
										bind:value={formData.middleName}
										placeholder="Enter middle name"
									/>
								</div>
								<div class="col-md-6">
									<label for="extensionName" class="form-label fw-500">Extension Name</label>
									<input
										type="text"
										id="extensionName"
										class="form-control form-control-lg"
										bind:value={formData.extensionName}
										placeholder="e.g., Jr., Sr., III"
									/>
								</div>
							</div>

							<div class="row mb-3">
								<div class="col-md-6">
									<label for="birthdate" class="form-label fw-500">Birthdate *</label>
									<input 
										type="date" 
										id="birthdate" 
										class="form-control form-control-lg"
										bind:value={formData.birthdate}
										required
									/>
								</div>
								<div class="col-md-6">
									<label for="sex" class="form-label fw-500">Sex *</label>
									<select id="sex" class="form-select form-select-lg" bind:value={formData.sex} required>
									<option value="Male">Male</option>
									<option value="Female">Female</option>
									</select>
								</div>
							</div>

							<div class="row mb-3">
								<div class="col-md-6">
									<label for="municipality" class="form-label fw-500">Municipality *</label>
									<select id="municipality" class="form-select form-select-lg" bind:value={selectedMunicipality} required>
										<option value="">-- Select Municipality --</option>
										{#each municipalities as municipality}
											<option value={municipality.id.toString()}>{municipality.name}</option>
										{/each}
									</select>
								</div>
								<div class="col-md-6">
									<label for="barangayId" class="form-label fw-500">Barangay *</label>
									<select id="barangayId" class="form-select form-select-lg" bind:value={formData.barangayId} required>
										<option value="">-- Select Barangay --</option>
										{#each filteredBarangays as barangay}
											<option value={barangay.id.toString()}>{barangay.name}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="mb-3">
								<label for="purok" class="form-label fw-500">Purok</label>
								<input 
									type="text" 
									id="purok" 
									class="form-control form-control-lg"
									bind:value={formData.purok} 
									placeholder="Enter purok" 
								/>
							</div>

							<div class="row mb-3">
								<div class="col-md-6">
									<div class="mb-3">
										<div class="form-label fw-500 d-block mb-2">Is Supporter?</div>
										<div class="btn-group" role="group" aria-label="Is Supporter options">
											<input onchange={() => formData.isSupporter = true}
												type="radio" 
												class="btn-check" 
												id="supporterYes" 
												name="isSupporter" 
												value="yes"
												checked={formData.isSupporter === true} />
											<label class="btn btn-outline-primary" for="supporterYes">Yes</label>

											<input onchange={() => formData.isSupporter = false}
												type="radio" 
												class="btn-check" 
												id="supporterNo" 
												name="isSupporter" 
												value="no"
												checked={formData.isSupporter === false} />
											<label class="btn btn-outline-primary" for="supporterNo">No</label>

											<input onchange={() => formData.isSupporter = null}
												type="radio" 
												class="btn-check" 
												id="supporterUnsure" 
												name="isSupporter" 
												value="unsure"
												checked={formData.isSupporter === null} />
											<label class="btn btn-outline-primary" for="supporterUnsure">Unsure</label>
										</div>
									</div>
								</div>

								<div class="col-md-6">
									<label for="isLeader" class="form-label fw-500 d-block">Is Leader?</label>
									<div class="form-check">
										<input 
											type="checkbox" 
											class="form-check-input" 
											id="isLeader"
											bind:checked={formData.isLeader}
										/>
										<label class="form-check-label" for="isLeader">
											Mark as leader
										</label>
									</div>
								</div>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button onclick={resetForm} 
							type="button"
							class="btn btn-secondary">Cancel</button>
						<button type="submit" form="personForm" class="btn btn-success">
							{editingId ? '💾 Update' : '💾 Create'}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm border-0" style="border-top: 4px solid #27ae60; margin-top: 2rem;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People List</h5>
		</div>
		<div class="card-body">
			{#if loading}
				<div class="text-center py-5 text-muted">
					<div class="spinner-border me-2" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					Loading people...
				</div>
			{:else if people.length === 0}
				<div class="text-center py-5 text-muted">
					<p class="mb-0 fs-5">No people found</p>
					<small class="text-muted">Add your first person to get started</small>
				</div>
			{:else}
				<PeopleTable {capabilities}
					{people}
					{financialAssistances}
					{medicineAssistances}
					onEdit={editPerson}
					onDelete={deletePerson}
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>
