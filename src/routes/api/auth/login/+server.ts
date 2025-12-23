import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		const dataSource = await getDataSource();
		const userRepository = dataSource.getRepository(User);

		// Find user by username or email
		const user = await userRepository.findOne({
			where: [{ username }, { email: username }]
		});

		if (!user) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password);
		if (!isValidPassword) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Create JWT token
		const token = jwt.sign(
			{ userId: user.id, username: user.username, role: user.role },
			JWT_SECRET,
			{ expiresIn: '7d' }
		);

		// Set cookie
		cookies.set('auth_token', token, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

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
		console.error('Login error:', error);
		return json({ error: 'An error occurred during login' }, { status: 500 });
	}
};
