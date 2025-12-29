<script lang="ts">
	import FinancialAssistanceTable from '$lib/components/FinancialAssistanceTable.svelte';
	import MedicineAssistanceTable from '$lib/components/MedicineAssistanceTable.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const capabilities = $derived(data.capabilities as {
		canCreateAssistances: boolean;
		canUpdateAssistances: boolean;
		canDeleteAssistances: boolean;
	});
	const towns = $derived(data.towns || []);

	let activeTab: 'financial' | 'medicine' = $state('financial');

	function switchTab(tab: 'financial' | 'medicine') {
		activeTab = tab;
	}
</script>

<div class="container-fluid p-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">Assistances Management</h1>
	</div>

	<div class="card shadow-sm border-0" style="border-top: 4px solid #e74c3c;">
		<div class="card-header" style="background-color: transparent; border-bottom: none; padding: 0;">
			<ul class="nav nav-tabs" role="tablist">
				<li class="nav-item" role="presentation">
					<button
						onclick={() => switchTab('financial')}
						class="nav-link"
						class:active={activeTab === 'financial'}
						id="financial-tab"
						role="tab"
						aria-controls="financial-content"
						aria-selected={activeTab === 'financial'}
						type="button"
						style="border: none; background: none; cursor: pointer;"
					>
						💰 Financial Assistances
					</button>
				</li>
				<li class="nav-item" role="presentation">
					<button
						onclick={() => switchTab('medicine')}
						class="nav-link"
						class:active={activeTab === 'medicine'}
						id="medicine-tab"
						role="tab"
						aria-controls="medicine-content"
						aria-selected={activeTab === 'medicine'}
						type="button"
						style="border: none; background: none; cursor: pointer;"
					>
						💊 Medicine Assistances
					</button>
				</li>
			</ul>
		</div>
		<div class="card-body">
			{#if activeTab === 'financial'}
				<FinancialAssistanceTable {capabilities} />
			{:else if activeTab === 'medicine'}
				<MedicineAssistanceTable {capabilities} />
			{/if}
		</div>
	</div>
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>
