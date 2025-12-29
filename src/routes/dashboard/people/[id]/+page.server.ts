import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { Person } from '$lib/database/entities/Person';
import { Locality } from '$lib/database/entities/Locality';
import { instanceToPlain } from 'class-transformer';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		redirect(302, '/login');
	}

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

	// Get Siquijor Province
	const allLocalities = await Locality.find();
	const siquijor = allLocalities.find(l => l.name?.includes('SIQUIJOR') && l.type === 'province');

	let municipalities: any[] = [];
	let barangays: any[] = [];

	if (siquijor) {
		const muns = allLocalities.filter(l => l.parentId === siquijor.id && (l.type === 'municipality' || l.type === 'city'));
		municipalities = muns.sort((a, b) => a.name.localeCompare(b.name));

		const barIds = muns.map(m => m.id);
		const allBarangays = allLocalities.filter(l => l.parentId && barIds.includes(l.parentId) && l.type === 'barangay');
		barangays = allBarangays.sort((a, b) => a.name.localeCompare(b.name));
	}

	return {
		person: instanceToPlain(person),
		isNew,
		municipalities: instanceToPlain(municipalities),
		barangays: instanceToPlain(barangays)
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
