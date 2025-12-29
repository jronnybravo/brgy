import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const dataSource = await getDataSource();
	const userRepository = dataSource.getRepository(User);

	// Fetch current user details (without password)
	const user = await userRepository.findOne({
		where: { id: locals.user.id },
		relations: { role: true }
	});

	if (!user) {
		throw redirect(302, '/login');
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			roleId: user.roleId
		}
	};
};

export const actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();

		// Validation
		if (!username || !email) {
			return fail(400, {
				username,
				email,
				error: 'Username and email are required'
			});
		}

		if (email && !email.includes('@')) {
			return fail(400, {
				username,
				email,
				error: 'Invalid email format'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			// Check if email is already taken by another user
			const existingUser = await userRepository.findOne({
				where: [{ email }]
			});

			if (existingUser && existingUser.id !== locals.user.id) {
				return fail(400, {
					username,
					email,
					error: 'Email already in use'
				});
			}

			// Check if username is already taken by another user
			const existingUsername = await userRepository.findOne({
				where: [{ username }]
			});

			if (existingUsername && existingUsername.id !== locals.user.id) {
				return fail(400, {
					username,
					email,
					error: 'Username already in use'
				});
			}

			// Update user
			const user = await userRepository.findOne({
				where: { id: locals.user.id }
			});

			if (!user) {
				throw redirect(302, '/login');
			}

			user.username = username;
			user.email = email;

			await userRepository.save(user);

			return {
				success: true,
				message: 'Profile updated successfully'
			};
		} catch (error) {
			console.error('Profile update error:', error);
			return fail(500, {
				username,
				email,
				error: 'Failed to update profile'
			});
		}
	},

	updatePassword: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		// Validation
		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, {
				passwordError: 'All password fields are required'
			});
		}

		if (newPassword.length < 6) {
			return fail(400, {
				passwordError: 'New password must be at least 6 characters long'
			});
		}

		if (newPassword !== confirmPassword) {
			return fail(400, {
				passwordError: 'Passwords do not match'
			});
		}

		if (currentPassword === newPassword) {
			return fail(400, {
				passwordError: 'New password must be different from current password'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			const user = await userRepository.findOne({
				where: { id: locals.user.id }
			});

			if (!user) {
				throw redirect(302, '/login');
			}

			// Verify current password
			const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
			if (!isPasswordValid) {
				return fail(401, {
					passwordError: 'Current password is incorrect'
				});
			}

			// Hash new password
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			user.password = hashedPassword;

			await userRepository.save(user);

			return {
				passwordSuccess: true,
				passwordMessage: 'Password updated successfully'
			};
		} catch (error) {
			console.error('Password update error:', error);
			return fail(500, {
				passwordError: 'Failed to update password'
			});
		}
	}
};
