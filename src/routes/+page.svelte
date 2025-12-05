<script lang="ts">
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';

	let localities: any[] = [];
	let contests: any[] = [];
	let electionResults: any = null;
	
	let selectedContestId: number | null = null;
	
	let loading = true;
	let loadingResults = false;
	let error = '';

	onMount(async () => {
		await Promise.all([
			fetchLocalities(),
			fetchContests()
		]);
		loading = false;

		window.addEventListener('localityClick', handleLocalityClick as EventListener);
		return () => {
			window.removeEventListener('localityClick', handleLocalityClick as EventListener);
		};
	});

	async function fetchLocalities() {
		try {
			const response = await fetch('/api/localities/siquijor');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.details || 'Failed to fetch localities');
			}
			localities = await response.json();
			console.log(`Loaded ${localities.length} Siquijor barangays`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
			console.error('Error fetching localities:', e);
		}
	}

	async function fetchContests() {
		try {
			const response = await fetch('/api/elections/contests');
			if (!response.ok) return;
			contests = await response.json();
		} catch (e) {
			console.error('Error fetching contests:', e);
		}
	}

	async function fetchResults() {
		if (!selectedContestId) {
			electionResults = null;
			return;
		}
		
		try {
			loadingResults = true;
			const response = await fetch(`/api/elections/results/map?contestId=${selectedContestId}`);
			if (!response.ok) throw new Error('Failed to fetch results');
			electionResults = await response.json();
		} catch (e) {
			console.error('Error fetching results:', e);
		} finally {
			loadingResults = false;
		}
	}

	function handleContestChange() {
		fetchResults();
	}

	function handleLocalityClick(event: CustomEvent) {
		console.log('Locality clicked:', event.detail);
	}

	// Group contests by position
	$: groupedContests = contests.reduce((acc, contest) => {
		const key = contest.position;
		if (!acc[key]) acc[key] = [];
		acc[key].push(contest);
		return acc;
	}, {} as Record<string, any[]>);

	// Get color for a locality based on election results
	function getLocalityColor(localityId: number): string | null {
		if (!electionResults?.results?.[localityId]) return null;
		return electionResults.results[localityId].winnerColor;
	}

	// Build color map for the Map component
	$: colorMap = electionResults ? 
		Object.fromEntries(
			Object.entries(electionResults.results || {}).map(([id, result]: [string, any]) => [
				parseInt(id), 
				result.winnerColor
			])
		) : {};
</script>

<svelte:head>
	<title>Siquijor Election Map</title>
</svelte:head>

