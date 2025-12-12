import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Locality } from './entities/Locality';
import { Voter } from './entities/Voter';
import { Election } from './entities/Election';
import { ElectionContest } from './entities/ElectionContest';
import { Candidate } from './entities/Candidate';
import { ElectionResult } from './entities/ElectionResult';
import { User } from './entities/User';
import { People } from './entities/People';

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
	entities: [Locality, Voter, Election, ElectionContest, Candidate, ElectionResult, User, People],
	migrations: [],
	subscribers: []
});

let initializationPromise: Promise<DataSource> | null = null;

export async function initializeDatabase(): Promise<DataSource> {
	// Return existing connection if already initialized
	if (AppDataSource.isInitialized) {
		return AppDataSource;
	}
	
	// If initialization is in progress, wait for it
	if (initializationPromise) {
		return initializationPromise;
	}
	
	// Start initialization and store the promise to prevent race conditions
	initializationPromise = AppDataSource.initialize()
		.then(() => {
			console.log('Database connection initialized');
			return AppDataSource;
		})
		.catch((error) => {
			// Reset promise on error so retry is possible
			initializationPromise = null;
			throw error;
		});
	
	return initializationPromise;
}

export async function getDataSource(): Promise<DataSource> {
	if (!AppDataSource.isInitialized) {
		await initializeDatabase();
	}
	return AppDataSource;
}

