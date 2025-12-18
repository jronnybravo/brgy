<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import type { ChartConfiguration } from 'chart.js/auto';
	import PeopleTable from '$lib/components/PeopleTable.svelte';

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
	}

	export let data: PageData;

	let chartContainers = {
		financial: null as HTMLCanvasElement | null,
		medicine: null as HTMLCanvasElement | null,
		types: null as HTMLCanvasElement | null,
		medicines: null as HTMLCanvasElement | null
	};

	let charts: Record<string, Chart> = {};
	let searchQuery = '';

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

	$: filteredPeople = data.people.filter(p => {
		const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
		return fullName.includes(searchQuery.toLowerCase());
	});

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

		// Create Financial Assistance Types pie chart
		if (chartContainers.types && data.assistanceByType) {
			createPieChart(
				chartContainers.types,
				'types',
				data.assistanceByType
			);
		}

		// Create Medicine Names pie chart
		if (chartContainers.medicines && data.medicineNames) {
			createPieChart(
				chartContainers.medicines,
				'medicines',
				data.medicineNames
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
	}

	let tableData: Person[] = [];
	let filteredData: Person[] = [];
	let tableSearchQuery = '';
	let sortColumn = 'firstName';
	let sortDirection: 'asc' | 'desc' = 'asc';
	let currentPage = 1;
	const pageSize = 10;

	// Initialize table data
	$: {
		tableData = data.people || [];
		applyFiltersAndSort();
	}

	function applyFiltersAndSort() {
		// Apply search
		let filtered = tableData;
		if (tableSearchQuery) {
			const query = tableSearchQuery.toLowerCase();
			filtered = filtered.filter(p => {
				const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
				return fullName.includes(query) || p.purok.toLowerCase().includes(query);
			});
		}

		// Apply sort
		filtered.sort((a, b) => {
			let aVal = a[sortColumn as keyof Person];
			let bVal = b[sortColumn as keyof Person];

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

	function handleTableSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
		applyFiltersAndSort();
	}

	function handleTableSearch(e: Event) {
		tableSearchQuery = (e.target as HTMLInputElement).value;
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
			{data.barangay.name}
		</h1>
		<p class="lead" style="color: #7f8c8d;">
			{data.barangay.type} • {data.municipality.name}
		</p>
	</div>

	<!-- People Table -->
	<div class="mb-5">
		<PeopleTable 
			people={data.people}
			financialAssistances={data.financialAssistances}
			medicineAssistances={data.medicineAssistances}
			showLocationColumns={false}
		/>
	</div>


	<!-- Charts Row 2 -->
	<div class="row g-4">
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