<div class="container">
	<header>
		<div class="header-content">
			<div>
				<h1>Siquijor Election Map</h1>
				<p>Barangay-level election results visualization</p>
			</div>
			<nav>
				<a href="/admin">Admin Panel</a>
			</nav>
		</div>
	</header>

	<main>
		{#if loading}
			<div class="loading">
				<p>Loading map data...</p>
			</div>
		{:else if error}
			<div class="error">
				<p>Error: {error}</p>
				<button on:click={fetchLocalities}>Retry</button>
			</div>
		{:else}
			<div class="content-layout">
				<!-- Controls Panel -->
				<aside class="controls-panel">
					<div class="control-section">
						<h3>Position</h3>
						<select 
							bind:value={selectedContestId} 
							on:change={handleContestChange}
							class="position-select"
						>
							<option value={null}>-- Select position --</option>
							{#each Object.entries(groupedContests) as [position, positionContests]}
								<optgroup label={position}>
									{#each positionContests as contest}
										<option value={contest.id}>
											{contest.jurisdiction || contest.name}
										</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>

					<!-- Legend -->
					{#if electionResults?.candidates && electionResults.candidates.length > 0}
						<div class="legend-section">
							<h3>Results</h3>
							<div class="legend-list">
								{#each electionResults.candidates.slice(0, 8) as candidate, i}
									<div class="legend-item" class:winner={i === 0}>
										<span class="color-swatch" style="background: {candidate.color}"></span>
										<div class="candidate-details">
											<span class="name">{candidate.name}</span>
											{#if candidate.party}
												<span class="party">{candidate.party}</span>
											{/if}
											<span class="votes">{candidate.totalVotes.toLocaleString()} votes</span>
										</div>
									</div>
								{/each}
								{#if electionResults.candidates.length > 8}
									<p class="more">+{electionResults.candidates.length - 8} more</p>
								{/if}
							</div>
						</div>
					{:else if selectedContestId && !loadingResults}
						<div class="no-results">
							<p>No results available for this position</p>
						</div>
					{/if}

					<!-- Stats -->
					<div class="stats-section">
						<div class="stat">
							<span class="stat-value">{localities.length}</span>
							<span class="stat-label">Barangays</span>
						</div>
						{#if electionResults}
							<div class="stat">
								<span class="stat-value">{Object.keys(electionResults.results || {}).length}</span>
								<span class="stat-label">With Results</span>
							</div>
						{/if}
					</div>
				</aside>

				<!-- Map -->
				<div class="map-section">
					{#if loadingResults}
						<div class="map-overlay">
							<p>Loading results...</p>
						</div>
					{/if}
					<Map 
						{localities} 
						center={[9.2, 123.5]} 
						zoom={11}
						{colorMap}
						{electionResults}
					/>
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
		background: #0f0f23;
	}

	.container {
		min-height: 100vh;
	}

	header {
		background: linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 100%);
		color: white;
		padding: 1.25rem 2rem;
		border-bottom: 1px solid rgba(255,255,255,0.1);
	}

	.header-content {
		max-width: 1600px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		background: linear-gradient(90deg, #fff, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	header p {
		margin: 0.25rem 0 0 0;
		opacity: 0.7;
		font-size: 0.875rem;
	}

	nav a {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid rgba(255,255,255,0.2);
		border-radius: 6px;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	nav a:hover {
		background: rgba(255,255,255,0.1);
		border-color: rgba(255,255,255,0.3);
	}

	main {
		padding: 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	.loading, .error {
		text-align: center;
		padding: 3rem;
		background: #1a1a3e;
		border-radius: 12px;
		color: white;
	}

	.error button {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		background: #7c3aed;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.content-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		height: calc(100vh - 140px);
	}

	.controls-panel {
		background: #1a1a3e;
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		overflow-y: auto;
	}

	.control-section h3, .legend-section h3, .stats-section h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: #a78bfa;
	}

	.position-select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px;
		background: #0f0f23;
		color: white;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.position-select:focus {
		outline: none;
		border-color: #7c3aed;
	}

	.position-select option, .position-select optgroup {
		background: #1a1a3e;
	}

	.legend-section {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.legend-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.legend-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 6px;
		background: rgba(255,255,255,0.03);
	}

	.legend-item.winner {
		background: rgba(167, 139, 250, 0.15);
		border: 1px solid rgba(167, 139, 250, 0.3);
	}

	.color-swatch {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.candidate-details {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		color: white;
	}

	.candidate-details .name {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.candidate-details .party {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.5);
	}

	.candidate-details .votes {
		font-size: 0.75rem;
		color: #a78bfa;
	}

	.more {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.4);
		margin: 0.5rem 0 0 0;
	}

	.no-results {
		color: rgba(255,255,255,0.5);
		font-size: 0.875rem;
		font-style: italic;
	}

	.stats-section {
		display: flex;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255,255,255,0.1);
	}

	.stat {
		flex: 1;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 600;
		color: #7c3aed;
	}

	.stat-label {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.5);
		text-transform: uppercase;
	}

	.map-section {
		position: relative;
		background: #1a1a3e;
		border-radius: 12px;
		overflow: hidden;
	}

	.map-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(15, 15, 35, 0.9);
		padding: 1rem 2rem;
		border-radius: 8px;
		color: white;
		z-index: 1000;
	}

	@media (max-width: 900px) {
		.content-layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.controls-panel {
			order: 2;
		}

		.map-section {
			order: 1;
			height: 400px;
		}
	}
</style>
