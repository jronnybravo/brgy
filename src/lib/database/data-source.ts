import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Locality } from './entities/Locality';
import { Election } from './entities/Election';
import { ElectionContest } from './entities/ElectionContest';
import { Candidate } from './entities/Candidate';
import { ElectionResult } from './entities/ElectionResult';
import { User } from './entities/User';
import { Person } from './entities/Person';
import { Assistance, FinancialAssistance, MedicineAssistance } from './entities/Assistance';
import { Role } from './entities/Role';

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
	entities: [
		Locality, 
		Election,
		ElectionContest,
		Candidate,
		ElectionResult, 
		Role,
		User,
		Person,
		Assistance,
		FinancialAssistance,
		MedicineAssistance
	],
	migrations: [],
	subscribers: [],
	// Connection pooling configuration to prevent ECONNRESET errors
	poolSize: 10,
	maxQueryExecutionTime: 30000, // 30 seconds
	// MySQL-specific options for better connection handling
	extra: {
		connectionLimit: 10,
		waitForConnections: true,
		queueLimit: 0,
		// Prevent idle connection timeouts
		enableKeepAlive: true,
		keepAliveInitialDelayMs: 0,
		// Retry connection on errors
		autoReconnect: true,
		multipleStatements: true,
		// Connection timeout settings (in milliseconds)
		connectTimeout: 30000,
		acquireTimeout: 30000
	}
});

let initializationPromise: Promise<DataSource> | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

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
	initializationPromise = (async () => {
		let lastError: Error | null = null;
		
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				await AppDataSource.initialize();
				console.log('✅ Database connection initialized');
				retryCount = 0; // Reset retry counter on success
				return AppDataSource;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				retryCount++;
				
				if (i < MAX_RETRIES - 1) {
					const waitTime = RETRY_DELAY * (i + 1);
					console.warn(`⚠️ Database connection failed (attempt ${i + 1}/${MAX_RETRIES}): ${lastError.message}`);
					console.log(`⏳ Retrying in ${waitTime}ms...`);
					await delay(waitTime);
				} else {
					console.error(`❌ Failed to initialize database after ${MAX_RETRIES} attempts:`, lastError);
				}
			}
		}
		
		// Reset promise on error so retry is possible
		initializationPromise = null;
		throw lastError || new Error('Failed to initialize database');
	})();
	
	return initializationPromise;
}

export async function getDataSource(): Promise<DataSource> {
	if (!AppDataSource.isInitialized) {
		await initializeDatabase();
	}
	return AppDataSource;
}
