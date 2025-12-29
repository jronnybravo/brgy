import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { User } from '$lib/database/entities/User';
import { instanceToPlain } from 'class-transformer';

export const GET: RequestHandler = async ({ url, locals }) => {
    const user = locals.user ? await User.findOneBy({ id: locals.user.id }) : null;
    if (!user) {
        return json(
            {
                success: false,
                recordsTotal: 0,
                recordsFiltered: 0,
                data: [],
                error: 'Unauthorized'
            },
            { status: 401 }
        );
    }

    const towns = await user.getJurisdictionalTowns();
    return json(
        {
            success: true,
            data: instanceToPlain(towns)
        }
    );
}