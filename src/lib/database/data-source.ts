import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Locality } from './entities/Locality';
import { Voter } from './entities/Voter';

// Load environment variables from .env file
config();

export const AppDataSource = new DataSource({
	type: 'mysql',
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '3306'),
	username: process.env.DB_USERNAME || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_DATABASE || 'brgy_mapping',
	synchronize: process.env.NODE_ENV === 'development', // Auto-sync schema in development
	logging: process.env.NODE_ENV === 'development',
	entities: [Locality, Voter],
	migrations: [],
	subscribers: []
});

let initialized = false;

export async function initializeDatabase() {
	if (!initialized) {
		await AppDataSource.initialize();
		initialized = true;
		console.log('Database connection initialized');
	}
	return AppDataSource;
}

export async function getDataSource() {
	if (!initialized) {
		await initializeDatabase();
	}
	return AppDataSource;
}

