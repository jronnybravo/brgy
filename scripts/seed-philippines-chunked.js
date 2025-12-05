/**
 * Seed Philippine data in chunks by region
 * Processes one region at a time to avoid memory issues
 * 
 * Usage:
 *   node scripts/seed-philippines-chunked.js
 */

import fs from 'fs';
import readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:5173/api/localities';
const DATA_FILE = './data/philippines-all-localities.json';

// Max points per polygon ring before simplification
const MAX_POINTS = 500;
// Coordinate precision (decimal places)
const COORD_PRECISION = 10;

// Track created entities to avoid duplicates
const createdEntities = {
	regions: new Map(),
	provinces: new Map(),
	municipalities: new Map()
};

/**
 * Simplify GeoJSON geometry to reduce payload size
 * - Reduces coordinate precision
 * - Simplifies polygons with too many points using Douglas-Peucker-like reduction
 */
function simplifyGeometry(geojson) {
	if (!geojson || !geojson.coordinates) return geojson;

	const roundCoord = (num) => Math.round(num * Math.pow(10, COORD_PRECISION)) / Math.pow(10, COORD_PRECISION);

	// Simple point reduction: keep every Nth point if too many
	const simplifyRing = (ring) => {
		if (!Array.isArray(ring)) return ring;
		
		// Round coordinates
		let simplified = ring.map(coord => {
			if (Array.isArray(coord) && coord.length >= 2) {
				return [roundCoord(coord[0]), roundCoord(coord[1])];
			}
			return coord;
		});

		// If too many points, reduce by keeping every Nth point
		// if (simplified.length > MAX_POINTS) {
		// 	const step = Math.ceil(simplified.length / MAX_POINTS);
		// 	const reduced = [];
		// 	for (let i = 0; i < simplified.length; i += step) {
		// 		reduced.push(simplified[i]);
		// 	}
		// 	// Ensure ring is closed (first point = last point)
		// 	if (reduced.length > 0 && 
		// 		(reduced[0][0] !== reduced[reduced.length - 1][0] || 
		// 		 reduced[0][1] !== reduced[reduced.length - 1][1])) {
		// 		reduced.push(reduced[0]);
		// 	}
		// 	return reduced;
		// }

		return simplified;
	};

	if (geojson.type === 'Polygon') {
		return {
			type: 'Polygon',
			coordinates: geojson.coordinates.map(simplifyRing)
		};
	} else if (geojson.type === 'MultiPolygon') {
		return {
			type: 'MultiPolygon',
			coordinates: geojson.coordinates.map(polygon => polygon.map(simplifyRing))
		};
	}

	return geojson;
}

async function createLocality(locality, retries = 2) {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(locality)
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Unknown error' }));
			throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
		}

		return await response.json();
	} catch (error) {
		// Retry on connection errors
		if (retries > 0 && (error.message.includes('ECONNRESET') || error.message.includes('fetch failed'))) {
			await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
			return createLocality(locality, retries - 1);
		}
		console.error(`❌ Failed to create ${locality.type} "${locality.name}": ${error.message}`);
		throw error;
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
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
			}
		});
		
		createdEntities.regions.set(regionCode, created);
		return created;
	} catch (error) {
		// Region might already exist - try to fetch it
		return null;
	}
}

async function createOrGetProvince(provinceCode, provinceName, regionParentId) {
	if (createdEntities.provinces.has(provinceCode)) {
		return createdEntities.provinces.get(provinceCode);
	}

	try {
		const created = await createLocality({
			name: provinceName,
			code: provinceCode,
			type: 'province',
			parentId: regionParentId, // regionParentId is already the ID number
			boundaryGeoJSON: {
				type: 'Polygon',
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
			}
		});
		
		createdEntities.provinces.set(provinceCode, created);
		return created;
	} catch (error) {
		return null;
	}
}

