<script lang="ts">
	import { onMount } from 'svelte';

	interface Barangay {
		id: number;
		name: string;
		peopleCount: number;
	}

	interface Municipality {
		id: number;
		name: string;
		barangays: Barangay[];
	}

	let municipalities: Municipality[] = [];
	let loading = true;
	let error = '';
	let expandedMunicipalities: Set<number> = new Set();
	let retryCount = 0;
	const MAX_RETRIES = 3;

	async function loadMunicipalitiesWithCounts(isRetry: boolean = false) {
		try {
			loading = true;
			if (!isRetry) {
				error = '';
				retryCount = 0;
			}

			// Single API call to get all municipalities with barangays and people counts
			const res = await fetch('/api/people/stats');
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to load people statistics');
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || 'Failed to load people statistics');
			}

			municipalities = data.data.municipalities;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'An error occurred loading municipalities';
			console.error('Error loading municipalities:', e);
			
			// Retry logic for connection errors
			if (retryCount < MAX_RETRIES && errorMessage.includes('statistics')) {
				retryCount++;
				console.warn(`Retrying... (${retryCount}/${MAX_RETRIES})`);
				error = `Loading statistics... (attempt ${retryCount}/${MAX_RETRIES})`;
				// Wait before retrying (exponential backoff)
				await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 500));
				return loadMunicipalitiesWithCounts(true);
			}
			
			error = errorMessage;
		} finally {
			loading = false;
		}
	}

	function toggleMunicipality(munId: number) {
		if (expandedMunicipalities.has(munId)) {
			expandedMunicipalities.delete(munId);
		} else {
			expandedMunicipalities.add(munId);
		}
		expandedMunicipalities = expandedMunicipalities;
	}

	function handleAccordionClick(e: Event, munId: number) {
		e.preventDefault();
		toggleMunicipality(munId);
	}

	onMount(() => {
		loadMunicipalitiesWithCounts();
	});
</script>

<div class="card shadow-sm border-0" style="display: flex; flex-direction: column; height: 100%;">
	<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
		<div class="d-flex justify-content-between align-items-center">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50; font-size: 1.1rem;">👥 People by Location</h5>
			{#if !loading && municipalities.length > 0}
				<span class="badge" style="background-color: #3498db; color: white;">
					{municipalities.reduce((sum, m) => sum + m.barangays.reduce((bSum, b) => bSum + b.peopleCount, 0), 0)} total
				</span>
			{/if}
		</div>
	</div>

	<div class="card-body p-0 d-flex flex-column flex-grow-1" style="overflow-y: auto;">
		{#if loading}
			<div class="text-center text-muted py-4">
				<div class="spinner-border spinner-border-sm me-2" role="status">
					<span class="visually-hidden">Loading...</span>
				</div>
				Loading people statistics...
			</div>
		{:else if error}
			<div class="alert alert-danger mb-0 m-3">
				<div>{error}</div>
				<button 
					class="btn btn-sm btn-outline-danger mt-2"
					on:click={() => loadMunicipalitiesWithCounts()}
				>
					🔄 Try Again
				</button>
			</div>
		{:else if municipalities.length === 0}
			<div class="text-center text-muted py-4">No municipalities found</div>
		{:else}
			<div class="list-group list-group-flush">
				{#each municipalities as municipality (municipality.id)}
					<div style="border-bottom: 1px solid #ecf0f1;">
						<button
							on:click={() => toggleMunicipality(municipality.id)}
							style="
								width: 100%;
								text-align: left;
								padding: 0.75rem 1rem;
								border: none;
								background-color: {expandedMunicipalities.has(municipality.id) ? '#e7f1ff' : 'transparent'};
								cursor: pointer;
								display: flex;
								justify-content: space-between;
								align-items: center;
								transition: background-color 0.2s;
							"
							on:mouseenter={(e) => {
								if (!expandedMunicipalities.has(municipality.id)) {
									e.currentTarget.style.backgroundColor = '#f8f9fa';
								}
							}}
							on:mouseleave={(e) => {
								if (!expandedMunicipalities.has(municipality.id)) {
									e.currentTarget.style.backgroundColor = 'transparent';
								}
							}}
						>
							<div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
								<span style="color: {expandedMunicipalities.has(municipality.id) ? '#3498db' : '#7f8c8d'}; transition: color 0.2s; font-size: 0.75rem;">
									{expandedMunicipalities.has(municipality.id) ? '▼' : '▶'}
								</span>
								<span style="color: #2c3e50; font-weight: 500;">{municipality.name}</span>
							</div>
							<span class="badge bg-info">
								{municipality.barangays.reduce((sum, b) => sum + b.peopleCount, 0)}
							</span>
						</button>

						{#if expandedMunicipalities.has(municipality.id)}
							<div style="background-color: #f8f9fa; border-top: 1px solid #ecf0f1;">
							{#each municipality.barangays as barangay (barangay.id)}
								<div
									role="button"
									tabindex="0"
									style="
										display: flex;
										justify-content: space-between;
										align-items: center;
										padding: 0.5rem 1rem 0.5rem 2.5rem;
										border-bottom: 1px solid #ecf0f1;
										border-left: 3px solid #3498db;
										background-color: transparent;
										transition: background-color 0.2s;
									"
									on:mouseenter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
									on:mouseleave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
								>
									<span style="color: #2c3e50; font-size: 0.95rem;">{barangay.name}</span>
									<span class="badge bg-success">{barangay.peopleCount}</span>
								</div>
							{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.badge.bg-info) {
		background-color: #3498db !important;
		color: white !important;
	}

	:global(.badge.bg-success) {
		background-color: #27ae60 !important;
		color: white !important;
	}
</style>
