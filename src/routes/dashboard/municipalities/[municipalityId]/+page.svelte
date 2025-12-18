<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import type { ChartConfiguration } from 'chart.js/auto';

	interface Municipality {
		id: number;
		name: string;
		type: string;
		population: number;
	}

	interface Barangay {
		id: number;
		name: string;
		type: string;
		population: number;
	}

	interface PageData {
		municipality: Municipality;
		barangays: Barangay[];
		peopleCount: number;
		financialAssistances: any[];
		medicineAssistances: any[];
		totalFinancialAssistance: number;
		totalMedicineAssistances: number;
		assistanceByType: Record<string, number>;
		assistanceByMonth: Record<string, number>;
		financialByBarangay?: Record<string, number>;
		medicineByBarangay?: Record<string, number>;
		supporterDistribution?: Record<string, number>;
	}

	export let data: PageData;

	let chartContainers = {
		financialBarangay: null as HTMLCanvasElement | null,
		medicineBarangay: null as HTMLCanvasElement | null,
		assistanceTypes: null as HTMLCanvasElement | null,
		medicines: null as HTMLCanvasElement | null,
		supporter: null as HTMLCanvasElement | null
	};

	let charts: Record<string, Chart> = {};

	const COLORS = [
		'#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
		'#fa709a', '#fee140', '#30b0fe', '#a8edea', '#fed6e3',
		'#ff9ff3', '#54a0ff', '#48dbfb', '#0abde3', '#ee5a6f'
	];

	function navigateToBarangay(barangayId: number) {
		goto(`/dashboard/municipalities/${data.municipality.id}/barangays/${barangayId}`);
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(value);
	}

	function getColorArray(length: number): string[] {
		return Array.from({ length }, (_, i) => COLORS[i % COLORS.length]);
	}

	function createPieChart(
		canvasElement: HTMLCanvasElement,
		label: string,
		data: Record<string, number>
	) {
		if (charts[label]) {
			charts[label].destroy();
		}

		const labels = Object.keys(data);
		const values = Object.values(data);
		const backgroundColors = getColorArray(labels.length);

		const config: ChartConfiguration = {
			type: 'pie',
			data: {
				labels,
				datasets: [
					{
						data: values,
						backgroundColor: backgroundColors,
						borderColor: '#fff',
						borderWidth: 2
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							padding: 15,
							font: { size: 12 }
						}
					},
					tooltip: {
						callbacks: {
							label: function(context: any) {
								const label = context.label || '';
								const value = context.parsed || 0;
								const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
								const percentage = ((value / total) * 100).toFixed(1);
								return `${label}: ${value} (${percentage}%)`;
							}
						}
					}
				}
			}
		};

		charts[label] = new Chart(canvasElement, config);
	}

	function createBarChart(
		canvasElement: HTMLCanvasElement,
		label: string,
		data: Record<string, number>
	) {
		if (charts[label]) {
			charts[label].destroy();
		}

		const labels = Object.keys(data);
		const values = Object.values(data);
		const backgroundColors = getColorArray(labels.length);

		const config: ChartConfiguration = {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						data: values,
						backgroundColor: backgroundColors,
						borderColor: '#fff',
						borderWidth: 1
					}
				]
			},
			options: {
				indexAxis: 'y' as const,
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context: any) {
								return context.parsed.x.toLocaleString();
							}
						}
					}
				},
				scales: {
					x: {
						beginAtZero: true
					}
				}
			}
		};

		charts[label] = new Chart(canvasElement, config);
	}

	onMount(() => {
		// Create Financial Assistance by Barangay pie chart
		if (chartContainers.financialBarangay && data.financialByBarangay) {
			createPieChart(
				chartContainers.financialBarangay,
				'financialBarangay',
				data.financialByBarangay
			);
		}

		// Create Medicine Assistance by Barangay pie chart
		if (chartContainers.medicineBarangay && data.medicineByBarangay) {
			createPieChart(
				chartContainers.medicineBarangay,
				'medicineBarangay',
				data.medicineByBarangay
			);
		}

		// Create Financial Assistance Types bar chart
		if (chartContainers.assistanceTypes && data.assistanceByType) {
			createBarChart(
				chartContainers.assistanceTypes,
				'assistanceTypes',
				data.assistanceByType
			);
		}

		// Create Medicines bar chart (build from medicineAssistances data)
		if (chartContainers.medicines && data.medicineAssistances) {
			const medicineNames: Record<string, number> = {};
			data.medicineAssistances.forEach(ma => {
				const name = ma.medicine_name || 'Unknown';
				medicineNames[name] = (medicineNames[name] || 0) + 1;
			});
			if (Object.keys(medicineNames).length > 0) {
				createBarChart(
					chartContainers.medicines,
					'medicines',
					medicineNames
				);
			}
		}

		// Create Supporter Distribution pie chart
		if (chartContainers.supporter && data.supporterDistribution) {
			createPieChart(
				chartContainers.supporter,
				'supporter',
				data.supporterDistribution
			);
		}

		return () => {
			Object.values(charts).forEach(chart => chart?.destroy());
		};
	});

	// Table state
	let tableData: Barangay[] = [];
	let filteredData: Barangay[] = [];
	let searchQuery = '';
	let sortColumn = 'name';
	let sortDirection: 'asc' | 'desc' = 'asc';
	let currentPage = 1;
	const pageSize = 10;

	// Initialize table data
	$: {
		tableData = data.barangays || [];
		applyFiltersAndSort();
	}

	function applyFiltersAndSort() {
		// Apply search
		let filtered = tableData;
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(b =>
				b.name.toLowerCase().includes(query) ||
				b.type.toLowerCase().includes(query)
			);
		}

		// Apply sort
		filtered.sort((a, b) => {
			let aVal = a[sortColumn as keyof Barangay];
			let bVal = b[sortColumn as keyof Barangay];

			if (typeof aVal === 'string') {
				aVal = (aVal as string).toLowerCase();
				bVal = (bVal as string).toLowerCase();
			}

			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		filteredData = filtered;
		currentPage = 1;
	}

	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
		applyFiltersAndSort();
	}

	function handleSearch(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		applyFiltersAndSort();
	}

	$: paginatedData = filteredData.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize
	);
	$: totalPages = Math.ceil(filteredData.length / pageSize);
