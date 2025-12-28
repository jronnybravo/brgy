<script lang="ts">
	import UserDetails from '$lib/components/UserDetails.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { goto } from '$app/navigation';

	interface LocalityNode {
		id: number;
		name: string;
		children: LocalityNode[];
	}

	interface PageData {
		user: {
			id: number;
			username: string;
			email: string;
			roleId: number | null;
			jurisdictionIds?: number[];
		} | null;
		isNew: boolean;
		currentUser: {
			id: number;
			username: string;
		};
		localities: LocalityNode[];
	}

	export let data: PageData;
	export let form;

	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'info' = 'info';

	$: pageTitle = data.isNew ? 'Create New User' : `Edit User - ${data.user?.username}`;
	$: pageDescription = data.isNew ? 'Add a new user to the system' : `Update ${data.user?.username}'s account details`;

	// Handle form success - redirect after showing toast
	$: if (form?.success) {
		showToast = true;
		toastMessage = form.message || 'User created successfully!';
		toastType = 'success';
		
		// Redirect to users list after a short delay
		setTimeout(() => {
			goto('/dashboard/users');
		}, 1500);
	}

	// Handle form errors
	$: if (form?.error) {
		showToast = true;
		toastMessage = form.error;
		toastType = 'error';
	}

	function handleCancel() {
		goto('/dashboard/users');
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
					← Back to Users
				</button>
			</nav>
		</div>
	</div>

	<div class="row g-4">
		<UserDetails
			user={data.user}
			{form}
			isNew={data.isNew}
			localities={data.localities}
		/>
	</div>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
