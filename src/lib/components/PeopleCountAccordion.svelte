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

	async function loadMunicipalitiesWithCounts() {
		try {
			loading = true;
			error = '';

			// Single API call to get all municipalities with barangays and people counts
			const res = await fetch('/api/people/stats');
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to load people statistics');
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || 'Failed to load people statistics');
			}

			municipalities = data.data.municipalities;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred loading municipalities';
			console.error('Error loading municipalities:', e);
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

	onMount(() => {
		loadMunicipalitiesWithCounts();
	});
</script>

	<div class="people-count-section">
		<div class="section-header">
			<h2>👥 People by Location</h2>
			{#if !loading && municipalities.length > 0}
				<span class="total-badge">
					{municipalities.reduce((sum, m) => sum + m.barangays.reduce((bSum, b) => bSum + b.peopleCount, 0), 0)} total
				</span>
			{/if}
		</div>

		{#if loading}
			<div class="loading">Loading people statistics...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if municipalities.length === 0}
			<div class="empty-state">No municipalities found</div>
		{:else}
			<div class="accordion">
				{#each municipalities as municipality (municipality.id)}
					<div class="accordion-item">
						<button
							class="accordion-header"
							class:expanded={expandedMunicipalities.has(municipality.id)}
							on:click={() => toggleMunicipality(municipality.id)}
						>
							<span class="accordion-toggle">
								<svg
									class="chevron"
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M7 8L10 11L13 8"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							<span class="municipality-name">{municipality.name}</span>
							<span class="municipality-count">
								{municipality.barangays.reduce((sum, b) => sum + b.peopleCount, 0)}
							</span>
						</button>

						{#if expandedMunicipalities.has(municipality.id)}
							<div class="accordion-panel">
								<div class="barangays-list">
									{#each municipality.barangays as barangay (barangay.id)}
										<div class="barangay-item">
											<span class="barangay-name">{barangay.name}</span>
											<span class="barangay-count">{barangay.peopleCount}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div><style>
	.people-count-section {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.3rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.total-badge {
		background: linear-gradient(90deg, #a78bfa, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.accordion {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.accordion-item {
		background: linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%);
		border: 1px solid rgba(167, 139, 250, 0.2);
		border-radius: 8px;
		overflow: hidden;
	}

	.accordion-header {
		width: 100%;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(167, 139, 250, 0.05);
		border: none;
		border-bottom: 1px solid rgba(167, 139, 250, 0.2);
		cursor: pointer;
		color: #a78bfa;
		font-weight: 600;
		font-size: 1rem;
		transition: all 0.2s ease;
	}

	.accordion-header:hover {
		background: rgba(167, 139, 250, 0.1);
	}

	.accordion-header.expanded {
		border-bottom: none;
	}

	.accordion-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.chevron {
		transition: transform 0.2s ease;
	}

	.accordion-header.expanded .chevron {
		transform: rotate(180deg);
	}

	.municipality-name {
		flex: 1;
		text-align: left;
	}

	.municipality-count {
		background: rgba(167, 139, 250, 0.3);
		padding: 0.3rem 0.8rem;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		flex-shrink: 0;
	}

	.accordion-panel {
		padding: 0.5rem 0;
		background: rgba(167, 139, 250, 0.02);
	}

	.barangays-list {
		padding: 0;
	}

	.barangay-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid rgba(167, 139, 250, 0.1);
		font-size: 0.9rem;
	}

	.barangay-item:last-child {
		border-bottom: none;
	}

	.barangay-name {
		color: rgba(255, 255, 255, 0.7);
	}

	.barangay-count {
		background: rgba(236, 72, 153, 0.2);
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		color: #ec4899;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.loading,
	.error,
	.empty-state {
		padding: 2rem;
		text-align: center;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.6);
	}

	.error {
		color: #ff6b6b;
		background: rgba(239, 68, 68, 0.1);
	}
</style>
