<script lang="ts">
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';

	let localities: any[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await fetchLocalities();

		// Listen for locality click events from map
		window.addEventListener('localityClick', handleLocalityClick as EventListener);

		return () => {
			window.removeEventListener('localityClick', handleLocalityClick as EventListener);
		};
	});

	async function fetchLocalities() {
		try {
			loading = true;
			// Fetch Siquijor barangays specifically
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
		} finally {
			loading = false;
		}
	}

	function handleLocalityClick(event: CustomEvent) {
		console.log('Locality clicked:', event.detail);
		// You can add more functionality here, like showing a detail panel
	}
</script>

<svelte:head>
	<title>Barangay Mapping System</title>
</svelte:head>

<div class="container">
	<header>
		<div class="header-content">
			<div>
				<h1>Barangay Mapping System</h1>
				<p>Siquijor Province - Barangay Boundaries and Voter Data</p>
			</div>
			<nav>
				<a href="/admin">Admin Panel →</a>
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
			<div class="map-section">
				<div class="stats">
					<div class="stat-card">
						<h3>{localities.length}</h3>
						<p>Siquijor Barangays</p>
					</div>
				</div>

				<div class="map-wrapper">
					<Map {localities} center={[9.2, 123.5]} zoom={11} />
				</div>
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
		max-width: 1400px;
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
		font-size: 1.1rem;
	}

	nav a {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		transition: background 0.2s;
		font-weight: 500;
	}

	nav a:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	main {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.loading,
	.error {
		text-align: center;
		padding: 3rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.error button {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.error button:hover {
		background: #5568d3;
	}

	.map-section {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.stats {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}

	.stat-card {
		flex: 1;
		text-align: center;
		padding: 1rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.stat-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		color: #667eea;
		font-weight: 600;
	}

	.stat-card p {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	.map-wrapper {
		height: 600px;
	}
</style>

