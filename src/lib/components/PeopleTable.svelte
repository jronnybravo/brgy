<script lang="ts">
	export let people: any[] = [];
	export let financialAssistances: any[] = [];
	export let medicineAssistances: any[] = [];
	export let showLocationColumns = true; // Toggle town and barangay columns

	let searchQuery = '';
	let sortColumn = 'firstName';
	let sortDirection: 'asc' | 'desc' = 'asc';
	let currentPage = 1;
	let isSupporterFilter: boolean | null = null;
	const pageSize = 10;

	let filteredData: any[] = [];
	let showAidModal = false;
	let selectedPerson: any = null;
	let selectedAidType: 'financial' | 'medicine' | null = null;

	function applyFiltersAndSort() {
		let filtered = people;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(p =>
				`${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
				p.purok?.toLowerCase().includes(query) ||
				p.barangay?.name?.toLowerCase().includes(query) ||
				p.barangay?.parent?.name?.toLowerCase().includes(query)
			);
		}

		// Is Supporter filter
		if (isSupporterFilter !== null) {
			filtered = filtered.filter(p => p.isSupporter === isSupporterFilter);
		}

		// Sort
		filtered.sort((a, b) => {
			let aVal: any = a[sortColumn];
			let bVal: any = b[sortColumn];

			// Handle nested fields like barangay.name
			if (sortColumn === 'town') {
				aVal = a.barangay?.parent?.name ?? '';
				bVal = b.barangay?.parent?.name ?? '';
			} else if (sortColumn === 'barangay') {
				aVal = a.barangay?.name ?? '';
				bVal = b.barangay?.name ?? '';
			}

			// Handle numeric comparisons
			if (sortColumn === 'financialTotal' || sortColumn === 'medicineCount') {
				if (sortColumn === 'financialTotal') {
					aVal = getFinancialTotal(a.id);
					bVal = getFinancialTotal(b.id);
				} else {
					aVal = getMedicineCount(a.id);
					bVal = getMedicineCount(b.id);
				}
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			}

			// String comparison
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
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

	function toggleSupporterFilter() {
		if (isSupporterFilter === null) {
			isSupporterFilter = true;
		} else if (isSupporterFilter === true) {
			isSupporterFilter = false;
		} else {
			isSupporterFilter = null;
		}
		applyFiltersAndSort();
	}

	function getFinancialTotal(personId: number): number {
		return financialAssistances
			.filter(fa => fa.personId === personId)
			.reduce((sum, fa) => sum + parseFloat(fa.value || 0), 0);
	}

	function getMedicineCount(personId: number): number {
		return medicineAssistances.filter(ma => ma.personId === personId).length;
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP'
		}).format(value);
	}

	function openAidHistory(person: any, aidType: 'financial' | 'medicine') {
		selectedPerson = person;
		selectedAidType = aidType;
		showAidModal = true;
	}

	function closeAidModal() {
		showAidModal = false;
		selectedPerson = null;
		selectedAidType = null;
	}

	function getPersonFinancialAids(personId: number) {
		return financialAssistances.filter(fa => fa.personId === personId);
	}

	function getPersonMedicineAids(personId: number) {
		return medicineAssistances.filter(ma => ma.personId === personId);
	}

	$: paginatedData = filteredData.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize
	);
	$: totalPages = Math.ceil(filteredData.length / pageSize);

	$: if (people && people.length > 0) {
		applyFiltersAndSort();
	} else if (people && people.length === 0) {
		filteredData = [];
	}
</script>

<div class="card shadow-sm border-0">
	<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
		<div class="row align-items-center">
			<div class="col-md-6">
				<h5 class="mb-0">👥 People</h5>
			</div>
			<div class="col-md-3">
				<input
					type="text"
					class="form-control form-control-sm"
					placeholder="Search people..."
					value={searchQuery}
					on:input={handleSearch}
					style="background-color: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);"
				/>
			</div>
			<div class="col-md-3 text-end">
				<div class="form-check form-check-inline">
					<input
						class="form-check-input"
						type="checkbox"
						id="supporterFilter"
						checked={isSupporterFilter}
						on:change={toggleSupporterFilter}
						style="cursor: pointer;"
					/>
					<label class="form-check-label text-white" for="supporterFilter" style="cursor: pointer;">
						Supporters Only
					</label>
				</div>
			</div>
		</div>
	</div>

	<div class="table-responsive">
		<table class="table table-hover mb-0">
			<thead class="table-light">
				<tr>
					<th 
						style="cursor: pointer;"
						class:fw-bold={sortColumn === 'firstName'}
						on:click={() => handleSort('firstName')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSort('firstName')}
					>
						Name
						{#if sortColumn === 'firstName'}
							<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</th>
					{#if showLocationColumns}
						<th 
							style="cursor: pointer;"
							class:fw-bold={sortColumn === 'town'}
							on:click={() => handleSort('town')}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSort('town')}
						>
							Town
							{#if sortColumn === 'town'}
								<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</th>
						<th 
							style="cursor: pointer;"
							class:fw-bold={sortColumn === 'barangay'}
							on:click={() => handleSort('barangay')}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSort('barangay')}
						>
							Barangay
							{#if sortColumn === 'barangay'}
								<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</th>
					{/if}
					<th 
						style="cursor: pointer;"
						class:fw-bold={sortColumn === 'purok'}
						on:click={() => handleSort('purok')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSort('purok')}
					>
						Purok
						{#if sortColumn === 'purok'}
							<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</th>
					<th 
						style="cursor: pointer;"
						class:fw-bold={sortColumn === 'isSupporter'}
						on:click={() => handleSort('isSupporter')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSort('isSupporter')}
					>
						Is Supporter
						{#if sortColumn === 'isSupporter'}
							<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</th>
					<th 
						style="cursor: pointer;"
						class:fw-bold={sortColumn === 'financialTotal'}
						on:click={() => handleSort('financialTotal')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSort('financialTotal')}
						class="text-end"
					>
						Financial Aid (total)
						{#if sortColumn === 'financialTotal'}
							<span class="float-end">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</th>
					<th 
						style="cursor: pointer;"
						class:fw-bold={sortColumn === 'medicineCount'}
						on:click={() => handleSort('medicineCount')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSort('medicineCount')}
						class="text-center"
					>
						Medicine Aid (count)
						{#if sortColumn === 'medicineCount'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedData as person (person.id)}
					<tr>
						<td class="fw-bold" style="color: #2c3e50;">{person.firstName} {person.lastName}</td>
						{#if showLocationColumns}
							<td>{person.barangay?.parent?.name || '-'}</td>
							<td>{person.barangay?.name || '-'}</td>
						{/if}
						<td>{person.purok || '-'}</td>
						<td>
							{#if person.isSupporter}
								<span class="badge bg-info">Yes</span>
							{:else}
								<span class="badge bg-light text-dark">No</span>
							{/if}
						</td>
						<td class="text-end">
							{#if getFinancialTotal(person.id) > 0}
								<button 
									class="badge bg-success" 
									style="border: none; cursor: pointer; padding: 0.5em 0.75em;"
									on:click={() => openAidHistory(person, 'financial')}
									title="Click to view history"
								>
									{formatCurrency(getFinancialTotal(person.id))}
								</button>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>
						<td class="text-center">
							{#if getMedicineCount(person.id) > 0}
								<button 
									class="badge bg-info" 
									style="border: none; cursor: pointer; padding: 0.5em 0.75em;"
									on:click={() => openAidHistory(person, 'medicine')}
									title="Click to view history"
								>
									{getMedicineCount(person.id)}
								</button>
							{:else}
								<span class="badge bg-light text-dark">-</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="card-footer bg-light d-flex justify-content-between align-items-center">
		<div class="text-muted small">
			Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} ({people.length} total)
		</div>
		<nav aria-label="Table pagination">
			<ul class="pagination mb-0">
				<li class="page-item" class:disabled={currentPage === 1}>
					<button
						class="page-link"
						on:click={() => (currentPage = 1)}
						disabled={currentPage === 1}
					>
						First
					</button>
				</li>
				<li class="page-item" class:disabled={currentPage === 1}>
					<button
						class="page-link"
						on:click={() => (currentPage = Math.max(1, currentPage - 1))}
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
						on:click={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages || totalPages === 0}
					>
						Next
					</button>
				</li>
				<li class="page-item" class:disabled={currentPage === totalPages || totalPages === 0}>
					<button
						class="page-link"
						on:click={() => (currentPage = totalPages)}
						disabled={currentPage === totalPages || totalPages === 0}
					>
						Last
					</button>
				</li>
			</ul>
		</nav>
	</div>
</div>

<!-- Aid History Modal -->
{#if showAidModal && selectedPerson && selectedAidType}
	<div class="modal d-block" style="background-color: rgba(0, 0, 0, 0.5);">
		<div class="modal-dialog modal-lg">
			<div class="modal-content">
				<div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
					<h5 class="modal-title">
						{#if selectedAidType === 'financial'}
							💰 Financial Aid History - {selectedPerson.firstName} {selectedPerson.lastName}
						{:else}
							💊 Medicine Aid History - {selectedPerson.firstName} {selectedPerson.lastName}
						{/if}
					</h5>
					<button type="button" class="btn-close btn-close-white" on:click={closeAidModal}></button>
				</div>
				<div class="modal-body">
					{#if selectedAidType === 'financial'}
						{@const aids = getPersonFinancialAids(selectedPerson.id)}
						{#if aids.length > 0}
							<div class="table-responsive">
								<table class="table table-striped">
									<thead class="table-light">
										<tr>
											<th>Type</th>
											<th>Amount</th>
											<th>Date Disbursed</th>
										</tr>
									</thead>
									<tbody>
										{#each aids as aid}
											<tr>
												<td><strong>{aid.type}</strong></td>
												<td class="text-end">{formatCurrency(parseFloat(aid.value || 0))}</td>
												<td>{new Date(aid.disbursed_date).toLocaleDateString('en-PH')}</td>
											</tr>
										{/each}
										<tr style="background-color: #f8f9fa; font-weight: bold;">
											<td colspan="1">Total:</td>
											<td class="text-end">
												{formatCurrency(aids.reduce((sum, aid) => sum + parseFloat(aid.value || 0), 0))}
											</td>
											<td></td>
										</tr>
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-center py-4 text-muted">
								<p>No financial aid records found</p>
							</div>
						{/if}
					{:else if selectedAidType === 'medicine'}
						{@const aids = getPersonMedicineAids(selectedPerson.id)}
						{#if aids.length > 0}
							<div class="table-responsive">
								<table class="table table-striped">
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
										{#each aids as aid}
											<tr>
												<td><strong>{aid.medicine_name}</strong></td>
												<td>{aid.generic_name || '-'}</td>
												<td>{aid.dosage || '-'}</td>
												<td>{aid.quantity} {aid.unit || ''}</td>
												<td>{new Date(aid.disbursed_date).toLocaleDateString('en-PH')}</td>
											</tr>
										{/each}
										<tr style="background-color: #f8f9fa; font-weight: bold;">
											<td colspan="3">Total Quantity:</td>
											<td>
												{aids.reduce((sum, aid) => sum + (aid.quantity || 0), 0)}
											</td>
											<td></td>
										</tr>
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-center py-4 text-muted">
								<p>No medicine aid records found</p>
							</div>
						{/if}
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" on:click={closeAidModal}>Close</button>
				</div>
			</div>
		</div>
	</div>
{/if}