async function createOrGetMunicipality(municipalityCode, municipalityName, provinceParentId) {
	if (createdEntities.municipalities.has(municipalityCode)) {
		return createdEntities.municipalities.get(municipalityCode);
	}

	try {
		const created = await createLocality({
			name: municipalityName,
			code: municipalityCode,
			type: 'municipality',
			parentId: provinceParentId, // provinceParentId is already the ID number
			boundaryGeoJSON: {
				type: 'Polygon',
				coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
			}
		});
		
		createdEntities.municipalities.set(municipalityCode, created);
		return created;
	} catch (error) {
		return null;
	}
}

async function processBarangay(barangay, stats) {
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
		
		// Create barangay with simplified geometry
		const barangayData = {
			name: barangay.name,
			code: barangay.code,
			type: 'barangay',
			parentId: municipalityId,
			boundaryGeoJSON: simplifyGeometry(barangay.boundaryGeoJSON)
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
	}
}

async function readAndProcessChunked() {
	console.log('='.repeat(70));
	console.log('PHILIPPINE NATIONAL DATABASE SEEDER (Chunked)');
	console.log('='.repeat(70));
	console.log('');

	if (!fs.existsSync(DATA_FILE)) {
		console.error(`❌ Data file not found: ${DATA_FILE}`);
		process.exit(1);
	}

	const stats = {
		regions: 0,
		provinces: 0,
		municipalities: 0,
		barangays: { success: 0, failed: 0 }
	};

	console.log('Processing data in chunks (5000 barangays at a time)...');
	console.log('This will take 15-30 minutes. Please be patient...');
	console.log('');

	const CHUNK_SIZE = 5000; // Process 5000 at a time
	let chunk = [];
	let processed = 0;
	
	const fileStream = fs.createReadStream(DATA_FILE, { encoding: 'utf8' });
	const rl = readline.createInterface({ input: fileStream });

	let jsonBuffer = '';
	let objectDepth = 0;
	let inString = false;
	let escapeNext = false;

	for await (const line of rl) {
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			const prevChar = i > 0 ? line[i - 1] : '';

			// Handle escape sequences
			if (escapeNext) {
				jsonBuffer += char;
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				jsonBuffer += char;
				escapeNext = true;
				continue;
			}

			// Track string boundaries
			if (char === '"' && prevChar !== '\\') {
				inString = !inString;
			}

			// Only track braces outside of strings
			if (!inString) {
				if (char === '{') {
					objectDepth++;
				} else if (char === '}') {
					objectDepth--;
				}
			}

			jsonBuffer += char;

			// When we complete an object
			if (objectDepth === 0 && jsonBuffer.trim().length > 0 && jsonBuffer.trim() !== '[' && jsonBuffer.trim() !== ']') {
				const trimmed = jsonBuffer.trim().replace(/,$/, '');
				
				if (trimmed.startsWith('{')) {
					try {
						const barangay = JSON.parse(trimmed);
						chunk.push(barangay);

						// Process chunk when full
						if (chunk.length >= CHUNK_SIZE) {
							for (const brgy of chunk) {
								await processBarangay(brgy, stats);
							}
							processed += chunk.length;
							console.log(`Progress: ${processed.toLocaleString()} - R:${stats.regions} P:${stats.provinces} M:${stats.municipalities} B:${stats.barangays.success}`);
							chunk = [];
							await new Promise(resolve => setTimeout(resolve, 100));
						}
					} catch (error) {
						// Skip malformed objects
					}
				}
				
				jsonBuffer = '';
			}
		}
	}

	// Process remaining chunk
	if (chunk.length > 0) {
		for (const brgy of chunk) {
			await processBarangay(brgy, stats);
		}
		processed += chunk.length;
		console.log(`Progress: ${processed.toLocaleString()} - R:${stats.regions} P:${stats.provinces} M:${stats.municipalities} B:${stats.barangays.success}`);
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
}

readAndProcessChunked().catch(error => {
	console.error('\n❌ Seeding failed:', error);
	process.exit(1);
});

