import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Pass user data to the page
	return {
		user: locals.user
	};
};
