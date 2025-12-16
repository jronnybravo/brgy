<script lang="ts">
	import { onMount } from 'svelte';

	let assistances: any[] = [];
	let people: any[] = [];
	let loading = true;
	let error = '';
	let showForm = false;
	let editingId: number | null = null;
	let searchQuery = '';

	let formData = {
		personId: '',
		type: 'AICS',
		date_disbursed: '',
		amount: ''
	};

	async function loadAssistances() {
		try {
			const res = await fetch('/api/assistances');
			if (!res.ok) throw new Error('Failed to load assistances');
			const result = await res.json();
			assistances = result.data || result;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading assistances';
		}
	}

	async function loadPeople() {
		try {
			const res = await fetch('/api/people');
			if (!res.ok) throw new Error('Failed to load people');
			const result = await res.json();
			people = result.data || result;
		} catch (e) {
			console.error('Error loading people:', e);
		}
	}

	async function saveAssistance() {
		if (!formData.personId || !formData.type || !formData.date_disbursed || !formData.amount) {
			error = 'Please fill in all required fields';
			return;
		}

		try {
			const method = editingId ? 'PUT' : 'POST';
			const endpoint = editingId ? `/api/assistances/${editingId}` : '/api/assistances';

			const res = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					personId: formData.personId,
					type: formData.type,
					date_disbursed: formData.date_disbursed,
					amount: formData.amount
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to save assistance');
			}

			resetForm();
			await loadAssistances();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error saving assistance';
		}
	}

	async function deleteAssistance(id: number) {
		if (!confirm('Are you sure you want to delete this assistance?')) return;

		try {
			const res = await fetch(`/api/assistances/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete assistance');
			await loadAssistances();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error deleting assistance';
		}
	}

	function editAssistance(assistance: any) {
		formData = { ...assistance };
		formData.date_disbursed = assistance.date_disbursed.split('T')[0]; // Convert to date input format
		editingId = assistance.id;
		showForm = true;
		error = '';
	}

	function resetForm() {
		formData = {
			personId: '',
			type: 'AICS',
			date_disbursed: '',
			amount: ''
		};
		editingId = null;
		showForm = false;
		error = '';
	}

	$: filteredAssistances = assistances.filter(
		(a) =>
			a.person?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			a.person?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			a.type.toLowerCase().includes(searchQuery.toLowerCase())
	);

	onMount(async () => {
		await Promise.all([loadAssistances(), loadPeople()]);
		loading = false;
	});
</script>

<div class="container-fluid p-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">Assistances Management</h1>
		<button on:click={() => (showForm = !showForm)} class="btn btn-primary btn-lg">
			{showForm ? '✕ Cancel' : '+ Add Assistance'}
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
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">{editingId ? 'Edit Assistance' : 'Add New Assistance'}</h5>
			</div>
			<div class="card-body">
				<form on:submit={saveAssistance}>
					<div class="mb-3">
						<label for="personId" class="form-label fw-500">Person *</label>
						<select id="personId" class="form-select form-select-lg" bind:value={formData.personId} required>
							<option value="">-- Select Person --</option>
							{#each people as person}
								<option value={person.id}>{person.lastName}, {person.firstName}</option>
							{/each}
						</select>
					</div>

					<div class="row mb-4">
						<div class="col-md-4">
							<label for="type" class="form-label fw-500">Assistance Type *</label>
							<select id="type" class="form-select form-select-lg" bind:value={formData.type} required>
								<option value="AICS">AICS</option>
								<option value="4PS">4PS</option>
								<option value="MAIP">MAIP</option>
							</select>
						</div>
						<div class="col-md-4">
							<label for="date_disbursed" class="form-label fw-500">Date Disbursed *</label>
							<input 
								type="date" 
								id="date_disbursed" 
								class="form-control form-control-lg"
								bind:value={formData.date_disbursed}
								required
							/>
						</div>
						<div class="col-md-4">
							<label for="amount" class="form-label fw-500">Amount *</label>
							<input
								type="number"
								id="amount"
								class="form-control form-control-lg"
								bind:value={formData.amount}
								step="0.01"
								min="0"
								placeholder="0.00"
								required
							/>
						</div>
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

	<div class="card shadow-sm border-0" style="border-top: 4px solid #e74c3c;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<div class="d-flex justify-content-between align-items-center">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Assistances List ({filteredAssistances.length})</h5>
				<input
					type="text"
					placeholder="Search by name, type..."
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
					Loading assistances...
				</div>
			{:else if filteredAssistances.length === 0}
				<div class="text-center py-5 text-muted">
					<p class="mb-0 fs-5">No assistances found</p>
					<small class="text-muted">
						{searchQuery ? 'Try adjusting your search' : 'Add your first assistance to get started'}
					</small>
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover table-striped">
						<thead class="table-light">
							<tr>
								<th scope="col">Person</th>
								<th scope="col">Type</th>
								<th scope="col">Date Disbursed</th>
								<th scope="col">Amount</th>
								<th scope="col" class="text-center">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredAssistances as assistance}
								<tr>
									<td>{assistance.person?.lastName}, {assistance.person?.firstName}</td>
									<td>
										<span class="badge" class:bg-info={assistance.type === 'AICS'} class:bg-success={assistance.type === '4PS'} class:bg-warning={assistance.type === 'MAIP'} style="color: {assistance.type === 'MAIP' ? 'black' : 'white'}">
											{assistance.type}
										</span>
									</td>
									<td>{new Date(assistance.date_disbursed).toLocaleDateString('en-US')}</td>
									<td class="fw-bold">₱{parseFloat(assistance.amount).toFixed(2)}</td>
									<td class="text-center">
										<button on:click={() => editAssistance(assistance)} class="btn btn-sm btn-outline-primary me-1">
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
			{/if}
		</div>
	</div>
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>

