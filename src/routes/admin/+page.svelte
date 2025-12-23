<script lang="ts">
	import { onMount } from 'svelte';

	// Tab management
	let activeTab: 'localities' | 'people' | 'users' = 'localities';

	// Localities state
	let localities: any[] = [];
	let loading = true;
	let error = '';
	let showLocalityForm = false;
	let editingLocalityId: number | null = null;

	let localityFormData = {
		name: '',
		code: '',
		type: 'barangay',
		population: '',
		boundaryGeoJSON: ''
	};

	// People state
	let people: any[] = [];
	let loadingPeople = true;
	let errorPeople = '';
	let showPeopleForm = false;
	let editingPeopleId: number | null = null;

	let peopleFormData = {
		firstName: '',
		lastName: '',
		birthdate: '',
		sex: 'M',
		barangayId: '',
		purok: ''
	};

	let barangays: any[] = [];

	onMount(async () => {
		await fetchLocalities();
		await fetchBarangays();
		await fetchPeople();
	});

	// ============= LOCALITIES FUNCTIONS =============

	async function fetchLocalities() {
		try {
			loading = true;
			const response = await fetch('/api/localities');
			if (!response.ok) throw new Error('Failed to fetch localities');
			localities = await response.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
			console.error('Error fetching localities:', e);
		} finally {
			loading = false;
		}
	}

	async function fetchBarangays() {
		try {
			const response = await fetch('/api/localities');
			if (!response.ok) throw new Error('Failed to fetch barangays');
			barangays = (await response.json()).filter((l: any) => l.type === 'barangay' || !l.type);
		} catch (e) {
			console.error('Error fetching barangays:', e);
		}
	}

	function resetLocalityForm() {
		localityFormData = {
			name: '',
			code: '',
			type: 'barangay',
			population: '',
			boundaryGeoJSON: ''
		};
		editingLocalityId = null;
		showLocalityForm = false;
	}

	function handleNewLocality() {
		resetLocalityForm();
		showLocalityForm = true;
	}

	function handleEditLocality(locality: any) {
		localityFormData = {
			name: locality.name,
			code: locality.code || '',
			type: locality.type || 'barangay',
			population: locality.population?.toString() || '',
			boundaryGeoJSON: JSON.stringify(locality.boundaryGeoJSON, null, 2)
		};
		editingLocalityId = locality.id;
		showLocalityForm = true;
	}

	async function handleLocalitySubmit(e: Event) {
		e.preventDefault();

		try {
			let parsedGeoJSON;
			try {
				parsedGeoJSON = JSON.parse(localityFormData.boundaryGeoJSON);
			} catch {
				alert('Invalid GeoJSON format');
				return;
			}

			const data = {
				name: localityFormData.name,
				code: localityFormData.code || undefined,
				type: localityFormData.type,
				population: localityFormData.population ? parseInt(localityFormData.population) : undefined,
				boundaryGeoJSON: parsedGeoJSON
			};

			const url = editingLocalityId ? `/api/localities/${editingLocalityId}` : '/api/localities';
			const method = editingLocalityId ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save locality');
			}

			alert(editingLocalityId ? 'Locality updated successfully!' : 'Locality created successfully!');
			resetLocalityForm();
			await fetchLocalities();
			await fetchBarangays();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to save locality');
		}
	}

	async function handleDeleteLocality(id: number, name: string) {
		if (!confirm(`Are you sure you want to delete "${name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/localities/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete locality');
			}

			alert('Locality deleted successfully!');
			await fetchLocalities();
			await fetchBarangays();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to delete locality');
		}
	}

	function loadSampleGeoJSON() {
		localityFormData.boundaryGeoJSON = JSON.stringify(
			{
				type: 'Polygon',
				coordinates: [
					[
						[121.0, 14.0],
						[121.02, 14.0],
						[121.02, 14.02],
						[121.0, 14.02],
						[121.0, 14.0]
					]
				]
			},
			null,
			2
		);
	}

	// ============= PEOPLE FUNCTIONS =============

	async function fetchPeople() {
		try {
			loadingPeople = true;
			const response = await fetch('/api/people');
			if (!response.ok) throw new Error('Failed to fetch people');
			const result = await response.json();
			people = result.data || result;
		} catch (e) {
			errorPeople = e instanceof Error ? e.message : 'An error occurred';
			console.error('Error fetching people:', e);
		} finally {
			loadingPeople = false;
		}
	}

	function resetPeopleForm() {
		peopleFormData = {
			firstName: '',
			lastName: '',
			birthdate: '',
			sex: 'M',
			barangayId: '',
			purok: ''
		};
		editingPeopleId = null;
		showPeopleForm = false;
	}

	function handleNewPerson() {
		resetPeopleForm();
		showPeopleForm = true;
	}

	function handleEditPerson(person: any) {
		const birthDate = new Date(person.birthdate);
		const isoDate = birthDate.toISOString().split('T')[0];

		peopleFormData = {
			firstName: person.firstName,
			lastName: person.lastName,
			birthdate: isoDate,
			sex: person.sex,
			barangayId: person.barangayId?.toString() || '',
			purok: person.purok || ''
		};
		editingPeopleId = person.id;
		showPeopleForm = true;
	}

	async function handlePeopleSubmit(e: Event) {
		e.preventDefault();

		try {
			if (!peopleFormData.firstName || !peopleFormData.lastName || !peopleFormData.birthdate) {
				alert('Please fill in all required fields');
				return;
			}

			const data = {
				firstName: peopleFormData.firstName,
				lastName: peopleFormData.lastName,
				birthdate: peopleFormData.birthdate,
				sex: peopleFormData.sex,
				barangayId: peopleFormData.barangayId ? parseInt(peopleFormData.barangayId) : null,
				purok: peopleFormData.purok || null
			};

			const url = editingPeopleId ? `/api/people/${editingPeopleId}` : '/api/people';
			const method = editingPeopleId ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save person');
			}

			alert(editingPeopleId ? 'Person updated successfully!' : 'Person created successfully!');
			resetPeopleForm();
			await fetchPeople();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to save person');
		}
	}

	async function handleDeletePerson(id: number, name: string) {
		if (!confirm(`Are you sure you want to delete "${name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/people/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete person');
			}

			alert('Person deleted successfully!');
			await fetchPeople();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to delete person');
		}
	}

	function getBarangayName(barangayId: number | null): string {
		if (!barangayId) return 'N/A';
		const barangay = barangays.find((b) => b.id === barangayId);
		return barangay ? barangay.name : 'Unknown';
	}

	function getAgeFromBirthdate(birthdate: Date): number {
		const today = new Date();
		let age = today.getFullYear() - birthdate.getFullYear();
		const monthDiff = today.getMonth() - birthdate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
			age--;
		}
		return age;
	}
