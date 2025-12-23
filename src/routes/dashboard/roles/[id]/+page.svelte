<script lang="ts">
	import PermissionTreeSelector from '$lib/components/PermissionTreeSelector.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	interface PageData {
		role: {
			id: number;
			name: string;
			description: string | null;
			permissions: string[];
			createdAt: string;
			updatedAt: string;
		} | null;
		isNew: boolean;
		currentUser: {
			id: number;
			username: string;
		};
	}

	export let data: PageData;
	export let form;

	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'info' = 'info';

	// Form values
	let name = data.role?.name || '';
	let description = data.role?.description || '';
	let permissions: string[] = data.role?.permissions || [];

	$: pageTitle = data.isNew ? 'Create New Role' : `Edit Role - ${data.role?.name}`;
	$: pageDescription = data.isNew ? 'Add a new role to the system' : `Update ${data.role?.name}'s details`;

	// Handle form success - redirect after showing toast
	$: if (form?.success) {
		showToast = true;
		toastMessage = form.message || 'Operation completed successfully!';
		toastType = 'success';

		// Redirect to roles list after a short delay
		setTimeout(() => {
			goto('/dashboard/roles');
		}, 1500);
	}

	// Handle form errors
	$: if (form?.error) {
		showToast = true;
		toastMessage = form.error;
		toastType = 'error';
	}

	function handleCancel() {
		goto('/dashboard/roles');
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<Toast visible={showToast} message={toastMessage} type={toastType} />

<div class="container-fluid p-4">
	<div class="mb-5">
		<div class="d-flex justify-content-between align-items-center">
			<div>
				<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2rem;">{pageTitle}</h1>
				<p class="lead" style="color: #7f8c8d;">{pageDescription}</p>
			</div>
			<nav>
				<button type="button" class="btn btn-outline-secondary" on:click={handleCancel}>
					← Back to Roles
				</button>
			</nav>
		</div>
	</div>

	<div class="row">
		<div class="col-12">
			<div class="card shadow-sm border-0 rounded-3">
				<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
					<h5 class="mb-0 fw-bold" style="color: #2c3e50;">
						{data.isNew ? 'New Role' : 'Edit Role'}
					</h5>
				</div>
				<div class="card-body p-4">
					<form method="POST" action={data.isNew ? '?/createRole' : '?/updateRole'} use:enhance={() => {}}>
						{#if !data.isNew}
							<input type="hidden" name="id" value={data.role?.id} />
						{/if}

						<div class="mb-3">
							<label for="name" class="form-label fw-medium">Role Name *</label>
							<input
								type="text"
								class="form-control"
								id="name"
								name="name"
								bind:value={name}
								required
								placeholder="e.g., Administrator, Editor, Viewer"
								style="border-color: #dee2e6;"
							/>
							<small class="text-muted">Required - must be unique</small>
						</div>

						<div class="mb-3">
							<label for="description" class="form-label fw-medium">Description</label>
							<textarea
								class="form-control"
								id="description"
								name="description"
								bind:value={description}
								rows={3}
								placeholder="Brief description of this role's purpose"
								style="border-color: #dee2e6;"
							></textarea>
							<small class="text-muted">Optional - helps users understand what this role does</small>
						</div>

						<div class="mb-4">
							<label class="form-label fw-medium">Permissions</label>
							<PermissionTreeSelector bind:selectedPermissions={permissions} />
							<input type="hidden" name="permissions" value={JSON.stringify(permissions)} />
							<small class="text-muted d-block mt-2">Select the permissions that this role should have</small>
						</div>

						<div class="d-flex gap-2 pt-3 border-top" style="border-color: #e9ecef !important;">
							<button type="button" on:click={handleCancel} class="btn btn-outline-secondary">
								Cancel
							</button>
							<button
								type="submit"
								class="btn"
								style="background-color: {data.isNew ? '#27ae60' : '#3498db'}; color: white; border: none; font-weight: 500;"
							>
								✓ {data.isNew ? 'Create Role' : 'Update Role'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>

	{#if !data.isNew && data.role}
		<div class="row mt-4">
			<div class="col-12">
				<div class="card shadow-sm border-0 rounded-3">
					<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
						<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Details</h5>
					</div>
					<div class="card-body p-4">
						<div class="mb-3">
							<small class="text-muted fw-bold">ROLE ID</small>
							<p class="mb-0" style="color: #2c3e50; font-size: 1.1rem;">{data.role.id}</p>
						</div>
						<div class="mb-3">
							<small class="text-muted fw-bold">CREATED</small>
							<p class="mb-0" style="color: #2c3e50;">
								{new Date(data.role.createdAt).toLocaleDateString()} {new Date(data.role.createdAt).toLocaleTimeString()}
							</p>
						</div>
						<div class="mb-3">
							<small class="text-muted fw-bold">LAST UPDATED</small>
							<p class="mb-0" style="color: #2c3e50;">
								{new Date(data.role.updatedAt).toLocaleDateString()} {new Date(data.role.updatedAt).toLocaleTimeString()}
							</p>
						</div>
						<div>
							<small class="text-muted fw-bold">PERMISSIONS COUNT</small>
							<p class="mb-0" style="color: #2c3e50; font-size: 1.1rem;">{permissions.length}</p>
						</div>
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
</style>
