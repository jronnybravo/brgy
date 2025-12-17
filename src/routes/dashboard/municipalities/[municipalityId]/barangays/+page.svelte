<script lang="ts">
	import { goto } from '$app/navigation';

	interface Municipality {
		id: number;
		name: string;
		type: string;
	}

	interface Barangay {
		id: number;
		name: string;
		type: string;
		population: number;
		peopleCount: number;
		financialAssistanceCount: number;
		medicineAssistanceCount: number;
		totalFinancialAssistance: number;
	}

	interface PageData {
		municipality: Municipality;
		barangays: Barangay[];
	}

	export let data: PageData;

	let sortBy: 'name' | 'people' | 'assistance' = 'name';

	$: sortedBarangays = [...data.barangays].sort((a, b) => {
		switch (sortBy) {
			case 'people':
				return b.peopleCount - a.peopleCount;
			case 'assistance':
				return b.totalFinancialAssistance - a.totalFinancialAssistance;
			case 'name':
			default:
				return a.name.localeCompare(b.name);
		}
	});

	function navigateToBarangay(barangayId: number) {
		goto(`/dashboard/municipalities/${data.municipality.id}/barangays/${barangayId}`);
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(value);
	}
</script>

<div class="container-fluid p-4">
	<div class="mb-4">
		<button class="btn btn-outline-secondary mb-3" on:click={() => history.back()}>
			← Back
		</button>
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">
			Barangays in {data.municipality.name}
		</h1>
		<p class="lead" style="color: #7f8c8d;">Total: {data.barangays.length} barangays</p>
	</div>

	<!-- Sort Controls -->
	<div class="mb-4">
		<div class="btn-group" role="group" aria-label="Sort options">
			<input
				type="radio"
				class="btn-check"
				name="sortBy"
				id="sortName"
				value="name"
				bind:group={sortBy}
			/>
			<label class="btn btn-outline-primary" for="sortName">By Name</label>

			<input
				type="radio"
				class="btn-check"
				name="sortBy"
				id="sortPeople"
				value="people"
				bind:group={sortBy}
			/>
			<label class="btn btn-outline-primary" for="sortPeople">By Population</label>

			<input
				type="radio"
				class="btn-check"
				name="sortBy"
				id="sortAssistance"
				value="assistance"
				bind:group={sortBy}
			/>
			<label class="btn btn-outline-primary" for="sortAssistance">By Financial Aid</label>
		</div>
	</div>

	{#if data.barangays.length === 0}
		<div class="alert alert-info" role="alert">
			No barangays found in this municipality.
		</div>
	{:else}
		<div class="row g-4">
			{#each sortedBarangays as barangay (barangay.id)}
				<div class="col-md-6 col-lg-4">
					<div
						class="card h-100 shadow-sm border-0 cursor-pointer barangay-card"
						on:click={() => navigateToBarangay(barangay.id)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') navigateToBarangay(barangay.id);
						}}
						role="button"
						tabindex="0"
					>
						<div class="card-header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none;">
							<h5 class="card-title mb-1">{barangay.name}</h5>
							{#if barangay.type}
								<small style="opacity: 0.9;">{barangay.type}</small>
							{/if}
						</div>
						<div class="card-body">
							<div class="row g-3">
								<div class="col-6">
									<div class="stat-box">
										<div class="stat-value">{barangay.peopleCount.toLocaleString()}</div>
										<div class="stat-label">People</div>
									</div>
								</div>
								<div class="col-6">
									<div class="stat-box">
										<div class="stat-value" style="color: #27ae60;">{barangay.financialAssistanceCount}</div>
										<div class="stat-label">Financial Aid</div>
									</div>
								</div>
								<div class="col-6">
									<div class="stat-box">
										<div class="stat-value" style="color: #3498db;">{barangay.medicineAssistanceCount}</div>
										<div class="stat-label">Medicine Aid</div>
									</div>
								</div>
								<div class="col-6">
									<div class="stat-box" style="background-color: #f0f8ff;">
										<div class="stat-value" style="font-size: 1rem; color: #e74c3c;">
											{formatCurrency(barangay.totalFinancialAssistance)}
										</div>
										<div class="stat-label" style="font-size: 0.7rem;">Total Aid</div>
									</div>
								</div>
							</div>
						</div>
						<div class="card-footer" style="background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
							<small class="text-muted">Click to view details →</small>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
		min-height: 100vh;
	}

	:global(.barangay-card:hover) {
		transform: translateY(-5px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
	}

	.stat-box {
		text-align: center;
		padding: 1rem;
		background-color: #f8f9fa;
		border-radius: 8px;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #2c3e50;
	}

	.stat-label {
		font-size: 0.85rem;
		color: #7f8c8d;
		margin-top: 0.25rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	:global(.card) {
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.3s ease;
	}
</style>
