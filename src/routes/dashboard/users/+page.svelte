<script lang="ts">
	import { onMount } from 'svelte';

	interface PageData {
		users: Array<{
			id: number;
			username: string;
			email: string;
			role: {
				id: number;
				name: string;
			};
			jurisdictions: Array<{
				id: number;
				name: string;
				type: string;
				parent?: {
					name: string;
				};
			}>;
			createdAt: Date;
			updatedAt: Date;
		}>;
		currentUser: {
			id: number;
		};
		capabilities: {
			canCreateUsers: boolean;
			canUpdateUsers: boolean;
			canDeleteUsers: boolean;
		};
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let filteredUsers = $state<Array<any>>([]);
	let searchQuery = $state('');
	let currentPage = $state(1);
	let sortColumn = $state('username');
	let sortDir = $state<'asc' | 'desc'>('asc');

	const pageSize = 10;
	const maxPageButtons = 5;
	const totalPages = $derived(Math.ceil(filteredUsers.length / pageSize));
	const paginatedUsers = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredUsers.slice(start, start + pageSize);
	});
	const pageNumbers = $derived.by(() => {
		let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
		let end = Math.min(totalPages, start + maxPageButtons - 1);
		
		// Adjust start if we're near the end
		if (end - start < maxPageButtons - 1) {
			start = Math.max(1, end - maxPageButtons + 1);
		}
		
		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	});

	// Initialize filteredUsers when data changes
	$effect(() => {
		filteredUsers = [...data.users];
	});

	function filterAndSort() {
		let result = [...data.users];

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(u) =>
					u.username.toLowerCase().includes(query) ||
					u.email.toLowerCase().includes(query) ||
					u.role?.name.toLowerCase().includes(query)
			);
		}

		// Sort
		result.sort((a, b) => {
			let aVal: any = a[sortColumn as keyof typeof a];
			let bVal: any = b[sortColumn as keyof typeof b];

			if (sortColumn === 'role') {
				aVal = a.role?.name || '';
				bVal = b.role?.name || '';
			}

			if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});

		filteredUsers = result;
		currentPage = 1;
	}

	function handleSearch(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		filterAndSort();
	}

	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDir = 'asc';
		}
		filterAndSort();
	}

	async function handleDeleteUser(userId: number, username: string) {
		if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('userId', userId.toString());

			const response = await fetch('?/deleteUser', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alert('User deleted successfully!');
				// Refresh users list
				const result = await response.json();
				if (result.data?.success) {
					filteredUsers = filteredUsers.filter((u) => u.id !== userId);
				}
			} else {
				alert('Failed to delete user');
			}
		} catch (error) {
			alert('Error deleting user');
			console.error(error);
		}
	}

	function getFormattedJurisdictions(jurisdictions: Array<any>): string {
		return jurisdictions
			.map((jurisdiction) => {
				if (jurisdiction.type === 'barangay' && jurisdiction.parent) {
					return `${jurisdiction.name}, ${jurisdiction.parent.name}`;
				}
				return jurisdiction.name;
			})
			.join('\n');
	}
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<div class="container-fluid p-4">
	<div class="mb-5">
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2rem;">User Management</h1>
		<p class="lead" style="color: #7f8c8d;">Create, edit, and manage user accounts</p>
	</div>

	{#if data.capabilities.canCreateUsers}
		<div class="mb-4">
			<a href="/dashboard/users/new" class="btn" style="background-color: #27ae60; color: white; border: none; font-weight: 500;">
				+ Create New User
			</a>
		</div>
	{/if}

	<!-- Users Table -->
	<div class="card shadow-sm border-0 rounded-3">
		<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Users ({filteredUsers.length})</h5>
		</div>
		<div class="card-body">
			<div class="mb-3">
				<input
					type="text"
					class="form-control"
					placeholder="Search by username, email, or role..."
					value={searchQuery}
					oninput={handleSearch}
				/>
			</div>
		</div>
		<div class="table-responsive">
			<table class="table table-hover mb-0">
				<thead class="table-light">
					<tr>
						<th style="color: #2c3e50; cursor: pointer;" onclick={() => handleSort('id')}>
							ID
							{#if (sortColumn === 'id')}
								{sortDir === 'asc' ? ' ↑' : ' ↓'}
							{/if}
						</th>
						<th style="color: #2c3e50; cursor: pointer;" onclick={() => handleSort('username')}>
							Username
							{#if (sortColumn === 'username')}
								{sortDir === 'asc' ? ' ↑' : ' ↓'}
							{/if}
						</th>
						<th style="color: #2c3e50; cursor: pointer;" onclick={() => handleSort('email')}>
							Email
							{#if (sortColumn === 'email')}
								{sortDir === 'asc' ? ' ↑' : ' ↓'}
							{/if}
						</th>
						<th style="color: #2c3e50; cursor: pointer;" onclick={() => handleSort('role')}>
							Role
							{#if (sortColumn === 'role')}
								{sortDir === 'asc' ? ' ↑' : ' ↓'}
							{/if}
						</th>
						<th style="color: #2c3e50;">Jurisdiction</th>
						<th style="color: #2c3e50;">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedUsers as user}
						<tr>
							<td><small style="color: #7f8c8d;">{user.id}</small></td>
							<td><strong style="color: #2c3e50;">{user.username}</strong></td>
							<td style="color: #7f8c8d;">{user.email}</td>
							<td>
								{user.role?.name}
							</td>
							<td>
								<small style="color: #7f8c8d; white-space: pre-line;">
									{getFormattedJurisdictions(user.jurisdictions || [])}
								</small>
							</td>
							<td>
								<div style="display: flex; gap: 0.5rem;">
									{#if data.capabilities.canUpdateUsers}
										<a href="/dashboard/users/{user.id}"
											class="btn btn-sm btn-outline-primary">
											Edit
										</a>
									{/if}
									{#if data.capabilities.canDeleteUsers}
										<button
											onclick={() => handleDeleteUser(user.id, user.username)}
											class="btn btn-sm btn-outline-danger"
											disabled={user.id === data.currentUser.id}
											title={user.id === data.currentUser.id ? 'Cannot delete your own account' : ''}>
											Delete
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
					{#if paginatedUsers.length === 0}
						<tr>
							<td colspan="6" class="text-center text-muted py-4">No users found.</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="card-footer bg-white border-top" style="border-color: #e9ecef !important;">
				<nav aria-label="User pagination">
					<ul class="pagination mb-0 justify-content-center">
						<li class="page-item" class:disabled={currentPage === 1}>
							<button
								class="page-link"
								onclick={() => (currentPage = 1)}
								disabled={currentPage === 1}>
								« First
							</button>
						</li>
						<li class="page-item" class:disabled={currentPage === 1}>
							<button
								class="page-link"
								onclick={() => (currentPage > 1 ? currentPage-- : null)}
								disabled={currentPage === 1}>
								‹ Previous
							</button>
						</li>
						{#each pageNumbers as page}
							<li class="page-item" class:active={page === currentPage}>
								<button
									class="page-link"
									onclick={() => (currentPage = page)}
									class:active={page === currentPage}>
									{page}
								</button>
							</li>
						{/each}
						<li class="page-item" class:disabled={currentPage === totalPages}>
							<button
								class="page-link"
								onclick={() => (currentPage < totalPages ? currentPage++ : null)}
								disabled={currentPage === totalPages}>
								Next ›
							</button>
						</li>
						<li class="page-item" class:disabled={currentPage === totalPages}>
							<button
								class="page-link"
								onclick={() => (currentPage = totalPages)}
								disabled={currentPage === totalPages}>
								Last »
							</button>
						</li>
					</ul>
				</nav>
				<div class="text-center mt-2">
					<small class="text-muted">
						Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
						users
					</small>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
