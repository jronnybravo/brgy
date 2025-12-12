<script lang="ts">
	import PeopleCountAccordion from '$lib/components/PeopleCountAccordion.svelte';
	import ElectionResultsMap from '$lib/components/ElectionResultsMap.svelte';

	interface PageData {
		user: {
			id: number;
			username: string;
			role: string;
		};
	}

	export let data: PageData;
</script>

<div class="dashboard">
	<div class="header">
		<h1>Dashboard</h1>
		<p>Welcome back, {data.user.username}!</p>
	</div>

	<div class="columns">
		<!-- Left Column: People Statistics -->
		<div class="column people-stats">
			<PeopleCountAccordion />
		</div>

		<!-- Right Column: Election Results Map -->
		<div class="column map-section">
			<ElectionResultsMap />
		</div>
	</div>
</div>

<style>
	.dashboard {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.header {
		margin-bottom: 1.5rem;
	}

	.header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		background: linear-gradient(90deg, #fff, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header p {
		margin: 0;
		color: rgba(255, 255, 255, 0.6);
	}

	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		flex: 1;
		min-height: 0;
	}

	.column {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.people-stats {
		border-right: 1px solid rgba(167, 139, 250, 0.2);
		padding-right: 2rem;
	}

	.map-section {
		padding-left: 2rem;
	}

	@media (max-width: 1200px) {
		.columns {
			grid-template-columns: 1fr;
		}

		.people-stats {
			border-right: none;
			padding-right: 0;
		}

		.map-section {
			padding-left: 0;
		}
	}


</style>
