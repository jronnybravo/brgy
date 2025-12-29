<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Locality } from '$lib/database/entities/Locality.js';

	interface PageData {
		person: any | null;
		isNew: boolean;
		towns: Locality[];
		barangays: Locality[];
	}

	export let data: PageData;
	export let form;

	let selectedTown: Locality | null = null;
	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' = 'success';
	let isSubmitting = false;

	let formData = {
		firstName: '',
		lastName: '',
		middleName: '',
		extensionName: '',
		birthdate: '',
		sex: 'Male',
		barangayId: '',
		purok: '',
		isSupporter: false,
		isLeader: false
	};

	$: {
		if (data.person && !selectedTown) {
			formData = {
				firstName: data.person.firstName || '',
				lastName: data.person.lastName || '',
				middleName: data.person.middleName || '',
				extensionName: data.person.extensionName || '',
				birthdate: data.person.birthdate ? new Date(data.person.birthdate).toISOString().split('T')[0] : '',
				sex: data.person.sex || 'Male',
				barangayId: data.person.barangayId?.toString() || '',
				purok: data.person.purok || '',
				isSupporter: data.person.isSupporter || false,
				isLeader: data.person.isLeader || false
			};

			const barangay = data.barangays.find(b => b.id === data.person.barangayId);
			if (barangay) {
				selectedTown = data.towns.find(t => t.id === barangay.parentId) || null;
			}
		}
	}

	$: filteredBarangays = selectedTown
		? data.barangays.filter(b => b.parentId === selectedTown?.id)
		: [];

	$: pageTitle = data.isNew ? 'Create New Person' : `Edit Person - ${data.person?.firstName} ${data.person?.lastName}`;

	$: if (form?.success) {
		showToast = true;
		toastMessage = form.message || 'Person saved successfully!';
		toastType = 'success';
		setTimeout(() => {
			goto('/dashboard/people');
		}, 1500);
	} else if (form?.error) {
		showToast = true;
		toastMessage = form.error;
		toastType = 'error';
	}

	function handleCancel() {
		goto('/dashboard/people');
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="container-fluid p-4">
	<div class="mb-5">
		<a href="/dashboard/people" class="btn btn-sm btn-outline-secondary mb-3">← Back to People</a>
		<h1 class="display-5 fw-bold mb-2" style="color: #2c3e50; font-size: 2rem;">{pageTitle}</h1>
	</div>

	<div class="card shadow-sm border-0 rounded-3">
		<div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
			<h5 class="mb-0 fw-bold">{data.isNew ? 'New Person Details' : 'Edit Person Details'}</h5>
		</div>
		<div class="card-body p-4">
			<form method="POST">
				{#if data.person?.id}
					<input type="hidden" name="personId" value={data.person.id} />
				{/if}

				<div class="row mb-3">
					<div class="col-md-6">
						<label for="lastName" class="form-label fw-500">Last Name *</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							class="form-control form-control-lg"
							bind:value={formData.lastName}
							placeholder="Enter last name"
							required
						/>
					</div>
					<div class="col-md-6">
						<label for="firstName" class="form-label fw-500">First Name *</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							class="form-control form-control-lg"
							bind:value={formData.firstName}
							placeholder="Enter first name"
							required
						/>
					</div>
				</div>

				<div class="row mb-3">
					<div class="col-md-6">
						<label for="middleName" class="form-label fw-500">Middle Name</label>
						<input
							type="text"
							id="middleName"
							name="middleName"
							class="form-control form-control-lg"
							bind:value={formData.middleName}
							placeholder="Enter middle name"
						/>
					</div>
					<div class="col-md-6">
						<label for="extensionName" class="form-label fw-500">Extension Name</label>
						<input
							type="text"
							id="extensionName"
							name="extensionName"
							class="form-control form-control-lg"
							bind:value={formData.extensionName}
							placeholder="e.g., Jr., Sr., III"
						/>
					</div>
				</div>

				<div class="row mb-3">
					<div class="col-md-6">
						<label for="birthdate" class="form-label fw-500">Birthdate *</label>
						<input 
							type="date" 
							id="birthdate" 
							name="birthdate"
							class="form-control form-control-lg"
							bind:value={formData.birthdate}
							required
						/>
					</div>
					<div class="col-md-6">
						<label for="sex" class="form-label fw-500">Sex *</label>
						<select id="sex" name="sex" class="form-select form-select-lg" bind:value={formData.sex} required>
							<option value="Male">Male</option>
							<option value="Female">Female</option>
						</select>
					</div>
				</div>

				<div class="row mb-3">
					<div class="col-md-6">
						<label for="municipality" class="form-label fw-500">Municipality *</label>
						<select id="municipality" 
							class="form-select form-select-lg" 
							bind:value={selectedTown} 
							required>
							<option value="">-- Select Municipality --</option>
							{#each data.towns as town}
								<option value={town}>{town.name}</option>
							{/each}
						</select>
					</div>
					<div class="col-md-6">
						<label for="barangayId" class="form-label fw-500">Barangay *</label>
						<select 
							id="barangayId" 
							name="barangayId"
							class="form-select form-select-lg" 
							bind:value={formData.barangayId} 
							required>
							<option value="">-- Select Barangay --</option>
							{#each filteredBarangays as barangay}
								<option value={barangay.id.toString()}>{barangay.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-3">
					<label for="purok" class="form-label fw-500">Purok</label>
					<input 
						type="text" 
						id="purok" 
						name="purok"
						class="form-control form-control-lg"
						bind:value={formData.purok} 
						placeholder="Enter purok" 
					/>
				</div>

				<div class="row mb-3">
					<div class="col-md-6">
						<div class="form-check">
							<input 
								class="form-check-input" 
								type="checkbox" 
								id="isSupporter" 
								name="isSupporter"
								bind:checked={formData.isSupporter}
							/>
							<label class="form-check-label" for="isSupporter">
								Is Supporter
							</label>
						</div>
					</div>
					<div class="col-md-6">
						<div class="form-check">
							<input 
								class="form-check-input" 
								type="checkbox" 
								id="isLeader" 
								name="isLeader"
								bind:checked={formData.isLeader}
							/>
							<label class="form-check-label" for="isLeader">
								Is Leader
							</label>
						</div>
					</div>
				</div>

				<div class="d-flex gap-2 mt-4">
					<button 
						type="submit" 
						class="btn btn-lg"
						style="background-color: #27ae60; color: white; border: none; flex: 1;"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Saving...' : data.isNew ? 'Create Person' : 'Update Person'}
					</button>
					<button 
						type="button" 
						class="btn btn-lg btn-outline-secondary"
						onclick={handleCancel}
						disabled={isSubmitting}
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	:global(body) {
		background-color: #f8f9fa;
	}
</style>
