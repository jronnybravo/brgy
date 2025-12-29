import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Locality } from '$lib/database/entities/Locality';
import { Person } from '$lib/database/entities/Person';
import { ConnectionErrorHandler } from '$lib/database/connection-error-handler';
import { In } from 'typeorm';

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
		// Get SIQUIJOR province with municipalities and their barangays (WITHOUT loading all persons)
		const siquijorProvince = await fetchWithRetry(
			() => Locality.findOne({
				where: {
					name: 'SIQUIJOR',
					type: 'province'
				},
				relations: {
					children: { // municipalities
						children: true // barangays (no persons relation)
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

		// Get all barangay IDs to count people efficiently
		const barangayIds: number[] = [];
		siquijorProvince.children.forEach((m) => {
			if (m.children) {
				m.children.forEach((b) => {
					if (b.type === 'barangay') {
						barangayIds.push(b.id);
					}
				});
			}
		});

		// Fetch people counts for all barangays in one efficient query
		const peopleCounts = await fetchWithRetry(async () => {
			if (barangayIds.length === 0) return [];
			
			const counts = await Person.find({
				where: { barangayId: In(barangayIds) },
				select: ['barangayId']
			});

			// Count people per barangay
			const countMap = new Map<number, number>();
			counts.forEach((person) => {
				if (person.barangayId) {
					countMap.set(person.barangayId, (countMap.get(person.barangayId) || 0) + 1);
				}
			});
			return countMap;
		}, 3, 100);

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
						peopleCount: peopleCounts instanceof Map ? peopleCounts.get(barangay.id) || 0 : 0
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
		const errorMessage = ConnectionErrorHandler.getFriendlyMessage(error);
		
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
