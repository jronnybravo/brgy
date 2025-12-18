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
		barangayCount: number;
		financialAssistanceCount: number;
		medicineAssistanceCount: number;
		totalFinancialAssistance: number;
	}

	interface PageData {
		municipalities: Municipality[];
		error?: string;
		assistanceByType?: Record<string, number>;
		medicineNames?: Record<string, number>;
		totalFinancialByMunicipality?: Record<string, number>;
		totalMedicinesByMunicipality?: Record<string, number>;
		supporterDistribution?: Record<string, number>;
	}

	export let data: PageData;

	// Table state
	let tableData: Municipality[] = [];
	let filteredData: Municipality[] = [];
	let searchQuery = '';
	let sortColumn = 'name';
	let sortDirection: 'asc' | 'desc' = 'asc';
	let currentPage = 1;
	const pageSize = 10;

	let chartContainers = {
		financial: null as HTMLCanvasElement | null,
		medicine: null as HTMLCanvasElement | null,
		types: null as HTMLCanvasElement | null,
		medicines: null as HTMLCanvasElement | null,
		supporter: null as HTMLCanvasElement | null
	};

	let charts: Record<string, Chart> = {};

	const COLORS = [
		'#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
		'#fa709a', '#fee140', '#30b0fe', '#a8edea', '#fed6e3',
		'#ff9ff3', '#54a0ff', '#48dbfb', '#0abde3', '#ee5a6f'
	];

	function navigateToMunicipality(municipalityId: number) {
		goto(`/dashboard/municipalities/${municipalityId}`);
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

	// Table functions
	function applyFiltersAndSort() {
		// Apply search
		let filtered = tableData;
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(m =>
				m.name.toLowerCase().includes(query) ||
				m.type.toLowerCase().includes(query)
			);
		}

		// Apply sort
		filtered.sort((a, b) => {
			let aVal = a[sortColumn as keyof Municipality];
			let bVal = b[sortColumn as keyof Municipality];

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
		// Initialize table data
		tableData = data.municipalities || [];
		applyFiltersAndSort();

		// Create Financial Assistance by Municipality pie chart
		if (chartContainers.financial && data.totalFinancialByMunicipality) {
			createPieChart(
				chartContainers.financial,
				'financial',
				data.totalFinancialByMunicipality
			);
		}

		// Create Medicine Assistance by Municipality pie chart
		if (chartContainers.medicine && data.totalMedicinesByMunicipality) {
			createPieChart(
				chartContainers.medicine,
				'medicine',
				data.totalMedicinesByMunicipality
			);
		}

		// Create Financial Assistance Types bar chart
		if (chartContainers.types && data.assistanceByType) {
			createBarChart(
				chartContainers.types,
				'types',
				data.assistanceByType
			);
		}

		// Create Medicine Names bar chart
		if (chartContainers.medicines && data.medicineNames) {
			createBarChart(
				chartContainers.medicines,
				'medicines',
				data.medicineNames
			);
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
</script>

<div class="container-fluid p-4">
	<div class="mb-5">
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">Municipalities</h1>
		<p class="lead" style="color: #7f8c8d;">View statistics and assistance data by municipality</p>
	</div>

	{#if data.error}
		<div class="alert alert-danger" role="alert">
			<strong>Error:</strong> {data.error}
		</div>
	{/if}

	{#if data.municipalities.length === 0}
		<div class="alert alert-info" role="alert">
			No municipalities found.
		</div>
	{:else}
		<!-- Municipalities Table -->
		<div class="card mb-5 shadow-sm border-0">
			<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
				<div class="row align-items-center">
					<div class="col-md-8">
						<h5 class="mb-0">📊 Municipalities Overview</h5>
					</div>
					<div class="col-md-4">
						<input
							type="text"
							class="form-control form-control-sm"
							placeholder="Search municipalities..."
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
								Municipality
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
							<th class="text-center">Barangays</th>
							<th 
								class="text-center"
								style="cursor: pointer;"
								class:fw-bold={sortColumn === 'financialAssistanceCount'}
								on:click={() => handleSort('financialAssistanceCount')}
								role="button"
								tabindex="0"
								on:keydown={(e) => e.key === 'Enter' && handleSort('financialAssistanceCount')}
							>
								Financial Aid Records
								{#if sortColumn === 'financialAssistanceCount'}
									<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</th>
							<th class="text-center">Medicine Aid Records</th>
							<th class="text-end">Total Financial Aid</th>
							<th class="text-center">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedData as municipality (municipality.id)}
							<tr>
								<td class="fw-bold" style="color: #2c3e50;">{municipality.name}</td>
								<td class="text-center">
									<span class="badge" style="background-color: #3498db;">{municipality.type}</span>
								</td>
								<td class="text-end">{municipality.population?.toLocaleString() || 'N/A'}</td>
								<td class="text-center">{municipality.barangayCount}</td>
								<td class="text-center">
									<span class="badge bg-success">{municipality.financialAssistanceCount}</span>
								</td>
								<td class="text-center">
									<span class="badge bg-info">{municipality.medicineAssistanceCount}</span>
								</td>
								<td class="text-end fw-bold" style="color: #27ae60;">{formatCurrency(municipality.totalFinancialAssistance)}</td>
								<td class="text-center">
									<button
										class="btn btn-sm btn-primary"
										on:click={() => navigateToMunicipality(municipality.id)}
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
						<h5 class="mb-0">💰 Financial Assistance by Municipality</h5>
					</div>
					<div class="card-body" style="height: 350px;">
						<canvas bind:this={chartContainers.financial}></canvas>
					</div>
				</div>
			</div>
			<div class="col-lg-6">
				<div class="card shadow-sm border-0 h-100">
					<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
						<h5 class="mb-0">💊 Medicine Assistance by Municipality</h5>
					</div>
					<div class="card-body" style="height: 350px;">
						<canvas bind:this={chartContainers.medicine}></canvas>
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
						<canvas bind:this={chartContainers.types}></canvas>
					</div>
				</div>
			</div>
			<div class="col-lg-6">
				<div class="card shadow-sm border-0 h-100">
					<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
						<h5 class="mb-0">💉 Medicines Distribution</h5>
					</div>
					<div class="card-body" style="height: 350px;">
						<canvas bind:this={chartContainers.medicines}></canvas>
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
						<canvas bind:this={chartContainers.supporter}></canvas>
					</div>
				</div>
			</div>
		</div>
	{/if}
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
