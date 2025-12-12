import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect already authenticated users away from login
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Allow unauthenticated users to view the login page
	return {};
};