</script>

<div class="container-fluid p-4">
	<div class="mb-4">
		<button class="btn btn-outline-secondary mb-3" on:click={() => history.back()}>
			← Back
		</button>
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">
			{data.municipality.name}
		</h1>
		{#if data.municipality.type}
			<p class="lead" style="color: #7f8c8d;">
				{data.municipality.type}
				{#if data.peopleCount !== undefined}
					• Recorded People: {data.peopleCount.toLocaleString()}
				{/if}
			</p>
		{/if}
	</div>

	<!-- Barangays Table -->
	<div class="card mb-5 shadow-sm border-0">
		<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
			<div class="row align-items-center">
				<div class="col-md-8">
					<h5 class="mb-0">📍 Barangays Overview</h5>
				</div>
				<div class="col-md-4">
					<input
						type="text"
						class="form-control form-control-sm"
						placeholder="Search barangays..."
						value={searchQuery}
						on:input={handleSearch}
						style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
					/>
				</div>
			</div>
		</div>
		<div class="table-responsive">
			<table class="table table-hover mb-0">
				<thead class="table-light">
					<tr>
						<th 
							style="cursor: pointer;"
							class:fw-bold={sortColumn === 'name'}
							on:click={() => handleSort('name')}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSort('name')}
						>
							Barangay
							{#if sortColumn === 'name'}
								<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</th>
						<th 
							class="text-center"
							style="cursor: pointer;"
							class:fw-bold={sortColumn === 'type'}
							on:click={() => handleSort('type')}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSort('type')}
						>
							Type
							{#if sortColumn === 'type'}
								<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</th>
						<th 
							class="text-end"
							style="cursor: pointer;"
							class:fw-bold={sortColumn === 'population'}
							on:click={() => handleSort('population')}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSort('population')}
						>
							Recorded People
							{#if sortColumn === 'population'}
								<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</th>
						<th class="text-end">Financial Aid (total)</th>
						<th class="text-center">Medicine Aid Records</th>
						<th class="text-center">Action</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedData as barangay (barangay.id)}
						<tr>
							<td class="fw-bold" style="color: #2c3e50;">{barangay.name}</td>
							<td class="text-center">
								<span class="badge" style="background-color: #3498db;">{barangay.type}</span>
							</td>
							<td class="text-end">{barangay.population?.toLocaleString() || 'N/A'}</td>						<td class="text-end">
							{#if data.financialByBarangay && data.financialByBarangay[barangay.name] > 0}
								<span class="badge bg-success">{formatCurrency(data.financialByBarangay[barangay.name])}</span>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>
						<td class="text-center">
							{#if data.medicineByBarangay && data.medicineByBarangay[barangay.name] > 0}
								<span class="badge bg-info">{data.medicineByBarangay[barangay.name]}</span>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>							<td class="text-center">
								<button
									class="btn btn-sm btn-primary"
									on:click={() => navigateToBarangay(barangay.id)}
								>
									View →
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="card-footer bg-light d-flex justify-content-between align-items-center">
			<div class="text-muted small">
				Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} ({tableData.length} total)
			</div>
			<nav aria-label="Table pagination">
				<ul class="pagination mb-0">
					<li class="page-item" class:disabled={currentPage === 1}>
						<button
							class="page-link"
							on:click={() => currentPage = 1}
							disabled={currentPage === 1}
						>
							First
						</button>
					</li>
					<li class="page-item" class:disabled={currentPage === 1}>
						<button
							class="page-link"
							on:click={() => currentPage = Math.max(1, currentPage - 1)}
							disabled={currentPage === 1}
						>
							Prev
						</button>
					</li>
					<li class="page-item active">
						<span class="page-link">
							Page {currentPage} of {totalPages || 1}
						</span>
					</li>
					<li class="page-item" class:disabled={currentPage === totalPages || totalPages === 0}>
						<button
							class="page-link"
							on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
							disabled={currentPage === totalPages || totalPages === 0}
						>
							Next
						</button>
					</li>
					<li class="page-item" class:disabled={currentPage === totalPages || totalPages === 0}>
						<button
							class="page-link"
							on:click={() => currentPage = totalPages}
							disabled={currentPage === totalPages || totalPages === 0}
						>
							Last
						</button>
					</li>
				</ul>
			</nav>
		</div>
	</div>

	<!-- Charts Row 1 -->
	<div class="row g-4 mb-5">
		<div class="col-lg-6">
			<div class="card shadow-sm border-0 h-100">
				<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="mb-0">💰 Financial Assistance by Barangay</h5>
				</div>
				<div class="card-body" style="height: 350px;">
					{#if data.financialByBarangay && Object.keys(data.financialByBarangay).length > 0}
						<canvas bind:this={chartContainers.financialBarangay}></canvas>
					{:else}
						<p class="text-muted text-center mt-5">No financial assistance data available</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="col-lg-6">
			<div class="card shadow-sm border-0 h-100">
				<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="mb-0">💊 Medicine Assistance by Barangay</h5>
				</div>
				<div class="card-body" style="height: 350px;">
					{#if data.medicineByBarangay && Object.keys(data.medicineByBarangay).length > 0}
						<canvas bind:this={chartContainers.medicineBarangay}></canvas>
					{:else}
						<p class="text-muted text-center mt-5">No medicine assistance data available</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Row 2 -->
	<div class="row g-4 mb-5">
		<div class="col-lg-6">
			<div class="card shadow-sm border-0 h-100">
				<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="mb-0">📈 Financial Assistance Types Distribution</h5>
				</div>
				<div class="card-body" style="height: 350px;">
					{#if Object.keys(data.assistanceByType).length > 0}
						<canvas bind:this={chartContainers.assistanceTypes}></canvas>
					{:else}
						<p class="text-muted text-center mt-5">No assistance type data available</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="col-lg-6">
			<div class="card shadow-sm border-0 h-100">
				<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="mb-0">💉 Medicines Distribution</h5>
				</div>
				<div class="card-body" style="height: 350px;">
					{#if data.medicineAssistances && data.medicineAssistances.length > 0}
						<canvas bind:this={chartContainers.medicines}></canvas>
					{:else}
						<p class="text-muted text-center mt-5">No medicine data available</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Row 3 -->
	<div class="row g-4">
		<div class="col-lg-6">
			<div class="card shadow-sm border-0 h-100">
				<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="mb-0">👥 Supporters Distribution</h5>
				</div>
				<div class="card-body" style="height: 350px;">
					{#if data.supporterDistribution}
						<canvas bind:this={chartContainers.supporter}></canvas>
					{:else}
						<p class="text-muted text-center mt-5">No supporter data available</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}

	:global(.table-hover tbody tr:hover) {
		background-color: #f8f9fa;
		transition: background-color 0.2s;
	}

	:global(.card) {
		border-radius: 12px;
		overflow: hidden;
	}
</style>
