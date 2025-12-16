<script lang="ts">
	import { goto } from '$app/navigation';

	let formData = {
		username: '',
		email: '',
		password: '',
		confirmPassword: ''
	};

	let error = '';
	let loading = false;

	async function handleRegister(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		// Validate passwords match
		if (formData.password !== formData.confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		// Validate password length
		if (formData.password.length < 6) {
			error = 'Password must be at least 6 characters long';
			loading = false;
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: formData.username,
					email: formData.email,
					password: formData.password,
					role: 'user'
				})
			});

			const data = await response.json();

			if (response.ok) {
				// Redirect to login
				goto('/login?registered=true');
			} else {
				error = data.error || 'Registration failed';
			}
		} catch (e) {
			error = 'An error occurred during registration';
			console.error('Registration error:', e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Register - Barangay Mapping System</title>
</svelte:head>

<div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
	<div class="container">
		<div class="row justify-content-center">
			<div class="col-md-5">
				<div class="card shadow-lg border-0">
					<div class="card-body p-5">
						<h1 class="card-title text-center mb-2 fw-bold text-primary">Barangay Mapping System</h1>
						<h2 class="card-subtitle text-center text-muted mb-4 fs-5">Create Your Account</h2>

						{#if error}
							<div class="alert alert-danger alert-dismissible fade show" role="alert">
								<strong>Error!</strong> {error}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>
						{/if}

						<form on:submit={handleRegister}>
							<div class="mb-3">
								<label for="username" class="form-label fw-500">Username</label>
								<input
									type="text"
									class="form-control form-control-lg"
									id="username"
									bind:value={formData.username}
									required
									disabled={loading}
									placeholder="Choose a username"
								/>
							</div>

							<div class="mb-3">
								<label for="email" class="form-label fw-500">Email</label>
								<input
									type="email"
									class="form-control form-control-lg"
									id="email"
									bind:value={formData.email}
									required
									disabled={loading}
									placeholder="Enter your email"
								/>
							</div>

							<div class="mb-3">
								<label for="password" class="form-label fw-500">Password</label>
								<input
									type="password"
									class="form-control form-control-lg"
									id="password"
									bind:value={formData.password}
									required
									disabled={loading}
									placeholder="At least 6 characters"
								/>
							</div>

							<div class="mb-4">
								<label for="confirmPassword" class="form-label fw-500">Confirm Password</label>
								<input
									type="password"
									class="form-control form-control-lg"
									id="confirmPassword"
									bind:value={formData.confirmPassword}
									required
									disabled={loading}
									placeholder="Confirm your password"
								/>
							</div>

							<button type="submit" class="btn btn-primary btn-lg w-100 fw-600" disabled={loading}>
								{loading ? 'Creating Account...' : 'Create Account'}
							</button>
						</form>

						<hr class="my-4" />

						<p class="text-center text-muted mb-0">
							Already have an account? <a href="/login" class="text-primary fw-600 text-decoration-none">Login here</a>
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

	:global(.fw-500) {
		font-weight: 500;
	}

	:global(.fw-600) {
		font-weight: 600;
	}
</style>
