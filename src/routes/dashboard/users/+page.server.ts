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

	// Fetch all users (without passwords)
	const users = await userRepository.find({
		order: {
			id: 'ASC'
		}
	});

	const safeUsers = users.map((user) => ({
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt
	}));

	return {
		users: safeUsers,
		currentUser: {
			id: locals.user.id,
			username: locals.user.username,
			role: locals.user.role
		}
	};
};

export const actions = {
	createUser: async ({ request }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();
		const role = formData.get('role')?.toString() || 'user';

		// Validation
		if (!username || !email || !password) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Username, email, and password are required'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Password must be at least 6 characters long'
			});
		}

		if (email && !email.includes('@')) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Invalid email format'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			// Check if user already exists
			const existingUser = await userRepository.findOne({
				where: [{ username }, { email }]
			});

			if (existingUser) {
				return fail(400, {
					username,
					email,
					role,
					error: 'Username or email already exists'
				});
			}

			// Hash password
			const hashedPassword = await bcrypt.hash(password, 10);

			// Create new user
			const user = userRepository.create({
				username,
				email,
				password: hashedPassword,
				role,
			});

			await userRepository.save(user);

			return {
				success: true,
				message: 'User created successfully'
			};
		} catch (error) {
			console.error('Create user error:', error);
			return fail(500, {
				username,
				email,
				role,
				error: 'Failed to create user'
			});
		}
	},

	updateUser: async ({ request }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId')?.toString() || '0');
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();
		const role = formData.get('role')?.toString();

		// Validation
		if (!username || !email) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Username and email are required'
			});
		}

		if (password && password.length < 6) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Password must be at least 6 characters long'
			});
		}

		if (email && !email.includes('@')) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Invalid email format'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			const user = await userRepository.findOne({
				where: { id: userId }
			});

			if (!user) {
				return fail(404, {
					username,
					email,
					role,
					error: 'User not found'
				});
			}

			// Check if email is already taken by another user
			if (email !== user.email) {
				const existingEmail = await userRepository.findOne({
					where: { email }
				});

				if (existingEmail) {
					return fail(400, {
						username,
						email,
						role,
						error: 'Email already in use'
					});
				}
			}

			// Check if username is already taken by another user
			if (username !== user.username) {
				const existingUsername = await userRepository.findOne({
					where: { username }
				});

				if (existingUsername) {
					return fail(400, {
						username,
						email,
						role,
						error: 'Username already in use'
					});
				}
			}

			// Update user
			user.username = username;
			user.email = email;
			user.role = role || 'user';

			if (password) {
				user.password = await bcrypt.hash(password, 10);
			}

			await userRepository.save(user);

			return {
				success: true,
				message: 'User updated successfully'
			};
		} catch (error) {
			console.error('Update user error:', error);
			return fail(500, {
				username,
				email,
				role,
				error: 'Failed to update user'
			});
		}
	},

	deleteUser: async ({ request }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId')?.toString() || '0');

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			const user = await userRepository.findOne({
				where: { id: userId }
			});

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			await userRepository.remove(user);

			return {
				success: true,
				message: 'User deleted successfully'
			};
		} catch (error) {
			console.error('Delete user error:', error);
			return fail(500, {
				error: 'Failed to delete user'
			});
		}
	}
};