</script>

<svelte:head>
	<title>Admin - Barangay Mapping System</title>
</svelte:head>

<div class="container-fluid p-4" style="background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%); min-height: 100vh;">
	<div class="mb-5">
		<div class="d-flex justify-content-between align-items-center">
			<div>
				<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2rem;">Admin Panel</h1>
				<p class="lead" style="color: #7f8c8d;">Manage localities and residents</p>
			</div>
			<nav>
				<a href="/dashboard" class="btn btn-outline-secondary">← Back to Dashboard</a>
			</nav>
		</div>
	</div>

	<main>
		<div class="nav nav-tabs mb-4 border-bottom-0">
			<button
				class="nav-link"
				class:active={activeTab === 'localities'}
				on:click={() => (activeTab = 'localities')}
				style="color: #2c3e50; font-weight: 500; border-bottom: 3px solid transparent;"
			>
				📍 Localities
			</button>
			<button
				class="nav-link"
				class:active={activeTab === 'people'}
				on:click={() => (activeTab = 'people')}
				style="color: #2c3e50; font-weight: 500; border-bottom: 3px solid transparent;"
			>
				👥 People
			</button>
			<a
				href="/admin/users"
				class="nav-link"
				style="color: #2c3e50; font-weight: 500; border-bottom: 3px solid transparent;"
			>
				🔑 Users
			</a>
		</div>

		<!-- ============= LOCALITIES TAB ============= -->
		{#if activeTab === 'localities'}
			<div class="mb-4">
				<button on:click={handleNewLocality} class="btn btn-primary">+ Add New Locality</button>
			</div>

			{#if showLocalityForm}
				<div class="card mb-4 shadow-sm border-0" style="border-top: 4px solid #3498db;">
					<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: center;">
						<h5 class="mb-0 fw-bold" style="color: #2c3e50;">{editingLocalityId ? 'Edit Locality' : 'Add New Locality'}</h5>
						<button on:click={resetLocalityForm} class="btn-close"></button>
					</div>
					<div class="card-body">
						<form on:submit={handleLocalitySubmit}>
							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="name" class="form-label">Name *</label>
									<input
										id="name"
										type="text"
										class="form-control"
										bind:value={localityFormData.name}
										required
										placeholder="e.g., Barangay San Antonio"
									/>
								</div>

								<div class="col-md-6 mb-3">
									<label for="code" class="form-label">Code</label>
									<input
										id="code"
										type="text"
										class="form-control"
										bind:value={localityFormData.code}
										placeholder="e.g., BRG-001"
									/>
								</div>
							</div>

							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="type" class="form-label">Type</label>
									<select id="type" class="form-select" bind:value={localityFormData.type}>
										<option value="barangay">Barangay</option>
										<option value="district">District</option>
										<option value="municipality">Municipality</option>
										<option value="city">City</option>
										<option value="province">Province</option>
									</select>
								</div>

								<div class="col-md-6 mb-3">
									<label for="population" class="form-label">Population</label>
									<input
										id="population"
										type="number"
										class="form-control"
										bind:value={localityFormData.population}
										placeholder="e.g., 5000"
									/>
								</div>
							</div>

							<div class="mb-3">
								<label for="boundary" class="form-label">Boundary GeoJSON *</label>
								<div class="mb-2 d-flex gap-2">
									<button type="button" on:click={loadSampleGeoJSON} class="btn btn-sm btn-outline-secondary">
										Load Sample
									</button>
									<a
										href="https://geojson.io"
										target="_blank"
										rel="noopener noreferrer"
										class="btn btn-sm btn-outline-secondary"
									>
										Create on geojson.io ↗
									</a>
								</div>
								<textarea
									id="boundary"
									class="form-control"
									bind:value={localityFormData.boundaryGeoJSON}
									rows="10"
									required
									placeholder={`{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],...]]}`}
								></textarea>
								<small class="form-text" style="color: #7f8c8d;">Must be a valid GeoJSON Polygon. Coordinates in [longitude, latitude] format.</small>
							</div>

							<div class="d-flex gap-2 mt-4">
								<button type="button" on:click={resetLocalityForm} class="btn btn-outline-secondary">Cancel</button>
								<button type="submit" class="btn btn-primary">
									{editingLocalityId ? 'Update' : 'Create'} Locality
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

				{#if loading}
					<div class="alert alert-info">Loading localities...</div>
				{:else if error}
					<div class="alert alert-danger">{error}</div>
				{:else}
					<div class="card shadow-sm border-0">
						<div class="card-header" style="background-color: #f8f9fa;">
							<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Localities ({localities.length})</h5>
						</div>
						<div class="table-responsive">
							<table class="table table-hover mb-0">
								<thead class="table-light">
									<tr>
										<th style="color: #2c3e50;">ID</th>
										<th style="color: #2c3e50;">Name</th>
										<th style="color: #2c3e50;">Code</th>
										<th style="color: #2c3e50;">Type</th>
										<th style="color: #2c3e50;">Population</th>
										<th style="color: #2c3e50;">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each localities as locality}
										<tr>
											<td>{locality.id}</td>
											<td><strong style="color: #2c3e50;">{locality.name}</strong></td>
											<td>{locality.code || '—'}</td>
											<td><span class="badge bg-info">{locality.type || 'N/A'}</span></td>
											<td>{locality.population?.toLocaleString() || '—'}</td>
											<td>
												<button on:click={() => handleEditLocality(locality)} class="btn btn-sm btn-outline-primary">Edit</button>
												<button
													on:click={() => handleDeleteLocality(locality.id, locality.name)}
													class="btn btn-sm btn-outline-danger"
												>
													Delete
												</button>
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="6" class="text-center text-muted py-4">
												No localities found. Add your first locality to get started!
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
		{/if}

		<!-- ============= PEOPLE TAB ============= -->
		{#if activeTab === 'people'}
			<div class="mb-4">
				<button on:click={handleNewPerson} class="btn btn-primary">+ Add New Person</button>
			</div>

			{#if showPeopleForm}
				<div class="card mb-4 shadow-sm border-0" style="border-top: 4px solid #3498db;">
					<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: center;">
						<h5 class="mb-0 fw-bold" style="color: #2c3e50;">{editingPeopleId ? 'Edit Person' : 'Add New Person'}</h5>
						<button on:click={resetPeopleForm} class="btn-close"></button>
					</div>
					<div class="card-body">
						<form on:submit={handlePeopleSubmit}>
							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="firstName" class="form-label">First Name *</label>
									<input
										id="firstName"
										type="text"
										class="form-control"
										bind:value={peopleFormData.firstName}
										required
										placeholder="e.g., Juan"
									/>
								</div>

								<div class="col-md-6 mb-3">
									<label for="lastName" class="form-label">Last Name *</label>
									<input
										id="lastName"
										type="text"
										class="form-control"
										bind:value={peopleFormData.lastName}
										required
										placeholder="e.g., Dela Cruz"
									/>
								</div>
							</div>

							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="birthdate" class="form-label">Birthdate *</label>
									<input
										id="birthdate"
										type="date"
										class="form-control"
										bind:value={peopleFormData.birthdate}
										required
									/>
								</div>

								<div class="col-md-6 mb-3">
									<label for="sex" class="form-label">Sex *</label>
									<select id="sex" class="form-select" bind:value={peopleFormData.sex} required>
										<option value="M">Male</option>
										<option value="F">Female</option>
									</select>
								</div>
							</div>

							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="barangayId" class="form-label">Barangay</label>
									<select id="barangayId" class="form-select" bind:value={peopleFormData.barangayId}>
										<option value="">-- Select Barangay --</option>
										{#each barangays as barangay}
											<option value={barangay.id}>{barangay.name}</option>
										{/each}
									</select>
								</div>

								<div class="col-md-6 mb-3">
									<label for="purok" class="form-label">Purok</label>
									<input
										id="purok"
										type="text"
										class="form-control"
										bind:value={peopleFormData.purok}
										placeholder="e.g., Zone A or Purok 1"
									/>
								</div>
							</div>

							<div class="d-flex gap-2 mt-4">
								<button type="button" on:click={resetPeopleForm} class="btn btn-outline-secondary">Cancel</button>
								<button type="submit" class="btn btn-primary">
									{editingPeopleId ? 'Update' : 'Create'} Person
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

			{#if loadingPeople}
				<div class="alert alert-info">Loading people...</div>
			{:else if errorPeople}
				<div class="alert alert-danger">{errorPeople}</div>
			{:else}
				<div class="card shadow-sm border-0">
					<div class="card-header" style="background-color: #f8f9fa;">
						<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People ({people.length})</h5>
					</div>
					<div class="table-responsive">
						<table class="table table-hover mb-0">
							<thead class="table-light">
								<tr>
									<th style="color: #2c3e50;">ID</th>
									<th style="color: #2c3e50;">Name</th>
									<th style="color: #2c3e50;">Birthdate</th>
									<th style="color: #2c3e50;">Age</th>
									<th style="color: #2c3e50;">Sex</th>
									<th style="color: #2c3e50;">Barangay</th>
									<th style="color: #2c3e50;">Purok</th>
									<th style="color: #2c3e50;">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each people as person}
									<tr>
										<td>{person.id}</td>
										<td><strong style="color: #2c3e50;">{person.lastName}, {person.firstName}</strong></td>
										<td>{new Date(person.birthdate).toLocaleDateString()}</td>
										<td>{getAgeFromBirthdate(new Date(person.birthdate))}</td>
										<td>{person.sex === 'M' ? '♂️ Male' : '♀️ Female'}</td>
										<td>{getBarangayName(person.barangayId)}</td>
										<td>{person.purok || '—'}</td>
										<td>
											<button on:click={() => handleEditPerson(person)} class="btn btn-sm btn-outline-primary">Edit</button>
											<button
												on:click={() => handleDeletePerson(person.id, `${person.firstName} ${person.lastName}`)}
												class="btn btn-sm btn-outline-danger"
											>
												Delete
											</button>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="8" class="text-center text-muted py-4">
											No people found. Add your first person to get started!
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	:global(.nav-link.active) {
		background-color: #3498db !important;
		color: white !important;
		border-bottom-color: #3498db !important;
	}

	:global(.nav-link:hover) {
		background-color: rgba(52, 152, 219, 0.1) !important;
		color: #3498db !important;
	}

	@media (max-width: 768px) {
		:global(.nav) {
			flex-direction: row;
			overflow-x: auto;
		}
	}
</style>




