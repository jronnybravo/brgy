<script lang="ts">
	import Toast from '$lib/components/Toast.svelte';

	interface PageData {
		roles: Array<{
			id: number;
			name: string;
			description: string | null;
			permissions: string[];
			createdAt: string;
			updatedAt: string;
		}>;
		currentUser: {
			id: number;
			username: string;
		};
		capabilities: {
			canCreateRoles: boolean;
			canUpdateRoles: boolean;
			canDeleteRoles: boolean;
		};
	}

	export let data: PageData;
	let capabilities = data.capabilities;

	let roles = data.roles;
	let showDeleteModal = false;
	let roleToDelete: any = null;

	// Toast state
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'info' = 'info';
	let showToast = false;

	$: roles = data.roles;

	function openDeleteModal(role: any) {
		roleToDelete = role;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		roleToDelete = null;
	}

	async function handleConfirmDelete() {
		if (!roleToDelete) return;

		try {
			const formData = new FormData();
			formData.append('id', roleToDelete.id.toString());

			const response = await fetch('?/deleteRole', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				roles = roles.filter((r) => r.id !== roleToDelete.id);
				closeDeleteModal();
				showToast = true;
				toastMessage = 'Role deleted successfully';
				toastType = 'success';
			} else {
				showToast = true;
				toastMessage = 'Failed to delete role';
				toastType = 'error';
			}
		} catch (error) {
			showToast = true;
			toastMessage = 'Error deleting role';
			toastType = 'error';
			console.error(error);
		}
	}

	function getFormattedDate(date: string): string {
		const d = new Date(date);
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
	}
</script>

<svelte:head>
	<title>Role Management</title>
</svelte:head>

<Toast visible={showToast} message={toastMessage} type={toastType} />

<div class="container-fluid p-4">
	<div class="mb-5">
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2rem;">Role Management</h1>
		<p class="lead" style="color: #7f8c8d;">Create and manage user roles</p>
	</div>

	{#if capabilities.canCreateRoles}
		<div class="mb-4">
			<a href="/dashboard/roles/new" class="btn" style="background-color: #27ae60; color: white; border: none; font-weight: 500;">
				+ Create New Role
			</a>
		</div>
	{/if}

	<!-- Roles Table -->
	<div class="card shadow-sm border-0 rounded-3">
		<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Roles ({roles.length})</h5>
		</div>
		<div class="table-responsive">
			<table class="table table-hover mb-0">
				<thead class="table-light">
					<tr>
						<th style="color: #2c3e50;">ID</th>
						<th style="color: #2c3e50;">Name</th>
						<th style="color: #2c3e50;">Description</th>
						<th style="color: #2c3e50;">Permissions</th>
						<th style="color: #2c3e50;">Created</th>
						<th style="color: #2c3e50;">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each roles as role (role.id)}
						<tr>
							<td><small style="color: #7f8c8d;">{role.id}</small></td>
							<td><strong style="color: #2c3e50;">{role.name}</strong></td>
							<td style="color: #7f8c8d;">{role.description || '—'}</td>
							<td>{role.permissions.join(', ')}</td>
							<td><small style="color: #7f8c8d;">{getFormattedDate(role.createdAt)}</small></td>
							<td>
								{#if capabilities.canUpdateRoles}
									<a href="/dashboard/roles/{role.id}"
										class="btn btn-sm btn-outline-primary">
										Edit
									</a>
								{/if}
								{#if capabilities.canDeleteRoles}
									<button on:click={() => openDeleteModal(role)}
										class="btn btn-sm btn-outline-danger">
										Delete
									</button>
								{/if}
							</td>
						</tr>
					{/each}
					{#if roles.length === 0}
						<tr>
							<td colspan="6" class="text-center text-muted py-4">No roles found.</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
	<div class="modal" style="display: block; background-color: rgba(0,0,0,0.5);">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header border-bottom" style="border-color: #e9ecef !important;">
					<h5 class="modal-title fw-bold" style="color: #2c3e50;">Delete Role</h5>
					<button type="button" class="btn-close" aria-label="Close" on:click={closeDeleteModal}></button>
				</div>
				<div class="modal-body p-4">
					<p class="mb-3" style="color: #2c3e50;">
						Are you sure you want to delete the role <strong>"{roleToDelete?.name}"</strong>?
					</p>
					<p class="text-muted small">This action cannot be undone.</p>
				</div>
				<div class="modal-footer border-top" style="border-color: #e9ecef !important;">
					<button type="button" class="btn btn-outline-secondary" on:click={closeDeleteModal}>Cancel</button>
					<button type="button" class="btn btn-danger" on:click={handleConfirmDelete}>Delete Role</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
