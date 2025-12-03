/**
 * Fetch Siquijor Province data using bounding box approach
 * This is more reliable than area-based queries
 * 
 * Usage:
 *   node scripts/fetch-siquijor-bbox.js
 */

import fs from 'fs';
import path from 'path';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Bounding box for Siquijor Province
// Format: (south, west, north, east)
// Siquijor coordinates approximately: 9.1-9.3°N, 123.4-123.7°E
// Expanding slightly to ensure we catch all boundaries

// Direct query without bbox variable - more reliable
const query = `
[out:json][timeout:90];
(
  // Get all municipality-level boundaries in Siquijor bbox
  relation["boundary"="administrative"]["admin_level"="5"](9.05,123.35,9.35,123.75);
  relation["boundary"="administrative"]["admin_level"="6"](9.05,123.35,9.35,123.75);
  
  // Get all barangay-level boundaries (try both level 7 and 8)
  relation["boundary"="administrative"]["admin_level"="7"](9.05,123.35,9.35,123.75);
  relation["boundary"="administrative"]["admin_level"="8"](9.05,123.35,9.35,123.75);
  
  // Also try way-based boundaries for barangays
  way["boundary"="administrative"]["admin_level"="7"](9.05,123.35,9.35,123.75);
  way["boundary"="administrative"]["admin_level"="8"](9.05,123.35,9.35,123.75);
);
out geom;
`;

async function fetchFromOverpass() {
	console.log('Fetching Siquijor data using bounding box approach...');
	console.log('Bounding box: (9.05,123.35,9.35,123.75)');
	console.log('Including admin levels 5,6,7,8');
	console.log('This may take 30-60 seconds...\n');

	try {
		console.log('Querying Overpass API...');
		const response = await fetch(OVERPASS_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: `data=${encodeURIComponent(query)}`
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Overpass API error: ${response.status}\n${errorText}`);
		}

		const data = await response.json();
		console.log(`✓ Received ${data.elements?.length || 0} elements from API\n`);
		return data;
	} catch (error) {
		console.error('Error fetching data:', error.message);
		throw error;
	}
}

function extractPolygonCoordinates(osmElement) {
	const coordinates = [];
	
	// Handle relations with members
	if (osmElement.members) {
		// Look for outer ways in relations
		for (const member of osmElement.members) {
			if (member.type === 'way' && member.role === 'outer' && member.geometry) {
				for (const node of member.geometry) {
					coordinates.push([node.lon, node.lat]);
				}
			}
		}
	}
	
	// Handle ways directly
	else if (osmElement.geometry && osmElement.type === 'way') {
		for (const node of osmElement.geometry) {
			coordinates.push([node.lon, node.lat]);
		}
	}

	// Close the polygon if not already closed
	if (coordinates.length > 0) {
		const first = coordinates[0];
		const last = coordinates[coordinates.length - 1];
		if (first[0] !== last[0] || first[1] !== last[1]) {
			coordinates.push([...first]);
		}
	}

	return coordinates.length >= 4 ? coordinates : null;
}

function convertToLocality(osmElement) {
	const tags = osmElement.tags || {};
	const adminLevel = parseInt(tags.admin_level);
	
	const coordinates = extractPolygonCoordinates(osmElement);
	
	if (!coordinates) {
		return null;
	}

	const typeMap = {
		5: 'municipality',
		6: 'city',
		7: 'barangay',
		8: 'barangay'
	};

	const locality = {
		name: tags.name || tags['name:en'] || `Unnamed ${osmElement.id}`,
		code: tags['ref:psgc'] || tags.ref || undefined,
		type: typeMap[adminLevel] || 'locality',
		population: tags.population ? parseInt(tags.population) : undefined,
		osmId: osmElement.id.toString(),
		boundaryGeoJSON: {
			type: 'Polygon',
			coordinates: [coordinates]
		}
	};

	// Remove undefined fields
	Object.keys(locality).forEach(key => {
		if (locality[key] === undefined) {
			delete locality[key];
		}
	});

	return locality;
}

async function main() {
	console.log('='.repeat(70));
	console.log('Siquijor Province Data Fetcher (Bounding Box Method)');
	console.log('='.repeat(70));
	console.log('');

	try {
		const osmData = await fetchFromOverpass();
		
		if (!osmData.elements || osmData.elements.length === 0) {
			console.error('No data returned from OpenStreetMap');
			console.log('\nPossible solutions:');
			console.log('  1. Try again in a few minutes (API may be busy)');
			console.log('  2. Check https://overpass-api.de/api/status');
			console.log('  3. Check your internet connection');
			return;
		}

		// Separate by admin level
		const municipalities = [];
		const barangays = [];

		console.log('Analyzing elements...');
		for (const element of osmData.elements) {
			const adminLevel = element.tags?.admin_level;
			const name = element.tags?.name || 'unnamed';
			const type = element.type;
			
			console.log(`  - ${name}: admin_level=${adminLevel}, type=${type}`);
			
			if (adminLevel === '5' || adminLevel === '6') {
				municipalities.push(element);
			} else if (adminLevel === '7' || adminLevel === '8') {
				barangays.push(element);
			}
		}
		console.log('');

		console.log('Found:');
		console.log(`  - ${municipalities.length} municipalities/cities`);
		console.log(`  - ${barangays.length} barangays\n`);

		// Filter to only Siquijor-related items
		const siquijorMunicipalities = municipalities.filter(m => {
			const name = m.tags?.name?.toLowerCase() || '';
			return name.includes('siquijor') || 
			       name.includes('larena') || 
			       name.includes('lazi') || 
			       name.includes('maria') || 
			       name.includes('san juan') || 
			       name.includes('enrique');
		});

		console.log(`Filtered to ${siquijorMunicipalities.length} Siquijor municipalities`);

		// Convert to localities
		const localities = [];
		
		console.log('\nConverting municipalities...');
		for (const muni of siquijorMunicipalities) {
			const locality = convertToLocality(muni);
			if (locality) {
				localities.push(locality);
				console.log(`  ✓ ${locality.name} (${locality.type})`);
			}
		}

		console.log('\nConverting barangays...');
		let barangayCount = 0;
		for (const brgy of barangays) {
			const locality = convertToLocality(brgy);
			if (locality) {
				localities.push(locality);
				barangayCount++;
				if (barangayCount <= 10) {
					console.log(`  ✓ ${locality.name} (${locality.type})`);
				}
			}
		}
		if (barangayCount > 10) {
			console.log(`  ... and ${barangayCount - 10} more barangays`);
		}

		// Save to file
		const outputDir = path.resolve('./data/siquijor');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const outputFile = path.join(outputDir, 'siquijor-localities.json');
		fs.writeFileSync(outputFile, JSON.stringify(localities, null, 2));

		console.log('');
		console.log('='.repeat(70));
		console.log('Success!');
		console.log('='.repeat(70));
		console.log(`Total localities: ${localities.length}`);
		console.log(`  - ${siquijorMunicipalities.length} municipalities`);
		console.log(`  - ${barangayCount} barangays`);
		console.log(`Output file: ${outputFile}`);
		console.log('');
		console.log('Next step:');
		console.log('  node scripts/seed-siquijor.js');
		console.log('');

	} catch (error) {
		console.error('\nError:', error.message);
		console.log('\nTroubleshooting:');
		console.log('  1. Check internet connection');
		console.log('  2. Try again in a few minutes');
		console.log('  3. Check API status: https://overpass-api.de/api/status');
		process.exit(1);
	}
}

main();

