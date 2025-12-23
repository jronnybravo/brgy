<script lang="ts">
	type ToastType = 'success' | 'error' | 'info';
	
	let { message = '', type = 'success' as ToastType, visible = false, duration = 4000 } = $props<{message?: string, type?: ToastType, visible?: boolean, duration?: number}>();

	let timeout: NodeJS.Timeout;
	let isVisible = $state(visible);

	$effect(() => {
		if (isVisible) {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				isVisible = false;
			}, duration);
		}
	});

	function close() {
		clearTimeout(timeout);
		isVisible = false;
	}

	const bgColor: Record<'success' | 'error' | 'info', string> = {
		success: '#d4edda',
		error: '#f8d7da',
		info: '#d1ecf1'
	};

	const textColor: Record<'success' | 'error' | 'info', string> = {
		success: '#155724',
		error: '#721c24',
		info: '#0c5460'
	};

	const borderColor: Record<'success' | 'error' | 'info', string> = {
		success: '#c3e6cb',
		error: '#f5c6cb',
		info: '#bee5eb'
	};

	const icon = {
		success: '✓',
		error: '✕',
		info: 'ℹ'
	};
</script>

{#if isVisible}
	<div
		class="alert alert-{type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show"
		role="alert"
		style="
position: fixed;
top: 1rem;
right: 1rem;
z-index: 1050;
min-width: 300px;
animation: slideIn 0.3s ease-out;
background-color: {bgColor[type as ToastType]};
color: {textColor[type as ToastType]};
border: 1px solid {borderColor[type as ToastType]};
"
	>
		<strong>{icon[type as ToastType]}</strong> {message}
		<button type="button" class="btn-close" aria-label="Close" onclick={close}></button>
	</div>
{/if}

<style>
	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
