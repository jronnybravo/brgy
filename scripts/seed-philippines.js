/**
 * Seed ALL Philippine barangay data into the database
 * Handles hierarchy: Region > Province > Municipality > Barangay
 * 
 * Prerequisites:
 *   - Run convert-all-philippines.js first
 *   - Make sure dev server is running (npm run dev)
 * 
 * Usage:
 *   node scripts/seed-philippines.js
 * 
 * Note: This will take 15-30 minutes for ~42,000 barangays
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:5173/api/localities';
const DATA_FILE = './data/philippines-all-localities.json';

// Track created entities to avoid duplicates and establish relationships
const createdEntities = {
	regions: new Map(),      // regionCode -> { id, name }
	provinces: new Map(),    // provinceCode -> { id, name, parentId }
	municipalities: new Map() // municipalityCode -> { id, name, parentId }
};

async function createLocality(locality) {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(locality)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
		}

		return await response.json();
	} catch (error) {
		throw new Error(`Failed to create ${locality.name}: ${error.message}`);
	}
}

async function createOrGetRegion(regionCode, regionName) {
	if (createdEntities.regions.has(regionCode)) {
		return createdEntities.regions.get(regionCode);
	}

	try {
		const created = await createLocality({
			name: regionName,
			code: regionCode,
			type: 'region',
			boundaryGeoJSON: {
				type: 'Polygon',
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] // Placeholder
			}
		});
		
		createdEntities.regions.set(regionCode, created);
		return created;
	} catch (error) {
		console.error(`    Failed to create region ${regionName}:`, error.message);
		return null;
	}
}

async function createOrGetProvince(provinceCode, provinceName, regionId) {
	if (createdEntities.provinces.has(provinceCode)) {
		return createdEntities.provinces.get(provinceCode);
	}

	try {
		const created = await createLocality({
			name: provinceName,
			code: provinceCode,
			type: 'province',
			parentId: regionId,
			boundaryGeoJSON: {
				type: 'Polygon',
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] // Placeholder
			}
		});
		
		createdEntities.provinces.set(provinceCode, created);
		return created;
	} catch (error) {
		console.error(`    Failed to create province ${provinceName}:`, error.message);
		return null;
	}
}

async function createOrGetMunicipality(municipalityCode, municipalityName, provinceId) {
	if (createdEntities.municipalities.has(municipalityCode)) {
		return createdEntities.municipalities.get(municipalityCode);
	}

	try {
		const created = await createLocality({
			name: municipalityName,
			code: municipalityCode,
			type: 'municipality',
			parentId: provinceId,
			boundaryGeoJSON: {
				type: 'Polygon',
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] // Placeholder
			}
		});
		
		createdEntities.municipalities.set(municipalityCode, created);
		return created;
	} catch (error) {
		console.error(`    Failed to create municipality ${municipalityName}:`, error.message);
		return null;
	}
}

async function seedPhilippines() {
	console.log('='.repeat(70));
	console.log('PHILIPPINE NATIONAL DATABASE SEEDER');
	console.log('='.repeat(70));
	console.log('');

	// Check if data file exists
	if (!fs.existsSync(DATA_FILE)) {
		console.error(`❌ Data file not found: ${DATA_FILE}`);
		console.log('\nPlease run the conversion script first:');
		console.log('  node scripts/convert-all-philippines.js');
		process.exit(1);
	}

	// Statistics
	const stats = {
		regions: 0,
		provinces: 0,
		municipalities: 0,
		barangays: { success: 0, failed: 0 }
	};

	console.log('Reading data file (streaming line-by-line)...');
	console.log('This will take 15-30 minutes. Please be patient...');
	console.log('');

	let processed = 0;
	let batch = [];
	const BATCH_SIZE = 100;

	// Read file line by line
	const fileStream = fs.createReadStream(DATA_FILE);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let buffer = '';
	let inObject = false;
	let braceCount = 0;

	for await (const line of rl) {
		const trimmed = line.trim();
		
		// Skip array brackets and empty lines
		if (trimmed === '[' || trimmed === ']' || trimmed === '') continue;
		
		// Track when we're inside an object
		for (const char of trimmed) {
			if (char === '{') {
				braceCount++;
				inObject = true;
			} else if (char === '}') {
				braceCount--;
			}
		}
		
		buffer += line;
		
		// When we have a complete object (braceCount returns to 0)
		if (inObject && braceCount === 0) {
			// Remove trailing comma if present
			const jsonStr = buffer.trim().replace(/,$/, '');
			
			try {
				const barangay = JSON.parse(jsonStr);
				batch.push(barangay);
				
				// Process batch when it reaches size
				if (batch.length >= BATCH_SIZE) {
					await processBatch(batch, stats);
					processed += batch.length;
					
					// Progress update
					console.log(`Progress: ${processed.toLocaleString()} - R:${stats.regions} P:${stats.provinces} M:${stats.municipalities} B:${stats.barangays.success}`);
					
					batch = [];
					
					// Small delay to avoid overwhelming the server
					await new Promise(resolve => setTimeout(resolve, 50));
				}
			} catch (error) {
				console.error('Error parsing barangay:', error.message);
			}
			
			// Reset buffer
			buffer = '';
			inObject = false;
		}
	}
	
	// Process remaining items in batch
	if (batch.length > 0) {
		await processBatch(batch, stats);
		processed += batch.length;
		console.log(`Progress: ${processed.toLocaleString()} - R:${stats.regions} P:${stats.provinces} M:${stats.municipalities} B:${stats.barangays.success}`);
	}
}

async function processBatch(batch, stats) {
	for (const barangay of batch) {
			try {
				// Ensure hierarchy exists
				let regionId = null, provinceId = null, municipalityId = null;
				
				// Create/get region
				if (barangay.regionCode && barangay.regionName) {
					const region = await createOrGetRegion(barangay.regionCode, barangay.regionName);
					if (region) {
						regionId = region.id;
						if (createdEntities.regions.size > stats.regions) {
							stats.regions = createdEntities.regions.size;
						}
					}
				}
				
				// Create/get province
				if (barangay.provinceCode && barangay.provinceName && regionId) {
					const province = await createOrGetProvince(
						barangay.provinceCode, 
						barangay.provinceName, 
						regionId
					);
					if (province) {
						provinceId = province.id;
						if (createdEntities.provinces.size > stats.provinces) {
							stats.provinces = createdEntities.provinces.size;
						}
					}
				}
				
				// Create/get municipality
				if (barangay.municipalityCode && barangay.municipalityName && provinceId) {
					const municipality = await createOrGetMunicipality(
						barangay.municipalityCode, 
						barangay.municipalityName, 
						provinceId
					);
					if (municipality) {
						municipalityId = municipality.id;
						if (createdEntities.municipalities.size > stats.municipalities) {
							stats.municipalities = createdEntities.municipalities.size;
						}
					}
				}
				
				// Create barangay
				const barangayData = {
					name: barangay.name,
					code: barangay.code,
					type: 'barangay',
					parentId: municipalityId,
					boundaryGeoJSON: barangay.boundaryGeoJSON
				};
				
				// Remove undefined fields
				Object.keys(barangayData).forEach(key => {
					if (barangayData[key] === undefined) {
						delete barangayData[key];
					}
				});
				
				await createLocality(barangayData);
				stats.barangays.success++;
				
		} catch (error) {
			stats.barangays.failed++;
			// Don't log every error, too verbose
		}
	}

	console.log('');
	console.log('='.repeat(70));
	console.log('Seeding Complete!');
	console.log('='.repeat(70));
	console.log('\nResults:');
	console.log(`  Regions: ${stats.regions}`);
	console.log(`  Provinces: ${stats.provinces}`);
	console.log(`  Municipalities: ${stats.municipalities}`);
	console.log(`  Barangays: ${stats.barangays.success} created, ${stats.barangays.failed} failed`);
	console.log(`  Total: ${stats.regions + stats.provinces + stats.municipalities + stats.barangays.success} localities`);
	console.log('');
	console.log('Next steps:');
	console.log('  - Visit http://localhost:5173 to see the map');
	console.log('  - Visit http://localhost:5173/admin to manage localities');
	console.log('');
}

// Run the seeder
seedPhilippines().catch(error => {
	console.error('\n❌ Seeding failed:', error);
	console.log('\nTroubleshooting:');
	console.log('  1. Make sure the dev server is running: npm run dev');
	console.log('  2. Check your database connection in .env');
	console.log('  3. Verify the data file exists: data/philippines-all-localities.json');
	process.exit(1);
});

