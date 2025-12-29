import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const POST: RequestHandler = async ({ request, cookies }) => {
	console.log('[LOGIN API] Request received');
	try {
		const { username, password } = await request.json();
		console.log('[LOGIN API] Parsed body:', { username, password });

		if (!username || !password) {
			console.log('[LOGIN API] Missing credentials');
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		console.log('[LOGIN API] Getting data source...');
		const dataSource = await getDataSource();
		console.log('[LOGIN API] Got data source');
		
		const userRepository = dataSource.getRepository(User);
		console.log('[LOGIN API] Got user repository');

		// Find user by username or email
		console.log('[LOGIN API] Searching for user:', username);
		const user = await userRepository.findOne({
			where: [{ username }, { email: username }]
		});
		console.log('[LOGIN API] User found:', user ? user.username : 'NOT FOUND');

		if (!user) {
			console.log('[LOGIN API] User not found');
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Verify password
		console.log('[LOGIN API] Comparing passwords...');
		const isValidPassword = await bcrypt.compare(password, user.password);
		console.log('[LOGIN API] Password valid:', isValidPassword);
		
		if (!isValidPassword) {
			console.log('[LOGIN API] Invalid password');
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Create JWT token
		console.log('[LOGIN API] Creating JWT token...');
		const token = jwt.sign(
			{ userId: user.id, username: user.username, role: user.role },
			JWT_SECRET,
			{ expiresIn: '7d' }
		);
		console.log('[LOGIN API] JWT token created');

		// Set cookie
		console.log('[LOGIN API] Setting cookie...');
		cookies.set('auth_token', token, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});
		console.log('[LOGIN API] Cookie set, returning success');

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
		console.error('[LOGIN API] Error:', error);
		return json({ error: 'An error occurred during login' }, { status: 500 });
	}
};
