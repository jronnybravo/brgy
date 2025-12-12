<script lang="ts">
	import { onMount } from 'svelte';

	interface PageData {
		user: {
			id: number;
			username: string;
			role: string;
		};
	}

	export let data: PageData;

	let people: any[] = [];
	let loading = true;
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
			people = await res.json();
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
		await Promise.all([loadPeople(), loadMunicipalitiesAndBarangays()]);
		loading = false;
	});
</script>

<div class="people-page">
	<div class="header">
		<h1>People Management</h1>
		<button on:click={() => (showForm = !showForm)} class="btn btn-primary">
			{showForm ? '✕ Cancel' : '+ Add Person'}
		</button>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if showForm}
		<div class="form-card">
			<h2>{editingId ? 'Edit Person' : 'Add New Person'}</h2>

			<div class="form-group">
				<label for="firstName">First Name *</label>
				<input
					type="text"
					id="firstName"
					bind:value={formData.firstName}
					placeholder="Enter first name"
				/>
			</div>

			<div class="form-group">
				<label for="lastName">Last Name *</label>
				<input
					type="text"
					id="lastName"
					bind:value={formData.lastName}
					placeholder="Enter last name"
				/>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="birthdate">Birthdate *</label>
					<input type="date" id="birthdate" bind:value={formData.birthdate} />
				</div>

				<div class="form-group">
					<label for="sex">Sex *</label>
					<select id="sex" bind:value={formData.sex}>
						<option value="M">Male</option>
						<option value="F">Female</option>
					</select>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="municipality">Municipality *</label>
					<select id="municipality" bind:value={selectedMunicipality}>
						<option value="">-- Select Municipality --</option>
						{#each municipalities as municipality}
							<option value={municipality.id}>{municipality.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="barangayId">Barangay *</label>
					<select id="barangayId" bind:value={formData.barangayId}>
						<option value="">-- Select Barangay --</option>
						{#each filteredBarangays as barangay}
							<option value={barangay.id}>{barangay.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="purok">Purok</label>
					<input type="text" id="purok" bind:value={formData.purok} placeholder="Enter purok" />
				</div>
			</div>

			<div class="form-actions">
				<button on:click={savePerson} class="btn btn-success">
					{editingId ? '💾 Update' : '💾 Create'}
				</button>
				<button on:click={resetForm} class="btn btn-secondary">Cancel</button>
			</div>
		</div>
	{/if}

	<div class="list-section">
		<div class="list-header">
			<h2>People List ({filteredPeople.length})</h2>
			<input
				type="text"
				placeholder="Search by name..."
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>

		{#if loading}
			<div class="loading">Loading people...</div>
		{:else if filteredPeople.length === 0}
			<div class="empty-state">
				<p>No people found</p>
				<p class="empty-hint">
					{searchQuery ? 'Try adjusting your search' : 'Add your first person to get started'}
				</p>
			</div>
		{:else}
			<div class="table-responsive">
				<table class="people-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Birthdate</th>
							<th>Sex</th>
							<th>Barangay</th>
							<th>Purok</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredPeople as person}
							<tr>
								<td class="name">
									<strong>{person.lastName}, {person.firstName}</strong>
								</td>
								<td>{new Date(person.birthdate).toLocaleDateString('en-US')}</td>
								<td>{person.sex === 'M' ? '♂ Male' : '♀ Female'}</td>
								<td>{person.locality?.name || 'N/A'}</td>
								<td>{person.purok || '-'}</td>
								<td class="actions">
									<button on:click={() => editPerson(person)} class="btn-sm btn-edit">
										✎ Edit
									</button>
									<button on:click={() => deletePerson(person.id)} class="btn-sm btn-delete">
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

<style>
	.people-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		background: linear-gradient(90deg, #fff, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.error-message {
		padding: 1rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ff6b6b;
		border-radius: 8px;
	}

	.form-card {
		background: linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
		border: 1px solid rgba(167, 139, 250, 0.3);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form-card h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.3rem;
		color: #fff;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		margin-bottom: 1.5rem;
	}

	.form-group label {
		margin-bottom: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.form-group input,
	.form-group select {
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(167, 139, 250, 0.3);
		border-radius: 6px;
		color: #fff;
		font-size: 1rem;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #a78bfa;
		background: rgba(0, 0, 0, 0.4);
	}

	.form-group input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-primary {
		background: linear-gradient(90deg, #a78bfa, #ec4899);
		color: #fff;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);
	}

	.btn-success {
		background: linear-gradient(90deg, #10b981, #059669);
		color: #fff;
	}

	.btn-success:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.list-section {
		margin-top: 2rem;
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		gap: 1rem;
	}

	.list-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.search-input {
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(167, 139, 250, 0.3);
		border-radius: 6px;
		color: #fff;
		font-size: 1rem;
		min-width: 250px;
	}

	.search-input:focus {
		outline: none;
		border-color: #a78bfa;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.loading,
	.empty-state {
		padding: 3rem 2rem;
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.6);
	}

	.empty-hint {
		font-size: 0.9rem;
		margin-top: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.table-responsive {
		overflow-x: auto;
	}

	.people-table {
		width: 100%;
		border-collapse: collapse;
		color: #fff;
	}

	.people-table thead {
		background: rgba(167, 139, 250, 0.1);
		border-bottom: 2px solid rgba(167, 139, 250, 0.3);
	}

	.people-table th {
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		color: #a78bfa;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.people-table td {
		padding: 1rem;
		border-bottom: 1px solid rgba(167, 139, 250, 0.2);
	}

	.people-table tbody tr {
		transition: all 0.2s;
	}

	.people-table tbody tr:hover {
		background: rgba(167, 139, 250, 0.05);
	}

	.name {
		font-weight: 600;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-sm {
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.btn-edit {
		background: rgba(167, 139, 250, 0.2);
		color: #a78bfa;
		border: 1px solid rgba(167, 139, 250, 0.3);
	}

	.btn-edit:hover {
		background: rgba(167, 139, 250, 0.3);
		border-color: rgba(167, 139, 250, 0.5);
	}

	.btn-delete {
		background: rgba(239, 68, 68, 0.2);
		color: #ff6b6b;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.btn-delete:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.5);
	}

	@media (max-width: 768px) {
		.people-page {
			padding: 1rem;
		}

		.header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.list-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.search-input {
			min-width: auto;
			width: 100%;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.table-responsive {
			font-size: 0.85rem;
		}

		.people-table th,
		.people-table td {
			padding: 0.75rem;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>
