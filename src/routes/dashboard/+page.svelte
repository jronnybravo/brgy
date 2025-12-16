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

<div class="container-fluid p-4">
	<div class="mb-5">
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">Dashboard</h1>
		<p class="lead" style="color: #7f8c8d; margin-top: 0.5rem;">Welcome back, <strong style="color: #2c3e50;">{data.user.username}</strong>!</p>
	</div>

	<div class="row g-4">
		<!-- Left Column: People Statistics -->
		<div class="col-lg-6">
			<PeopleCountAccordion />
		</div>

		<!-- Right Column: Election Results Map -->
		<div class="col-lg-6">
			<ElectionResultsMap />
		</div>
	</div>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
