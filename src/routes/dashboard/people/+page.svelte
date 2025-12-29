<script lang="ts">
	import { goto } from '$app/navigation';
	import PeopleTable from '$lib/components/PeopleTable.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const capabilities = $derived(data.capabilities as {
		canCreatePersons: boolean;
		canUpdatePersons: boolean;
		canDeletePersons: boolean;
	});

	let showUpload = $state(false);
	let uploadLoading = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');
	let uploadResults: any = $state(null);

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		if (!file.name.endsWith('.csv')) {
			uploadError = 'Please select a CSV file';
			return;
		}

		uploadLoading = true;
		uploadError = '';
		uploadSuccess = '';
		uploadResults = null;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch('/api/people/upload', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();

			if (!res.ok) {
				uploadError = result.error || 'Failed to upload CSV';
				return;
			}

			uploadResults = result.results;
			uploadSuccess = result.message;
			
			// Reset file input
			target.value = '';

			// Close upload after 2 seconds
			setTimeout(() => {
				showUpload = false;
			}, 2000);
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Error uploading file';
		} finally {
			uploadLoading = false;
		}
	}
</script>

<div class="container-fluid p-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h1 class="display-5 fw-bold mb-0" style="color: #2c3e50; font-size: 2rem;">People Management</h1>

		{#if capabilities.canCreatePersons}
			<div class="d-flex gap-2">
				<button onclick={() => (showUpload = !showUpload)} class="btn btn-info btn-lg">
					{showUpload ? '✕ Cancel' : '📤 Upload CSV'}
				</button>
				<button onclick={() => goto('/dashboard/people/new')} class="btn btn-primary btn-lg">
					+ Add Person
				</button>
			</div>
		{/if}
	</div>

	{#if showUpload}
		<div class="card mb-4 shadow-sm border-0" style="border-top: 4px solid #17a2b8;">
			<div class="card-header" style="background-color: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
				<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Upload People from CSV</h5>
			</div>
			<div class="card-body">
				{#if uploadError}
					<div class="alert alert-danger alert-dismissible fade show" role="alert">
						<strong>Upload Error!</strong> {uploadError}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				{#if uploadSuccess}
					<div class="alert alert-success alert-dismissible fade show" role="alert">
						<strong>Success!</strong> {uploadSuccess}
						{#if uploadResults}
							<ul class="mb-0 mt-2">
								<li>Successful: {uploadResults.successful}/{uploadResults.total}</li>
								{#if uploadResults.failed > 0}
									<li class="text-danger">Failed: {uploadResults.failed}/{uploadResults.total}</li>
									{#if uploadResults.errors.length > 0}
										<li>
											<details class="mt-2">
												<summary class="cursor-pointer">View Errors ({uploadResults.errors.length})</summary>
												<div class="mt-2" style="max-height: 300px; overflow-y: auto; background-color: #f8f9fa; padding: 1rem; border-radius: 4px;">
													{#each uploadResults.errors as errorItem}
														<div class="mb-2 p-2 border-bottom">
															<strong>Row {errorItem.rowNumber}:</strong> {errorItem.error}
														</div>
													{/each}
												</div>
											</details>
										</li>
									{/if}
								{/if}
							</ul>
						{/if}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				<div class="mb-4 p-4" style="background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; text-align: center;">
					<div class="mb-3">
						<p class="text-muted mb-2">
							<strong>CSV Format Required:</strong>
						</p>
						<p class="text-muted small mb-3">
							First Name, Middle Name, Last Name, Extension Name, Town, Barangay, Purok, Precinct, Is Supporter, Is Leader, Comments
						</p>
					</div>
					
					<label for="csvFile" class="btn btn-info btn-lg">
						📁 Select CSV File
					</label>
					<input id="csvFile"
						type="file"
						accept=".csv"
						onchange={handleFileUpload}
						disabled={uploadLoading}
						style="display: none;" />
				</div>

				{#if uploadLoading}
					<div class="text-center py-3">
						<div class="spinner-border text-info me-2" role="status">
							<span class="visually-hidden">Uploading...</span>
						</div>
						Processing CSV file...
					</div>
				{:else}
					<div class="alert alert-info mb-0">
						<strong>Note:</strong> The CSV file must contain the following columns: First Name, Last Name, Town, and Barangay. 
						Other fields (Middle Name, Extension Name, Purok, Precinct, Is Supporter, Is Leader, Comments) are optional.
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="card shadow-sm border-0" style="border-top: 4px solid #27ae60; margin-top: 2rem;">
		<div class="card-header" style="background-color: #f8f9fa;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">People List</h5>
		</div>
		<div class="card-body">
			<PeopleTable {capabilities} />
		</div>
	</div>
</div>

<style>
	:global(.fw-500) {
		font-weight: 500 !important;
	}
</style>
