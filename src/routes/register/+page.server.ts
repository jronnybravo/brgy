import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect already authenticated users to dashboard
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Allow unauthenticated users to view the register page
	return {};
};
