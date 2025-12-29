<script lang="ts">
	import UserDetails from '$lib/components/UserDetails.svelte';

	interface PageData {
		user: {
			id: number;
			username: string;
			email: string;
			roleId: number | null;
		};
	}

	let { data, form }: { data: PageData; form: any } = $props();
</script>

<div class="container-fluid p-4">
	<div class="mb-5">
		<h1 class="display-5 fw-bold" style="color: #2c3e50; font-size: 2.5rem; letter-spacing: -0.5px;">My Account</h1>
		<p class="lead" style="color: #7f8c8d; margin-top: 0.5rem;">Manage your account details and security settings</p>
	</div>

	<UserDetails 
		user={data.user} 
		{form}
	/>
</div>

<style>
	:global(.container-fluid) {
		background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);
	}
</style>
