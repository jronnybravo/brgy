import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';
import { handleConnectionError } from '$lib/database/connection-error-handler';

// Retry logic for failed queries
async function fetchWithRetry<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delayMs: number = 100
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			
			// Check if error is a connection error
			const isConnectionError = 
				lastError.message.includes('ECONNRESET') ||
				lastError.message.includes('ECONNREFUSED') ||
				lastError.message.includes('ETIMEDOUT') ||
				lastError.message.includes('Connection lost');

			if (isConnectionError && attempt < maxRetries) {
				console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, lastError.message);
				await new Promise(resolve => setTimeout(resolve, delayMs));
				// Exponential backoff for next attempt
				delayMs *= 2;
			} else if (!isConnectionError) {
				// Don't retry non-connection errors
				throw error;
			} else {
				// Last attempt failed
				throw lastError;
			}
		}
	}

	throw lastError || new Error('Operation failed after retries');
}

export const GET: RequestHandler = async () => {
	try {
		// Get SIQUIJOR province with municipalities and their barangays (with person counts)
		const siquijorProvince = await fetchWithRetry(
			() => Locality.findOne({
				where: {
					name: 'SIQUIJOR',
					type: 'province'
				},
				relations: {
					children: { // municipalities
						children: { // barangays
							persons: true
						}
					}
				},
				order: {
					children: {
						name: 'ASC',
						children: {
							name: 'ASC'
						}
					}
				}
			}),
			3,
			100
		);

		if (!siquijorProvince?.children?.length) {
			return json({
				success: true,
				data: {
					municipalities: []
				}
			});
		}

		// Transform and filter in one pass, already ordered from query
		const municipalities = siquijorProvince.children
			.filter((m) => m.type === 'municipality')
			.map((municipality) => ({
				id: municipality.id,
				name: municipality.name,
				barangays: (municipality.children || [])
					.filter((b) => b.type === 'barangay')
					.map((barangay) => ({
						id: barangay.id,
						name: barangay.name,
						peopleCount: barangay.persons?.length || 0
					}))
			}))
			.sort((a, b) => {
				const aTotal = a.barangays.reduce((sum, bar) => sum + bar.peopleCount, 0);
				const bTotal = b.barangays.reduce((sum, bar) => sum + bar.peopleCount, 0);
				return bTotal - aTotal;
			});

		return json({
			success: true,
			data: {
				municipalities
			}
		});
	} catch (error) {
		console.error('Error fetching people stats:', error);
		
		// Handle connection errors more gracefully
		const errorMessage = handleConnectionError(error);
		
		return json(
			{
				success: false,
				error: 'Failed to fetch people statistics',
				details: errorMessage
			},
			{ status: 500 }
		);
	}
};
