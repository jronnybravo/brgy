<script lang="ts">
	import { onMount } from 'svelte';

	let localities: any[] = [];
	let loading = true;
	let error = '';
	let showForm = false;
	let editingId: number | null = null;

	// Form fields
	let formData = {
		name: '',
		code: '',
		type: 'barangay',
		population: '',
		boundaryGeoJSON: ''
	};

	onMount(async () => {
		await fetchLocalities();
	});

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

	function resetForm() {
		formData = {
			name: '',
			code: '',
			type: 'barangay',
			population: '',
			boundaryGeoJSON: ''
		};
		editingId = null;
		showForm = false;
	}

	function handleNew() {
		resetForm();
		showForm = true;
	}

	function handleEdit(locality: any) {
		formData = {
			name: locality.name,
			code: locality.code || '',
			type: locality.type || 'barangay',
			population: locality.population?.toString() || '',
			boundaryGeoJSON: JSON.stringify(locality.boundaryGeoJSON, null, 2)
		};
		editingId = locality.id;
		showForm = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		try {
			// Parse and validate GeoJSON
			let parsedGeoJSON;
			try {
				parsedGeoJSON = JSON.parse(formData.boundaryGeoJSON);
			} catch {
				alert('Invalid GeoJSON format');
				return;
			}

			const data = {
				name: formData.name,
				code: formData.code || undefined,
				type: formData.type,
				population: formData.population ? parseInt(formData.population) : undefined,
				boundaryGeoJSON: parsedGeoJSON
			};

			const url = editingId ? `/api/localities/${editingId}` : '/api/localities';
			const method = editingId ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save locality');
			}

			alert(editingId ? 'Locality updated successfully!' : 'Locality created successfully!');
			resetForm();
			await fetchLocalities();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to save locality');
		}
	}

	async function handleDelete(id: number, name: string) {
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
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to delete locality');
		}
	}

	function loadSampleGeoJSON() {
		formData.boundaryGeoJSON = JSON.stringify(
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
</script>

<svelte:head>
	<title>Admin - Barangay Mapping System</title>
</svelte:head>

<div class="container">
	<header>
		<div class="header-content">
			<div>
				<h1>Admin Panel</h1>
				<p>Manage localities and boundaries</p>
			</div>
			<nav>
				<a href="/">← Back to Map</a>
			</nav>
		</div>
	</header>

	<main>
		<div class="actions">
			<button on:click={handleNew} class="btn btn-primary">+ Add New Locality</button>
		</div>

		{#if showForm}
			<div class="form-container">
				<div class="form-header">
					<h2>{editingId ? 'Edit Locality' : 'Add New Locality'}</h2>
					<button on:click={resetForm} class="btn-close">✕</button>
				</div>

				<form on:submit={handleSubmit}>
					<div class="form-row">
						<div class="form-group">
							<label for="name">Name *</label>
							<input
								id="name"
								type="text"
								bind:value={formData.name}
								required
								placeholder="e.g., Barangay San Antonio"
							/>
						</div>

						<div class="form-group">
							<label for="code">Code</label>
							<input
								id="code"
								type="text"
								bind:value={formData.code}
								placeholder="e.g., BRG-001"
							/>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="type">Type</label>
							<select id="type" bind:value={formData.type}>
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
								bind:value={formData.population}
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
							bind:value={formData.boundaryGeoJSON}
							rows="10"
							required
							placeholder='{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],...]]}'
						></textarea>
						<small
							>Must be a valid GeoJSON Polygon. Coordinates in [longitude, latitude] format.</small
						>
					</div>

					<div class="form-actions">
						<button type="button" on:click={resetForm} class="btn">Cancel</button>
						<button type="submit" class="btn btn-primary">
							{editingId ? 'Update' : 'Create'} Locality
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
									<button on:click={() => handleEdit(locality)} class="btn-small">Edit</button>
									<button
										on:click={() => handleDelete(locality.id, locality.name)}
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
	}

	table {
		width: 100%;
		border-collapse: collapse;
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
	}
</style>

