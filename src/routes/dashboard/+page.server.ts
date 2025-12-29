import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';
import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals, cookies }) => {
	const currentUser = await User.findOne({
		where: { id: locals.user?.id },
		relations: { role: true }
	});
	if (!currentUser) {
		cookies.delete('auth_token', { path: '/' });
		throw redirect(302, '/login');
	}

	const capabilities = {
		canReadReports: currentUser.can(Permission.READ_REPORTS),
	}

	// Pass user data to the page
	return {
		user: locals.user,
		capabilities,
	};
};
