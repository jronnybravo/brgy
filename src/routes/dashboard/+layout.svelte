<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface PageData {
		user: {
			id: number;
			username: string;
			role: string;
		};
	}

	export let data: PageData;

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/login');
		} catch (e) {
			console.error('Logout error:', e);
		}
	}

	const isActive = (path: string) => $page.url.pathname === path;
</script>

<div class="layout">
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2>Brgy Map</h2>
			<p class="user">👤 {data.user.username}</p>
		</div>

		<nav class="nav-menu">
			<a href="/dashboard" class="nav-link" class:active={isActive('/dashboard')}>
				📊 Dashboard
			</a>
			<a href="/dashboard/people" class="nav-link" class:active={isActive('/dashboard/people')}>
				👥 People
			</a>
		</nav>

		<div class="sidebar-footer">
			<button on:click={handleLogout} class="logout-btn">Logout</button>
		</div>
	</aside>

	<main class="main-content">
		<slot />
	</main>
</div>

<style>
	.layout {
		display: flex;
		height: 100vh;
		background: #0f0f23;
	}

	.sidebar {
		width: 260px;
		background: linear-gradient(180deg, #1a1a3e 0%, #2d1b4e 100%);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		color: white;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 2rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sidebar-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		background: linear-gradient(90deg, #fff, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.user {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.nav-menu {
		flex: 1;
		padding: 1.5rem 0;
		list-style: none;
		margin: 0;
	}

	.nav-link {
		display: block;
		padding: 1rem 1.5rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		transition: all 0.2s;
		border-left: 3px solid transparent;
		font-size: 0.95rem;
	}

	.nav-link:hover {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.9);
	}

	.nav-link.active {
		background: rgba(167, 139, 250, 0.2);
		color: #a78bfa;
		border-left-color: #a78bfa;
	}

	.sidebar-footer {
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.logout-btn {
		width: 100%;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.2);
		color: #ff6b6b;
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	@media (max-width: 768px) {
		.layout {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		.nav-menu {
			display: flex;
			padding: 1rem 0;
			gap: 0;
		}

		.nav-link {
			flex: 1;
			padding: 1rem;
			border-left: none;
			border-bottom: 3px solid transparent;
			text-align: center;
		}

		.nav-link.active {
			border-left: none;
			border-bottom-color: #a78bfa;
		}

		.main-content {
			min-height: 100%;
		}
	}
</style>
