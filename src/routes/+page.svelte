<script lang="ts">
	// This page is handled by +page.server.ts and will redirect
	// Authenticated users go to /dashboard
	// Unauthenticated users go to /login
</script>

<div class="d-flex align-items-center justify-content-center min-vh-100 bg-gradient">
	<div class="text-center">
		<h1 class="display-4 fw-bold mb-4 text-primary">Redirecting...</h1>
		<div class="spinner-border text-primary" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
		<p class="text-muted mt-3">Please wait while we redirect you to your destination.</p>
	</div>
</div>

<style>
	:global(.bg-gradient) {
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	}

	:global(.min-vh-100) {
		min-height: 100vh;
	}
</style>
