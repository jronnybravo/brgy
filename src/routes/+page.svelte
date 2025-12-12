<script lang="ts">
	// This page is handled by +page.server.ts and will redirect
	// Authenticated users go to /dashboard
	// Unauthenticated users go to /login
</script>

<div class="redirect-container">
	<p>Redirecting...</p>
</div>

<style>
	.redirect-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		font-size: 1.2rem;
	}
</style>
