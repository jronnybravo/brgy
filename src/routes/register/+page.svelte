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

<div class="register-container">
	<div class="register-box">
		<h1>Barangay Mapping System</h1>
		<h2>Create Account</h2>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form on:submit={handleRegister}>
			<div class="form-group">
				<label for="username">Username</label>
				<input
					type="text"
					id="username"
					bind:value={formData.username}
					required
					disabled={loading}
					placeholder="Choose a username"
				/>
			</div>

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={formData.email}
					required
					disabled={loading}
					placeholder="Enter your email"
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={formData.password}
					required
					disabled={loading}
					placeholder="At least 6 characters"
				/>
			</div>

			<div class="form-group">
				<label for="confirmPassword">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					bind:value={formData.confirmPassword}
					required
					disabled={loading}
					placeholder="Confirm your password"
				/>
			</div>

			<button type="submit" disabled={loading}>
				{loading ? 'Creating Account...' : 'Create Account'}
			</button>
		</form>

		<p class="login-link">
			Already have an account? <a href="/login">Login here</a>
		</p>
	</div>
</div>

<style>
	.register-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
	}

	.register-box {
		background: white;
		padding: 40px;
		border-radius: 10px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 10px;
		font-size: 1.5rem;
	}

	h2 {
		text-align: center;
		color: #666;
		margin-bottom: 30px;
		font-size: 1.2rem;
	}

	.error-message {
		background-color: #fee;
		color: #c33;
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 20px;
		text-align: center;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 5px;
		color: #333;
		font-weight: 500;
	}

	input {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 5px;
		font-size: 16px;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
	}

	input:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	button {
		width: 100%;
		padding: 12px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s;
	}

	button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-link {
		text-align: center;
		margin-top: 20px;
		color: #666;
	}

	.login-link a {
		color: #667eea;
		text-decoration: none;
		font-weight: 600;
	}

	.login-link a:hover {
		text-decoration: underline;
	}
</style>
