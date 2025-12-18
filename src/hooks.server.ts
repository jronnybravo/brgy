import { initializeDatabase } from '$lib/database/data-source';
import 'reflect-metadata';
import jwt from 'jsonwebtoken';
import type { Handle } from '@sveltejs/kit';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize database connection when server starts with error handling
initializeDatabase().catch((error) => {
	console.error('⚠️ Initial database connection failed:', error);
	console.error('The server will continue running and retry on first request.');
});

export const handle: Handle = async ({ event, resolve }) => {
	// Get token from cookies
	const token = event.cookies.get('auth_token');

	if (token) {
		try {
			// Verify and decode token
			const decoded = jwt.verify(token, JWT_SECRET) as {
				userId: number;
				username: string;
				role: string;
			};

			// Add user info to locals
			event.locals.user = {
				id: decoded.userId,
				username: decoded.username,
				role: decoded.role
			};
		} catch (error) {
			// Invalid token, clear cookie
			event.cookies.delete('auth_token', { path: '/' });
		}
	}

	return resolve(event);
};

