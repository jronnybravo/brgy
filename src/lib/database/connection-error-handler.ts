import { getDataSource } from './data-source';

/**
 * Utility for handling database connection errors and retry logic
 */
export class ConnectionErrorHandler {
	/**
	 * Execute a database operation with automatic retry on connection errors
	 * @param operation - The async function to execute
	 * @param retries - Number of retries (default: 2)
	 * @param delayMs - Delay between retries in milliseconds (default: 500)
	 */
	static async executeWithRetry<T>(
		operation: () => Promise<T>,
		retries: number = 2,
		delayMs: number = 500
	): Promise<T> {
		let lastError: Error | null = null;

		for (let i = 0; i <= retries; i++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Check if it's a connection error
				const isConnectionError =
					lastError.message.includes('ECONNRESET') ||
					lastError.message.includes('ECONNREFUSED') ||
					lastError.message.includes('ETIMEDOUT') ||
					lastError.message.includes('Connection closed') ||
					lastError.message.includes('getaddrinfo ENOTFOUND');

				if (!isConnectionError || i === retries) {
					throw lastError;
				}

				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
				console.warn(`Connection attempt ${i + 1} failed, retrying...`);
			}
		}

		throw lastError || new Error('Operation failed');
	}

	/**
	 * Execute an operation with connection pool check
	 * Ensures database is connected before executing
	 */
	static async executeWithConnectionCheck<T>(
		operation: (dataSource: any) => Promise<T>
	): Promise<T> {
		try {
			const dataSource = await getDataSource();
			return await this.executeWithRetry(() => operation(dataSource), 2, 500);
		} catch (error) {
			console.error('Database operation failed:', error);
			throw error;
		}
	}

	/**
	 * Check if error is a connection-related error
	 */
	static isConnectionError(error: any): boolean {
		const message = error?.message || String(error);
		return (
			message.includes('ECONNRESET') ||
			message.includes('ECONNREFUSED') ||
			message.includes('ETIMEDOUT') ||
			message.includes('Connection closed') ||
			message.includes('getaddrinfo ENOTFOUND')
		);
	}

	/**
	 * Get user-friendly error message
	 */
	static getFriendlyMessage(error: any): string {
		if (this.isConnectionError(error)) {
			return 'Database connection lost. Please try again.';
		}
		return error?.message || 'An error occurred';
	}
}
