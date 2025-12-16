<script lang="ts">
	import { goto } from '$app/navigation';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (response.ok) {
				// Redirect to dashboard
				goto('/dashboard');
			} else {
				error = data.error || 'Login failed';
			}
		} catch (e) {
			error = 'An error occurred during login';
			console.error('Login error:', e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Barangay Mapping System</title>
</svelte:head>

<div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-md-5">
				<div class="card shadow-lg border-0">
					<div class="card-body p-5">
						<h1 class="card-title text-center mb-2 fw-bold text-primary">Barangay Mapping System</h1>
						<h2 class="card-subtitle text-center text-muted mb-4 fs-5">Login to Your Account</h2>

						{#if error}
							<div class="alert alert-danger alert-dismissible fade show" role="alert">
								<strong>Error!</strong> {error}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>
						{/if}

						<form on:submit={handleLogin}>
							<div class="mb-3">
								<label for="username" class="form-label fw-500">Username or Email</label>
								<input
									type="text"
									class="form-control form-control-lg"
									id="username"
									bind:value={username}
									required
									disabled={loading}
									placeholder="Enter your username or email"
								/>
							</div>

							<div class="mb-4">
								<label for="password" class="form-label fw-500">Password</label>
								<input
									type="password"
									class="form-control form-control-lg"
									id="password"
									bind:value={password}
									required
									disabled={loading}
									placeholder="Enter your password"
								/>
							</div>

							<button type="submit" class="btn btn-primary btn-lg w-100 fw-600" disabled={loading}>
								{loading ? 'Logging in...' : 'Login'}
							</button>
						</form>

						<hr class="my-4" />

						<p class="text-center text-muted mb-0">
							Don't have an account? <a href="/register" class="text-primary fw-600 text-decoration-none">Register here</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.min-vh-100) {
		min-height: 100vh;
	}
</style>
