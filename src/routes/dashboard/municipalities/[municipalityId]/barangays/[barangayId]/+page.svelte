<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Chart } from 'chart.js/auto';
	import type { ChartConfiguration } from 'chart.js/auto';

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
	}

	interface PageData {
		municipality: Municipality;
		barangay: Barangay;
		people: any[];
		financialAssistances: any[];
		medicineAssistances: any[];
		totalFinancialAssistance: number;
		totalMedicineAssistances: number;
		uniquePeopleWithAssistance: number;
		assistanceByType: Record<string, number>;
		medicineNames: Record<string, number>;
		assistanceByPerson: Record<string, number>;
		medicinesByPerson: Record<string, number>;
		supporterDistribution?: Record<string, number>;
		capabilities: {
			canReadPersons: boolean;
			canUpdatePersons: boolean;
			canDeletePersons: boolean;
		};
	}

	let { data }: { data: PageData } = $props();
	const capabilities = $derived(data.capabilities);
	const columnsCount = $derived(
		6 + (capabilities.canUpdatePersons || capabilities.canDeletePersons ? 1 : 0)
	);

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
		// Create Financial Assistance by Person pie chart
		if (chartContainers.financial && data.assistanceByPerson) {
			createPieChart(
				chartContainers.financial,
				'financial',
				data.assistanceByPerson
			);
		}

		// Create Medicine Assistance by Person pie chart
		if (chartContainers.medicine && data.medicinesByPerson) {
			createPieChart(
				chartContainers.medicine,
				'medicine',
				data.medicinesByPerson
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

	// Table state
	interface Person {
		id: number;
		firstName: string;
		lastName: string;
		sex: string;
		birthdate: string;
		purok: string;
		isSupporter: boolean;
		isLeader: boolean;
		financialTotal?: number;
		medicineCount?: number;
	}

	let people: Person[] = $state([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let supporterFilter = $state<boolean | null>(null);
	let sortColumn = $state('lastName');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(1);
	let recordsTotal = $state(0);
	let recordsFiltered = $state(0);

	// Modal state
	let showAssistanceModal = $state(false);
	let selectedPerson = $state<Person | null>(null);
	let personFinancialAssistances = $state<any[]>([]);
	let personMedicineAssistances = $state<any[]>([]);
	let assistanceModalLoading = $state(false);
	const pageSize = 10;
	const totalPages = $derived(Math.ceil((recordsFiltered || 1) / pageSize));

	async function loadPeople(page?: number) {
		if (page !== undefined && page !== null) {
			currentPage = page;
		}

		loading = true;
		errorMessage = '';

		try {
			const queryParams = new URLSearchParams();
			const pageNum = currentPage;

			queryParams.append('start', ((pageNum - 1) * pageSize).toString());
			queryParams.append('length', pageSize.toString());
			queryParams.append('order[0][name]', sortColumn);
			queryParams.append('order[0][dir]', sortDir);

			if (searchQuery.trim()) {
				queryParams.append('search[value]', searchQuery.trim());
			}

			// Filter by barangay ID
			queryParams.append('filter[barangayId]', data.barangay.id.toString());

			if (supporterFilter !== null) {
				queryParams.append('filter[isSupporter]', supporterFilter.toString());
			}

			const queryString = queryParams.toString();
			const res = await fetch(`/api/people?${queryString}`);

			if (!res.ok) throw new Error('Failed to load people');

			const result = await res.json();
			people = result.data || [];
			recordsTotal = result.recordsTotal || 0;
			recordsFiltered = result.recordsFiltered || 0;
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Error loading people';
			console.error('Error loading people:', e);
		} finally {
			loading = false;
		}
	}

	function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
	}

	function toggleSupporterFilter() {
		supporterFilter = supporterFilter === true ? null : true;
		currentPage = 1;
	}

	function handleSort(column: string, direction: 'asc' | 'desc') {
		sortColumn = column;
		sortDir = direction;
		currentPage = 1;
	}

	function handlePageChange(page: number) {
		loadPeople(page);
	}

	async function deletePerson(id: number) {
		if (!confirm('Are you sure you want to delete this person?')) return;

		try {
			const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete person');
			await loadPeople();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Error deleting person';
		}
	}

	async function openAssistanceModal(person: Person) {
		selectedPerson = person;
		showAssistanceModal = true;
		assistanceModalLoading = true;

		try {
			const res = await fetch(`/api/people/${person.id}/assistances`);
			if (res.ok) {
				const data = await res.json();
				personFinancialAssistances = data.financial || [];
				personMedicineAssistances = data.medicine || [];
			}
		} catch (e) {
			console.error('Error loading assistance details:', e);
		} finally {
			assistanceModalLoading = false;
		}
	}

	function closeAssistanceModal() {
		showAssistanceModal = false;
		selectedPerson = null;
		personFinancialAssistances = [];
		personMedicineAssistances = [];
	}

	onMount(async () => {
		await loadPeople();
	});

	$effect(() => {
		// Reload when filters change
		searchQuery;
		supporterFilter;
		sortColumn;
		sortDir;
		currentPage;

		loadPeople();
	});
</script>

<div class="container-fluid p-4">
	<div class="mb-4">
		<button class="btn btn-outline-secondary mb-3" onclick={() => history.back()}>
			← Back
		</button>
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">
			{data.barangay.name}
		</h1>
		<p class="lead" style="color: #7f8c8d;">
			{data.barangay.type} • {data.municipality.name}
		</p>
	</div>

	<!-- People Table -->
	<div class="mb-5">
		<div class="card shadow-sm border-0" style="border-top: 4px solid #27ae60;">
			<div class="card-header" style="background-color: #f8f9fa;">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People in {data.barangay.name}</h5>
			</div>
			<div class="card-body">
				{#if errorMessage}
					<div class="alert alert-danger alert-dismissible fade show" role="alert">
						<strong>Error!</strong> {errorMessage}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				<div class="table-responsive">
					<table class="table table-hover table-striped">
						<thead class="table-light">
							<tr>
								<th style="width: 30%;">
									<div class="d-flex flex-column gap-2">
										<button
											type="button"
											class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
											onclick={() => handleSort('lastName', sortColumn === 'lastName' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
											style="color: inherit; white-space: nowrap;"
										>
											Name {sortColumn === 'lastName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
										</button>
										<input
											type="text"
											class="form-control form-control-sm"
											placeholder="Search..."
											value={searchQuery}
											onchange={(e) => handleSearch((e.target as HTMLInputElement).value)}
										/>
									</div>
								</th>
								<th style="width: 15%;">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('sex', sortColumn === 'sex' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Sex {sortColumn === 'sex' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								<th style="width: 15%;">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('purok', sortColumn === 'purok' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Purok {sortColumn === 'purok' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								<th style="width: 20%;">
									<div class="d-flex flex-column gap-2">
										<span>Is Supporter</span>
										<div class="form-check">
											<input
												type="checkbox"
												class="form-check-input"
												id="supporter-filter"
												checked={supporterFilter === true}
												onchange={() => toggleSupporterFilter()}
											/>
											<label class="form-check-label" for="supporter-filter" style="font-size: 0.85rem;">
												Supporters Only
											</label>
										</div>
									</div>
								</th>
								<th style="width: 15%;">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('financialTotal', sortColumn === 'financialTotal' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Financial Aid {sortColumn === 'financialTotal' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								<th style="width: 15%;">
									<button
										type="button"
										class="btn btn-link btn-sm p-0 text-start text-decoration-none cursor-pointer"
										onclick={() => handleSort('medicineCount', sortColumn === 'medicineCount' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
										style="color: inherit;"
									>
										Medicine Aid {sortColumn === 'medicineCount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								{#if capabilities.canUpdatePersons || capabilities.canDeletePersons}
									<th style="width: 20%;">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#if loading}
								<tr>
									<td colspan={columnsCount} class="text-center py-4">
										<div class="spinner-border text-primary me-2" role="status">
											<span class="visually-hidden">Loading...</span>
										</div>
										Loading people...
									</td>
								</tr>
							{:else if people.length === 0}
								<tr>
									<td colspan={columnsCount} class="text-center py-4 text-muted">
										No people found
									</td>
								</tr>
							{:else}
								{#each people as person (person.id)}
									<tr>
										<td>
											<strong>{person.lastName}, {person.firstName}</strong>
										</td>
										<td>{person.sex || '—'}</td>
										<td>{person.purok || '—'}</td>
										<td>
											{#if person.isSupporter}
												<span class="badge bg-success">Yes</span>
											{:else}
												<span class="badge bg-secondary">No</span>
											{/if}
										</td>
										<td>
											<div class="d-flex justify-content-between align-items-center">
												<span>{person.financialTotal ? formatCurrency(person.financialTotal) : '—'}</span>
												{#if person.financialTotal && person.financialTotal > 0}
												<button
													class="btn btn-sm btn-outline-primary ms-2"
													title="View assistance records"
													onclick={() => openAssistanceModal(person)}>
													<i class="bi bi-file-earmark-text"></i>
												</button>
												{/if}
											</div>
										</td>
										<td>
											<div class="d-flex justify-content-between align-items-center">
												<span>{person.medicineCount || 0}</span>
												{#if person.medicineCount && person.medicineCount > 0}
												<button
													class="btn btn-sm btn-outline-primary ms-2"
													title="View assistance records"
													onclick={() => openAssistanceModal(person)}>
													<i class="bi bi-file-earmark-text"></i>
												</button>
												{/if}
											</div>
										</td>
										{#if capabilities.canUpdatePersons || capabilities.canDeletePersons}
											<td>
												{#if capabilities.canUpdatePersons}
													<a href="/dashboard/people/{person.id}"
														class="btn btn-sm btn-primary"
														title="Edit">
														<i class="bi bi-pencil-square"></i>
													</a>
												{/if}
												{#if capabilities.canDeletePersons}
													<button class="btn btn-sm btn-danger"
														title="Delete"
														onclick={() => deletePerson(person.id)}>
														<i class="bi bi-trash"></i>
													</button>
												{/if}
											</td>
										{/if}
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				{#if !loading && people.length > 0}
					<div class="d-flex justify-content-between align-items-center mt-3">
						<small class="text-muted">
							Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, recordsFiltered)} of {recordsFiltered} entries
						</small>
						<nav aria-label="Page navigation">
							<ul class="pagination pagination-sm mb-0">
								<li class="page-item" class:disabled={currentPage === 1}>
									<button class="page-link" onclick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
										Previous
									</button>
								</li>
								{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
									<li class="page-item" class:active={page === currentPage}>
										<button class="page-link" onclick={() => handlePageChange(page)}>
											{page}
										</button>
									</li>
								{/each}
								<li class="page-item" class:disabled={currentPage === totalPages}>
									<button class="page-link" onclick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
										Next
									</button>
								</li>
							</ul>
						</nav>
					</div>
				{/if}
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

	<!-- Assistance History Modal -->
	{#if showAssistanceModal && selectedPerson}
		<div class="modal d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">
							Assistance History - {selectedPerson.lastName}, {selectedPerson.firstName}
						</h5>
						<button type="button" class="btn-close" onclick={() => closeAssistanceModal()}></button>
					</div>
					<div class="modal-body">
						{#if assistanceModalLoading}
							<div class="text-center py-4">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
							</div>
						{:else}
							<!-- Financial Assistance Section -->
							{#if personFinancialAssistances.length > 0}
								<h6 class="mb-3">Financial Assistance Records</h6>
								<div class="table-responsive mb-4">
									<table class="table table-sm table-bordered">
										<thead class="table-light">
											<tr>
												<th>Type</th>
												<th>Amount</th>
												<th>Date Disbursed</th>
											</tr>
										</thead>
										<tbody>
											{#each personFinancialAssistances as fa (fa.id)}
												<tr>
													<td>{fa.type || '—'}</td>
													<td>{formatCurrency(parseFloat(fa.value))}</td>
													<td>{new Date(fa.disbursed_date).toLocaleDateString()}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}

							<!-- Medicine Assistance Section -->
							{#if personMedicineAssistances.length > 0}
								<h6 class="mb-3">Medicine Assistance Records</h6>
								<div class="table-responsive">
									<table class="table table-sm table-bordered">
										<thead class="table-light">
											<tr>
												<th>Medicine Name</th>
												<th>Generic Name</th>
												<th>Dosage</th>
												<th>Quantity</th>
												<th>Date Disbursed</th>
											</tr>
										</thead>
										<tbody>
											{#each personMedicineAssistances as ma (ma.id)}
												<tr>
													<td>{ma.medicine_name || '—'}</td>
													<td>{ma.generic_name || '—'}</td>
													<td>{ma.dosage || '—'}</td>
													<td>{ma.quantity} {ma.unit || ''}</td>
													<td>{new Date(ma.disbursed_date).toLocaleDateString()}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}

							{#if personFinancialAssistances.length === 0 && personMedicineAssistances.length === 0}
								<p class="text-muted text-center py-4">No assistance records found.</p>
							{/if}
						{/if}
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" onclick={() => closeAssistanceModal()}>
							Close
						</button>
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
