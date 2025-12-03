/**
 * Fetch Siquijor Province boundary data from OpenStreetMap
 * 
 * This script queries the Overpass API to get:
 * - Siquijor Province boundary
 * - All 6 municipalities
 * - All barangays within each municipality
 * 
 * Usage:
 *   node scripts/fetch-siquijor-data.js
 */

import fs from 'fs';
import path from 'path';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Overpass query to get Siquijor administrative boundaries
// Using a more flexible approach with geocoding
const query = `
[out:json][timeout:90];
// Search for Siquijor area (try multiple approaches)
(
  // Try by name and admin level
  area["name"="Siquijor"]["admin_level"="4"];
  area["name:en"="Siquijor"]["admin_level"="4"];
  area["official_name"="Siquijor"]["admin_level"="4"];
  // Try the province relation directly
  relation["name"="Siquijor"]["admin_level"="4"]["boundary"="administrative"];
)->.province;

// Get all municipalities (admin_level=5) that are within or related to Siquijor
(
  relation(area.province)["admin_level"="5"]["boundary"="administrative"];
  relation["name"~"Siquijor|Larena|Lazi|Maria|San Juan|Enrique Villanueva"]["admin_level"="5"];
)->.municipalities;

// Get all barangays (admin_level=7) in these municipalities
(
  relation(area.province)["admin_level"="7"]["boundary"="administrative"];
)->.barangays;

// Output with geometry
(
  .municipalities;
  .barangays;
);
out geom;
`;

async function fetchFromOverpass() {
	console.log('Fetching Siquijor data from OpenStreetMap...');
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
			throw new Error(`Overpass API error: ${response.status} ${response.statusText}\n${errorText}`);
		}

		const data = await response.json();
		console.log(`Received response with ${data.elements?.length || 0} elements`);
		return data;
	} catch (error) {
		console.error('Error fetching data:', error.message);
		throw error;
	}
}

function extractPolygonCoordinates(osmElement) {
	if (!osmElement.members) {
		return null;
	}

	const coordinates = [];
	
	for (const member of osmElement.members) {
		if (member.type === 'way' && member.role === 'outer' && member.geometry) {
			for (const node of member.geometry) {
				coordinates.push([node.lon, node.lat]);
			}
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

	return coordinates.length > 0 ? coordinates : null;
}

function convertToLocality(osmElement, parentId = null) {
	const tags = osmElement.tags || {};
	const adminLevel = parseInt(tags.admin_level);
	
	const coordinates = extractPolygonCoordinates(osmElement);
	
	if (!coordinates) {
		console.warn(`Warning: No coordinates for ${tags.name || 'unnamed'}`);
		return null;
	}

	const typeMap = {
		4: 'province',
		5: 'municipality',
		7: 'barangay'
	};

	const locality = {
		name: tags.name || tags['name:en'] || `Unnamed ${osmElement.id}`,
		code: tags['ref:psgc'] || tags.ref || undefined,
		type: typeMap[adminLevel] || 'locality',
		population: tags.population ? parseInt(tags.population) : undefined,
		parentId: parentId,
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
	console.log('Siquijor Province Data Fetcher');
	console.log('='.repeat(70));
	console.log('');

	try {
		// Fetch data from OSM
		const osmData = await fetchFromOverpass();
		
		if (!osmData.elements || osmData.elements.length === 0) {
			console.error('No data returned from OpenStreetMap');
			console.log('This could mean:');
			console.log('  1. The Overpass API is down or overloaded');
			console.log('  2. No data exists for Siquijor with these tags');
			console.log('  3. Network connectivity issues');
			return;
		}

		console.log(`✓ Fetched ${osmData.elements.length} administrative boundaries\n`);

		// Separate by admin level
		const municipalities = [];
		const barangays = [];

		for (const element of osmData.elements) {
			const adminLevel = element.tags?.admin_level;
			
			if (adminLevel === '5') {
				municipalities.push(element);
			} else if (adminLevel === '7') {
				barangays.push(element);
			}
		}

		console.log(`Found:`);
		console.log(`  - ${municipalities.length} municipalities`);
		console.log(`  - ${barangays.length} barangays\n`);

		// Convert municipalities
		const localities = [];
		
		console.log('Converting municipalities...');
		for (const muni of municipalities) {
			const locality = convertToLocality(muni);
			if (locality) {
				localities.push(locality);
				console.log(`  ✓ ${locality.name} (${locality.type})`);
			}
		}

		console.log('\nConverting barangays...');
		for (const brgy of barangays) {
			const locality = convertToLocality(brgy);
			if (locality) {
				localities.push(locality);
				console.log(`  ✓ ${locality.name} (${locality.type})`);
			}
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
		console.log(`Output file: ${outputFile}`);
		console.log('');
		console.log('Next step:');
		console.log(`  node scripts/seed-siquijor.js`);
		console.log('');

	} catch (error) {
		console.error('\nError:', error.message);
		console.log('\nTroubleshooting:');
		console.log('  1. Check your internet connection');
		console.log('  2. Try again in a few minutes (Overpass API may be busy)');
		console.log('  3. Check https://overpass-api.de/api/status for API status');
		process.exit(1);
	}
}

main();

