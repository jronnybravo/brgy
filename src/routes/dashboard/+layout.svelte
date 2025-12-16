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

	$: isActive = (path: string) => $page.url.pathname === path;
</script>

<div class="d-flex" style="height: 100vh;">
	<!-- Sidebar Navigation -->
	<nav class="navbar-sidebar bg-dark text-white d-flex flex-column" style="width: 280px; background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);">
		<div class="p-4 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
			<h2 class="h4 mb-2 fw-bold" style="color: #3498db;">
				<span>📍</span> Brgy Map
			</h2>
			<p class="mb-0 small" style="color: #95a5a6;">
				👤 {data.user.username}
			</p>
		</div>

		<div class="flex-grow-1 overflow-y-auto py-3">
			<div class="nav flex-column nav-pills">
				<a 
					href="/dashboard" 
					class="nav-link mb-2 mx-2" 
					class:active={isActive('/dashboard')}
					style="color: #95a5a6; transition: all 0.3s;"
				>
					📊 Dashboard
				</a>
				<a 
					href="/dashboard/people" 
					class="nav-link mb-2 mx-2" 
					class:active={isActive('/dashboard/people')}
					style="color: #95a5a6; transition: all 0.3s;"
				>
					👥 People
				</a>
				<a 
					href="/dashboard/assistances" 
					class="nav-link mx-2" 
					class:active={isActive('/dashboard/assistances')}
					style="color: #95a5a6; transition: all 0.3s;"
				>
					🤝 Assistances
				</a>
			</div>
		</div>

		<div class="p-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
			<button on:click={handleLogout} class="btn w-100" style="background-color: #e74c3c; color: white; border: none; font-weight: 500; transition: all 0.3s;">
				Logout
			</button>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-grow-1 overflow-y-auto" style="background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%);">
		<slot />
	</main>
</div>

<style>


	.navbar-sidebar {
		border-right: 1px solid #343a40;
		overflow-y: auto;
	}

	:global(.nav-link.active) {
		background-color: #3498db !important;
		color: white !important;
		border-radius: 8px;
	}

	:global(.nav-link:hover) {
		background-color: rgba(52, 152, 219, 0.2) !important;
		color: #3498db !important;
		border-radius: 8px;
	}

	@media (max-width: 768px) {
		.navbar-sidebar {
			width: 100% !important;
			border-right: none;
			border-bottom: 1px solid #343a40;
		}

		:global(.nav) {
			flex-direction: row;
		}

		:global(.nav-link) {
			flex: 1 !important;
			margin: 0 !important;
			padding: 0.75rem 0.5rem !important;
			text-align: center;
		}
	}
</style>
