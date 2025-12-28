<script lang="ts">

	interface PageData {
		users: Array<{
			id: number;
			username: string;
			email: string;
			role: {
				id: number;
				name: string;
			};
			createdAt: Date;
			updatedAt: Date;
		}>;
		currentUser: {
			id: number;
		};
	}

	export let data: PageData;

	let users = data.users;

	$: users = data.users;

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
					users = users.filter((u) => u.id !== userId);
				}
			} else {
				alert('Failed to delete user');
			}
		} catch (error) {
			alert('Error deleting user');
			console.error(error);
		}
	}

	function getFormattedDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
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

	<!-- Create User Form Section -->
	<div class="mb-4">
		<a href="/dashboard/users/new" class="btn" style="background-color: #27ae60; color: white; border: none; font-weight: 500;">
			+ Create New User
		</a>
	</div>

	<!-- Users Table -->
	<div class="card shadow-sm border-0 rounded-3">
		<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
			<h5 class="mb-0 fw-bold" style="color: #2c3e50;">Users ({users.length})</h5>
		</div>
		<div class="table-responsive">
			<table class="table table-hover mb-0">
				<thead class="table-light">
					<tr>
						<th style="color: #2c3e50;">ID</th>
						<th style="color: #2c3e50;">Username</th>
						<th style="color: #2c3e50;">Email</th>
						<th style="color: #2c3e50;">Role</th>
						<th style="color: #2c3e50;">Created</th>
						<th style="color: #2c3e50;">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user}
						<tr>
							<td><small style="color: #7f8c8d;">{user.id}</small></td>
							<td><strong style="color: #2c3e50;">{user.username}</strong></td>
							<td style="color: #7f8c8d;">{user.email}</td>
							<td>
								{user.role.name}
							</td>
							<td><small style="color: #7f8c8d;">{getFormattedDate(user.createdAt)}</small></td>
							<td>
								<a href="/dashboard/users/{user.id}"
									class="btn btn-sm btn-outline-primary">
									Edit
								</a>
								<button
									on:click={() => handleDeleteUser(user.id, user.username)}
									class="btn btn-sm btn-outline-danger"
									disabled={user.id === data.currentUser.id}
									title={user.id === data.currentUser.id ? 'Cannot delete your own account' : ''}>
									Delete
								</button>
							</td>
						</tr>
					{/each}
					{#if users.length === 0}
						<tr>
							<td colspan="7" class="text-center text-muted py-4">No users found.</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
