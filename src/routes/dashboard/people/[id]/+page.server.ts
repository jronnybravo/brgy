import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { Person } from '$lib/database/entities/Person';
import { Locality } from '$lib/database/entities/Locality';
import { instanceToPlain } from 'class-transformer';
import { User } from '$lib/database/entities/User';
import { Permission } from '$lib/utils/Permission';
import { AppDataSource } from '$lib/database/data-source';
import { In } from 'typeorm';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	const user = locals.user;
	if (!user) {
		redirect(302, '/login');
	}

    const currentUser = await User.findOne({
        where: { id: locals.user?.id },
        relations: { role: true, jurisdictions: true }
    });
    if(!currentUser) {
        cookies.delete('auth_token', { path: '/' });
        redirect(302, '/login');
    }
    if(!currentUser.can(Permission.READ_PERSONS)) {
        throw error(401, 'Unauthorized');
    }

    const allowedBarangays = await currentUser.getJurisdictionalBarangays();
    const allowedTowns = await currentUser.getJurisdictionalTowns();

	const isNew = params.id === 'new';
	let person = null;

	if (!isNew) {
		const id = parseInt(params.id);
		person = await Person.findOne({
			where: { id },
			relations: { barangay: { parent: true } }
		});

		if (!person) {
			redirect(302, '/dashboard/people');
		}
	}

	return {
		person: instanceToPlain(person),
		isNew,
		towns: instanceToPlain(allowedTowns),
		barangays: instanceToPlain(allowedBarangays)
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			return { success: false, error: 'Unauthorized' };
		}

		const formData = await request.formData();
		const personId = formData.get('personId');
		const method = personId ? 'PUT' : 'POST';
		const endpoint = personId ? `/api/people/${personId}` : '/api/people';

		try {
			const data = {
				firstName: formData.get('firstName'),
				lastName: formData.get('lastName'),
				middleName: formData.get('middleName') || null,
				extensionName: formData.get('extensionName') || null,
				birthdate: formData.get('birthdate'),
				sex: formData.get('sex'),
				barangayId: parseInt(formData.get('barangayId') as string) || null,
				purok: formData.get('purok') || null,
				isSupporter: formData.get('isSupporter') === 'on' ? true : null,
				isLeader: formData.get('isLeader') === 'on'
			};

			const res = await fetch(new URL(endpoint, 'http://localhost:5173'), {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!res.ok) {
				const errorData = await res.json();
				return {
					success: false,
					error: errorData.error || 'Failed to save person'
				};
			}

			return {
				success: true,
				message: personId ? 'Person updated successfully!' : 'Person created successfully!'
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Error saving person'
			};
		}
	}
};
