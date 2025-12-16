import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }) => {
	// Redirect already authenticated users to dashboard
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Allow unauthenticated users to view the register page
	return {};
};
