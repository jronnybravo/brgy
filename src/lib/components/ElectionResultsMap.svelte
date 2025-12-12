<script lang="ts">
	import { onMount } from 'svelte';
	import Map from './Map.svelte';

	interface Locality {
		id: number;
		name: string;
		code: string;
		type: string;
		boundaryGeoJSON: any;
		centroidLat: number;
		centroidLng: number;
		population: number;
		parentId: number;
	}

	interface Contest {
		id: number;
		name: string;
		position: string;
		scope: string;
		jurisdiction: string;
		electionId: number;
	}

	let localities: Locality[] = [];
	let contests: Contest[] = [];
	let electionResults: any = null;
	let colorMap: Record<number, string> = {};
	let loading = true;
	let error = '';

	async function loadElectionData() {
		try {
			loading = true;
			error = '';

			// Fetch Siquijor barangays with GeoJSON for the map (optimized endpoint)
			const localitiesRes = await fetch('/api/localities/siquijor/map');
			if (!localitiesRes.ok) {
				const errorData = await localitiesRes.json();
				throw new Error(errorData.details || 'Failed to fetch map data');
			}
			localities = await localitiesRes.json();

			// Fetch election results for contest ID 4 (Governor position)
			const resultsRes = await fetch('/api/elections/results/map?contestId=4');
			if (!resultsRes.ok) {
				console.warn('Failed to fetch election results');
			} else {
				electionResults = await resultsRes.json();
				
				// Build color map: localityId -> winner color
				if (electionResults?.results) {
					for (const [localityId, result] of Object.entries(electionResults.results)) {
						const lId = parseInt(localityId);
						colorMap[lId] = (result as any).winnerColor || '#6366f1';
					}
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred loading election data';
			console.error('Error loading election data:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadElectionData();
	});
</script>

<div class="election-results-section">
	<div class="section-header">
		<h2>🗳️ Election Results</h2>
		<p class="subtitle">Governor Position</p>
	</div>

	{#if loading}
		<div class="loading">Loading election map...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div class="map-wrapper">
			{#if electionResults?.candidates && electionResults.candidates.length > 0}
				<div class="legend">
					<h3>Candidates</h3>
					<div class="legend-items">
						{#each electionResults.candidates as candidate}
							<div class="legend-item">
								<div class="legend-color" style="background-color: {candidate.color}"></div>
								<div class="legend-text">
									<div class="candidate-name">{candidate.name}</div>
									<div class="candidate-votes">{candidate.totalVotes.toLocaleString()} votes</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			<div class="map-container">
				<Map {localities} {electionResults} {colorMap} />
			</div>
		</div>
	{/if}
</div>

<style>
	.election-results-section {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.3rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.map-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex: 1;
		min-height: 0;
	}

	.map-container {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
	}

	.legend {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.legend h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 600;
	}

	.legend-items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		transition: background-color 0.2s;
	}

	.legend-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.legend-color {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.legend-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.candidate-name {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.candidate-votes {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.loading,
	.error {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.6);
		min-height: 300px;
	}

	.error {
		color: #ff6b6b;
		background: rgba(239, 68, 68, 0.1);
	}
</style>
