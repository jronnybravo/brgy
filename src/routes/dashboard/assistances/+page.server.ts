import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    const currentUser = await User.findOne({
		where: { id: locals.user.id },
		relations: { role: true }
	});
    if (!currentUser) {
        cookies.delete('auth_token', { path: '/' });
        throw redirect(302, '/login');
    }

    if(!currentUser.can(Permission.READ_ASSISTANCES)) {
        throw error(401, 'Unauthorized');
    }

    const capabilities = {
        canCreateAssistances: currentUser.can(Permission.CREATE_ASSISTANCES),
        canUpdateAssistances: currentUser.can(Permission.UPDATE_ASSISTANCES),
        canDeleteAssistances: currentUser.can(Permission.DELETE_ASSISTANCES),
    };

    return {
        user: locals.user,
        capabilities
    };
};
