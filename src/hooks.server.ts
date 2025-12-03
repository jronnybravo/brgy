import { initializeDatabase } from '$lib/database/data-source';
import 'reflect-metadata';

// Initialize database connection when server starts
initializeDatabase().catch((error) => {
	console.error('Failed to initialize database:', error);
});

