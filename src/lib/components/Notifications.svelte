<script lang="ts">
	import { onMount } from 'svelte';

	interface Notification {
		id: number;
		type: string;
		message: string;
		link: string | null;
		createdAt: string;
		readAt: string | null;
	}

	let notifications: Notification[] = $state([]);
	let showDropdown = $state(false);
	let loading = $state(false);

	async function fetchNotifications() {
		try {
			const response = await fetch('/api/notifications');
			const data = await response.json();
			if (data.success) {
				notifications = data.notifications;
			}
		} catch (error) {
			console.error('Error fetching notifications:', error);
		}
	}

	async function markAsRead(id: number) {
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'mark-as-read', id })
			});
			const data = await response.json();
			if (data.success) {
				await fetchNotifications();
			}
		} catch (error) {
			console.error('Error marking as read:', error);
		}
	}

	async function markAllAsRead() {
		try {
			loading = true;
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'mark-all-as-read' })
			});
			const data = await response.json();
			if (data.success) {
				await fetchNotifications();
				showDropdown = false;
			}
		} catch (error) {
			console.error('Error marking all as read:', error);
		} finally {
			loading = false;
		}
	}

	const unreadCount = $derived(notifications.filter(n => !n.readAt).length);

	onMount(() => {
		fetchNotifications();
		// Refresh notifications every 30 seconds
		const interval = setInterval(fetchNotifications, 30000);
		return () => clearInterval(interval);
	});
</script>

<div style="position: relative;">
	<button
		class="btn btn-sm"
		onclick={() => (showDropdown = !showDropdown)}
		style="background: none; border: none; color: #95a5a6; cursor: pointer; position: relative;"
		title="Notifications"
	>
		<i class="bi bi-bell"></i>
		{#if unreadCount > 0}
			<span
				style="position: absolute; top: -5px; right: -5px; background-color: #e74c3c; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;"
			>
				{unreadCount}
			</span>
		{/if}
	</button>

	{#if showDropdown}
		<div
			style="position: absolute; top: 35px; right: 0; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 350px; max-height: 400px; overflow-y: auto; z-index: 1000;"
		>
			<div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
				<h6 style="margin: 0; font-weight: 600; color: #2c3e50;">Notifications</h6>
				{#if unreadCount > 0}
					<button
						class="btn btn-sm"
						onclick={markAllAsRead}
						disabled={loading}
						style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; text-decoration: underline;"
					>
						{loading ? 'Loading...' : 'Mark all as read'}
					</button>
				{/if}
			</div>

			{#if notifications.length === 0}
				<div style="padding: 20px; text-align: center; color: #95a5a6;">
					No notifications
				</div>
			{:else}
				{#each notifications as notification (notification.id)}
					<div
						style="padding: 12px; border-bottom: 1px solid #f0f0f0; background-color: {notification.readAt
							? '#fff'
							: '#f8f9fa'};"
					>
						<div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
							<div style="flex: 1;">
								<p style="margin: 0 0 4px 0; font-size: 14px; color: #2c3e50; font-weight: {notification.readAt
									? '400'
									: '600'};">
									{notification.message}
								</p>
								<span style="font-size: 12px; color: #95a5a6;">
									{new Date(notification.createdAt).toLocaleDateString()}
								</span>
							</div>
							{#if !notification.readAt}
								<button
									class="btn btn-sm"
									onclick={() => markAsRead(notification.id)}
									style="background: none; border: none; color: #3498db; cursor: pointer; padding: 0; font-size: 12px;"
									title="Mark as read"
								>
									<i class="bi bi-check"></i>
								</button>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>
