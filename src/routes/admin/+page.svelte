<script lang="ts">
	import { onMount } from 'svelte';

	// Tab management
	let activeTab: 'localities' | 'people' = 'localities';

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
			people = await response.json();
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

<div class="container">
	<header>
		<div class="header-content">
			<div>
				<h1>Admin Panel</h1>
				<p>Manage localities and residents</p>
			</div>
			<nav>
				<a href="/dashboard">← Back to Dashboard</a>
			</nav>
		</div>
	</header>

	<main>
		<div class="tabs">
			<button
				class="tab-button"
				class:active={activeTab === 'localities'}
				on:click={() => (activeTab = 'localities')}
			>
				📍 Localities
			</button>
			<button
				class="tab-button"
				class:active={activeTab === 'people'}
				on:click={() => (activeTab = 'people')}
			>
				👥 People
			</button>
		</div>

		<!-- ============= LOCALITIES TAB ============= -->
		{#if activeTab === 'localities'}
			<div class="tab-content">
				<div class="actions">
					<button on:click={handleNewLocality} class="btn btn-primary">+ Add New Locality</button>
				</div>

				{#if showLocalityForm}
					<div class="form-container">
						<div class="form-header">
							<h2>{editingLocalityId ? 'Edit Locality' : 'Add New Locality'}</h2>
							<button on:click={resetLocalityForm} class="btn-close">✕</button>
						</div>

						<form on:submit={handleLocalitySubmit}>
							<div class="form-row">
								<div class="form-group">
									<label for="name">Name *</label>
									<input
										id="name"
										type="text"
										bind:value={localityFormData.name}
										required
										placeholder="e.g., Barangay San Antonio"
									/>
								</div>

								<div class="form-group">
									<label for="code">Code</label>
									<input
										id="code"
										type="text"
										bind:value={localityFormData.code}
										placeholder="e.g., BRG-001"
									/>
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="type">Type</label>
									<select id="type" bind:value={localityFormData.type}>
										<option value="barangay">Barangay</option>
										<option value="district">District</option>
										<option value="municipality">Municipality</option>
										<option value="city">City</option>
										<option value="province">Province</option>
									</select>
								</div>

								<div class="form-group">
									<label for="population">Population</label>
									<input
										id="population"
										type="number"
										bind:value={localityFormData.population}
										placeholder="e.g., 5000"
									/>
								</div>
							</div>

							<div class="form-group">
								<label for="boundary">Boundary GeoJSON *</label>
								<div class="textarea-actions">
									<button type="button" on:click={loadSampleGeoJSON} class="btn-link">
										Load Sample
									</button>
									<a
										href="https://geojson.io"
										target="_blank"
										rel="noopener noreferrer"
										class="btn-link"
									>
										Create on geojson.io ↗
									</a>
								</div>
								<textarea
									id="boundary"
									bind:value={localityFormData.boundaryGeoJSON}
									rows="10"
									required
									placeholder={`{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],...]]}`}
								></textarea>
								<small
									>Must be a valid GeoJSON Polygon. Coordinates in [longitude, latitude] format.</small
								>
							</div>

							<div class="form-actions">
								<button type="button" on:click={resetLocalityForm} class="btn">Cancel</button>
								<button type="submit" class="btn btn-primary">
									{editingLocalityId ? 'Update' : 'Create'} Locality
								</button>
							</div>
						</form>
					</div>
				{/if}

				{#if loading}
					<div class="loading">Loading localities...</div>
				{:else if error}
					<div class="error">{error}</div>
				{:else}
					<div class="table-container">
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>Code</th>
									<th>Type</th>
									<th>Population</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each localities as locality}
									<tr>
										<td>{locality.id}</td>
										<td><strong>{locality.name}</strong></td>
										<td>{locality.code || '—'}</td>
										<td><span class="badge">{locality.type || 'N/A'}</span></td>
										<td>{locality.population?.toLocaleString() || '—'}</td>
										<td class="actions-cell">
											<button on:click={() => handleEditLocality(locality)} class="btn-small">Edit</button>
											<button
												on:click={() => handleDeleteLocality(locality.id, locality.name)}
												class="btn-small btn-danger"
											>
												Delete
											</button>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="6" class="empty-state">
											No localities found. Add your first locality to get started!
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ============= PEOPLE TAB ============= -->
		{#if activeTab === 'people'}
			<div class="tab-content">
				<div class="actions">
					<button on:click={handleNewPerson} class="btn btn-primary">+ Add New Person</button>
				</div>

				{#if showPeopleForm}
					<div class="form-container">
						<div class="form-header">
							<h2>{editingPeopleId ? 'Edit Person' : 'Add New Person'}</h2>
							<button on:click={resetPeopleForm} class="btn-close">✕</button>
						</div>

						<form on:submit={handlePeopleSubmit}>
							<div class="form-row">
								<div class="form-group">
									<label for="firstName">First Name *</label>
									<input
										id="firstName"
										type="text"
										bind:value={peopleFormData.firstName}
										required
										placeholder="e.g., Juan"
									/>
								</div>

								<div class="form-group">
									<label for="lastName">Last Name *</label>
									<input
										id="lastName"
										type="text"
										bind:value={peopleFormData.lastName}
										required
										placeholder="e.g., Dela Cruz"
									/>
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="birthdate">Birthdate *</label>
									<input
										id="birthdate"
										type="date"
										bind:value={peopleFormData.birthdate}
										required
									/>
								</div>

								<div class="form-group">
									<label for="sex">Sex *</label>
									<select id="sex" bind:value={peopleFormData.sex} required>
										<option value="M">Male</option>
										<option value="F">Female</option>
									</select>
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="barangayId">Barangay</label>
									<select id="barangayId" bind:value={peopleFormData.barangayId}>
										<option value="">-- Select Barangay --</option>
										{#each barangays as barangay}
											<option value={barangay.id}>{barangay.name}</option>
										{/each}
									</select>
								</div>

								<div class="form-group">
									<label for="purok">Purok</label>
									<input
										id="purok"
										type="text"
										bind:value={peopleFormData.purok}
										placeholder="e.g., Zone A or Purok 1"
									/>
								</div>
							</div>

							<div class="form-actions">
								<button type="button" on:click={resetPeopleForm} class="btn">Cancel</button>
								<button type="submit" class="btn btn-primary">
									{editingPeopleId ? 'Update' : 'Create'} Person
								</button>
							</div>
						</form>
					</div>
				{/if}

				{#if loadingPeople}
					<div class="loading">Loading people...</div>
				{:else if errorPeople}
					<div class="error">{errorPeople}</div>
				{:else}
					<div class="table-container">
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>Birthdate</th>
									<th>Age</th>
									<th>Sex</th>
									<th>Barangay</th>
									<th>Purok</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each people as person}
									<tr>
										<td>{person.id}</td>
										<td><strong>{person.lastName}, {person.firstName}</strong></td>
										<td>{new Date(person.birthdate).toLocaleDateString()}</td>
										<td>{getAgeFromBirthdate(new Date(person.birthdate))}</td>
										<td>{person.sex === 'M' ? '♂️ Male' : '♀️ Female'}</td>
										<td>{getBarangayName(person.barangayId)}</td>
										<td>{person.purok || '—'}</td>
										<td class="actions-cell">
											<button on:click={() => handleEditPerson(person)} class="btn-small">Edit</button>
											<button
												on:click={() => handleDeletePerson(person.id, `${person.firstName} ${person.lastName}`)}
												class="btn-small btn-danger"
											>
												Delete
											</button>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="8" class="empty-state">
											No people found. Add your first person to get started!
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			sans-serif;
	}

	.container {
		min-height: 100vh;
		background: #f5f5f5;
	}

	header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 600;
	}

	header p {
		margin: 0;
		opacity: 0.9;
	}

	nav a {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		transition: background 0.2s;
	}

	nav a:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.tabs {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		border-bottom: 2px solid #e0e0e0;
	}

	.tab-button {
		padding: 1rem 1.5rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		color: #666;
		border-bottom: 3px solid transparent;
		transition: all 0.2s;
	}

	.tab-button:hover {
		color: #333;
	}

	.tab-button.active {
		color: #667eea;
		border-bottom-color: #667eea;
	}

	.tab-content {
		animation: fadeIn 0.2s;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.actions {
		margin-bottom: 2rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.btn:hover {
		background: #f5f5f5;
	}

	.btn-primary {
		background: #667eea;
		color: white;
		border-color: #667eea;
	}

	.btn-primary:hover {
		background: #5568d3;
	}

	.form-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.form-header h2 {
		margin: 0;
		color: #333;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #999;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.btn-close:hover {
		background: #f0f0f0;
		color: #666;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	.form-group textarea {
		font-family: 'Monaco', 'Courier New', monospace;
		font-size: 0.9rem;
	}

	.form-group small {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.85rem;
	}

	.textarea-actions {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.btn-link {
		background: none;
		border: none;
		color: #667eea;
		cursor: pointer;
		font-size: 0.9rem;
		text-decoration: none;
		padding: 0;
	}

	.btn-link:hover {
		text-decoration: underline;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	.table-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 800px;
	}

	thead {
		background: #f8f9fa;
	}

	th {
		text-align: left;
		padding: 1rem;
		font-weight: 600;
		color: #333;
		border-bottom: 2px solid #e0e0e0;
	}

	td {
		padding: 1rem;
		border-bottom: 1px solid #f0f0f0;
	}

	tbody tr:hover {
		background: #f9f9f9;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: #e3f2fd;
		color: #1976d2;
		border-radius: 12px;
		font-size: 0.85rem;
		text-transform: capitalize;
	}

	.actions-cell {
		display: flex;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.btn-small {
		padding: 0.25rem 0.75rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.btn-small:hover {
		background: #f5f5f5;
	}

	.btn-danger {
		color: #d32f2f;
		border-color: #d32f2f;
	}

	.btn-danger:hover {
		background: #ffebee;
	}

	.empty-state {
		text-align: center;
		padding: 3rem !important;
		color: #999;
	}

	.loading,
	.error {
		text-align: center;
		padding: 2rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.error {
		color: #d32f2f;
	}

	@media (max-width: 768px) {
		.form-row {
			grid-template-columns: 1fr;
		}

		.header-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.tabs {
			overflow-x: auto;
		}

		table {
			font-size: 0.9rem;
		}

		th,
		td {
			padding: 0.75rem;
		}
	}
</style>

