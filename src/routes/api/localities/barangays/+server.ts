import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { instanceToPlain } from 'class-transformer';
import { Locality } from '$lib/database/entities/Locality';

export const GET: RequestHandler = async ({ url, locals }) => {
    const towns = await Locality.find({ where: { type: 'barangay' } });
    return json(
        {
            success: true,
            data: instanceToPlain(towns)
        }
    );
}