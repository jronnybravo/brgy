import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { username, email, password } = await request.json();

		if (!username || !email || !password) {
			return json({ error: 'Username, email, and password are required' }, { status: 400 });
		}

		const dataSource = await getDataSource();
		const userRepository = dataSource.getRepository(User);

		// Check if user already exists
		const existingUser = await userRepository.findOne({
			where: [{ username }, { email }]
		});

		if (existingUser) {
			return json({ error: 'Username or email already exists' }, { status: 400 });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create new user - always create as 'user' role
		const user = userRepository.create({
			username,
			email,
			password: hashedPassword,
			role: 'user',
			isActive: true
		});

		await userRepository.save(user);

		return json({
			success: true,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Register error:', error);
		return json({ error: 'An error occurred during registration' }, { status: 500 });
	}
};
