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
	let assistanceData: any = null;
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

			// Fetch assistance disbursement data
			const assistanceRes = await fetch('/api/assistances/map');
			if (!assistanceRes.ok) {
				console.warn('Failed to fetch assistance data');
			} else {
				const result = await assistanceRes.json();
				assistanceData = result.data || result;
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

<div class="card shadow-sm border-0" style="display: flex; flex-direction: column;">
	<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
		<h5 class="mb-0 fw-bold" style="color: #2c3e50; font-size: 1.1rem;">🗳️ Election Results</h5>
		<small style="color: #7f8c8d;">Governor Position</small>
	</div>

	<div class="card-body p-0 d-flex flex-column" style="overflow: hidden;">
		{#if loading}
			<div class="d-flex align-items-center justify-content-center p-5">
				<div class="text-center">
					<div class="spinner-border text-primary mb-3" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					<p class="text-muted">Loading election map...</p>
				</div>
			</div>
		{:else if error}
			<div class="alert alert-danger m-3 mb-0">{error}</div>
		{:else}
			<div class="d-flex flex-column gap-3 p-3" style="overflow: auto;">
				{#if electionResults?.candidates && electionResults.candidates.length > 0}
					<div class="card border-0" style="background-color: #f8f9fa;">
						<div class="card-body p-3">
							<h6 class="card-title fw-bold mb-2" style="color: #2c3e50;">Candidates</h6>
							<div class="d-flex flex-wrap gap-2">
								{#each electionResults.candidates as candidate}
									<div class="badge p-2" style="background-color: {candidate.color}; color: white;">
										<div style="font-size: 0.8rem; font-weight: 600;">{candidate.name}</div>
										<div style="font-size: 0.75rem; opacity: 0.9;">{candidate.totalVotes.toLocaleString()} votes</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
				<div style="border-radius: 8px; overflow: hidden; border: 1px solid #ecf0f1;">
					<Map {localities} {electionResults} {colorMap} {assistanceData} />
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.badge) {
		display: inline-flex !important;
		flex-direction: column !important;
		align-items: center !important;
		text-align: center !important;
		padding: 0.5rem !important;
		border-radius: 6px !important;
	}
</style>
