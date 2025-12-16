<script lang="ts">
	import { onMount } from 'svelte';

	interface PageData {
		user: {
			id: number;
			username: string;
			role: string;
		};
	}


	let people: any[] = [];
	let loading = false;
	let error = '';
	let showForm = false;
	let editingId: number | null = null;
	let municipalities: any[] = [];
	let barangays: any[] = [];
	let searchQuery = '';
	let selectedMunicipality = '';

	let formData = {
		firstName: '',
		lastName: '',
		birthdate: '',
		sex: 'M',
		barangayId: '',
		purok: ''
	};

	async function loadPeople() {
		try {
			const res = await fetch('/api/people');
			if (!res.ok) throw new Error('Failed to load people');
			const result = await res.json();
			people = result.data || result;
			console.log('Loaded people:', people);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading people';
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

	function getBarangaysForMunicipality(municipalityId: string) {
		if (!municipalityId) return barangays;
		const munId = parseInt(municipalityId);
		return barangays.filter((b: any) => b.parentId === munId);
	}

	$: filteredBarangays = getBarangaysForMunicipality(selectedMunicipality);

	async function savePerson() {
		if (!formData.firstName || !formData.lastName || !formData.birthdate || !formData.barangayId) {
			error = 'Please fill in all required fields';
			return;
		}

		try {
			const method = editingId ? 'PUT' : 'POST';
			const endpoint = editingId ? `/api/people/${editingId}` : '/api/people';

			const res = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
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
			birthdate: '',
			sex: 'M',
			barangayId: '',
			purok: ''
		};
		selectedMunicipality = '';
		editingId = null;
		showForm = false;
		error = '';
	}

	$: filteredPeople = people.filter(
		(p) =>
			p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	onMount(async () => {
		await loadPeople();
		await loadMunicipalitiesAndBarangays();
	});
</script>

<div class="container-fluid p-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">People Management</h1>
		<button on:click={() => (showForm = !showForm)} class="btn btn-primary btn-lg">
			{showForm ? '✕ Cancel' : '+ Add Person'}
		</button>
	</div>

	{#if error}
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			<strong>Error!</strong> {error}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	{/if}

	{#if showForm}
		<div class="card mb-4 shadow-sm border-0" style="border-top: 4px solid #3498db;">
			<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">{editingId ? 'Edit Person' : 'Add New Person'}</h5>
			</div>
			<div class="card-body">
				<form on:submit={savePerson}>
					<div class="row mb-3">
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
								<option value="M">Male</option>
								<option value="F">Female</option>
							</select>
						</div>
					</div>

					<div class="row mb-3">
						<div class="col-md-6">
							<label for="municipality" class="form-label fw-500">Municipality *</label>
							<select id="municipality" class="form-select form-select-lg" bind:value={selectedMunicipality} required>
								<option value="">-- Select Municipality --</option>
								{#each municipalities as municipality}
									<option value={municipality.id}>{municipality.name}</option>
								{/each}
							</select>
						</div>
						<div class="col-md-6">
							<label for="barangayId" class="form-label fw-500">Barangay *</label>
							<select id="barangayId" class="form-select form-select-lg" bind:value={formData.barangayId} required>
								<option value="">-- Select Barangay --</option>
								{#each filteredBarangays as barangay}
									<option value={barangay.id}>{barangay.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="mb-4">
						<label for="purok" class="form-label fw-500">Purok</label>
						<input 
							type="text" 
							id="purok" 
							class="form-control form-control-lg"
							bind:value={formData.purok} 
							placeholder="Enter purok" 
						/>
					</div>

					<div class="d-flex gap-2">
						<button type="submit" class="btn btn-success btn-lg">
							{editingId ? '💾 Update' : '💾 Create'}
						</button>
						<button type="button" on:click={resetForm} class="btn btn-outline-secondary btn-lg">Cancel</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm border-0" style="border-top: 4px solid #27ae60;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<div class="d-flex justify-content-between align-items-center">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People List ({filteredPeople.length})</h5>
				<input
					type="text"
					placeholder="Search by name..."
					bind:value={searchQuery}
					class="form-control"
					style="max-width: 300px;"
				/>
			</div>
		</div>
		<div class="card-body">
			{#if loading}
				<div class="text-center py-5 text-muted">
					<div class="spinner-border me-2" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					Loading people...
				</div>
			{:else if filteredPeople.length === 0}
				<div class="text-center py-5 text-muted">
					<p class="mb-0 fs-5">No people found</p>
					<small class="text-muted">
						{searchQuery ? 'Try adjusting your search' : 'Add your first person to get started'}
					</small>
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover table-striped">
						<thead class="table-light">
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Birthdate</th>
								<th scope="col">Sex</th>
								<th scope="col">Town</th>
								<th scope="col">Barangay</th>
								<th scope="col">Purok</th>
								<th scope="col" class="text-center">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredPeople as person}
								<tr>
									<td>
										<strong>{person.lastName}, {person.firstName}</strong>
									</td>
									<td>{new Date(person.birthdate).toLocaleDateString('en-US')}</td>
									<td>{person.sex === 'M' ? '♂ Male' : '♀ Female'}</td>
									<td>{person.barangay?.parent?.name || 'N/A'}</td>
									<td>{person.barangay?.name || 'N/A'}</td>
									<td>{person.purok || '-'}</td>
									<td class="text-center">
										<button on:click={() => editPerson(person)} class="btn btn-sm btn-outline-primary me-1">
											✎ Edit
										</button>
										<button on:click={() => deletePerson(person.id)} class="btn btn-sm btn-outline-danger">
											🗑 Delete
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>
