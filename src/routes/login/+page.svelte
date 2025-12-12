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

<div class="login-container">
	<div class="login-box">
		<h1>Barangay Mapping System</h1>
		<h2>Login</h2>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form on:submit={handleLogin}>
			<div class="form-group">
				<label for="username">Username or Email</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					required
					disabled={loading}
					placeholder="Enter your username or email"
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					disabled={loading}
					placeholder="Enter your password"
				/>
			</div>

			<button type="submit" disabled={loading}>
				{loading ? 'Logging in...' : 'Login'}
			</button>
		</form>

		<p class="register-link">
			Don't have an account? <a href="/register">Register here</a>
		</p>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
	}

	.login-box {
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

	.register-link {
		text-align: center;
		margin-top: 20px;
		color: #666;
	}

	.register-link a {
		color: #667eea;
		text-decoration: none;
		font-weight: 600;
	}

	.register-link a:hover {
		text-decoration: underline;
	}
</style>
