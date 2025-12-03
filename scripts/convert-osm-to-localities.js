/**
 * Convert OpenStreetMap Overpass API data to locality format
 * 
 * Usage:
 *   node scripts/convert-osm-to-localities.js <input-file> <output-file>
 * 
 * Example:
 *   node scripts/convert-osm-to-localities.js osm-data.json localities.json
 */

import fs from 'fs';
import path from 'path';

function extractPolygonCoordinates(osmElement) {
	// OSM returns geometry in different formats depending on the query
	// This handles the "out geom" format
	
	if (!osmElement.members && osmElement.geometry) {
		// Direct geometry
		return osmElement.geometry.map(node => [node.lon, node.lat]);
	}
	
	if (osmElement.members) {
		// Relation with members (ways)
		const coordinates = [];
		for (const member of osmElement.members) {
			if (member.type === 'way' && member.geometry) {
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
		
		return coordinates;
	}
	
	return null;
}

function getAdminLevel(tags) {
	if (!tags.admin_level) return null;
	
	const level = parseInt(tags.admin_level);
	const typeMap = {
		4: 'province',
		5: 'municipality',
		6: 'district',
		7: 'barangay',
		8: 'purok'
	};
	
	return typeMap[level] || 'locality';
}

function convertOsmToLocality(osmElement) {
	const tags = osmElement.tags || {};
	
	const coordinates = extractPolygonCoordinates(osmElement);
	if (!coordinates || coordinates.length < 4) {
		console.warn(`Skipping ${tags.name || 'unnamed'}: insufficient coordinates`);
		return null;
	}
	
	const locality = {
		name: tags.name || tags['name:en'] || `Unnamed ${osmElement.id}`,
		code: tags.ref || tags['ref:psgc'] || undefined,
		type: getAdminLevel(tags),
		population: tags.population ? parseInt(tags.population) : undefined,
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

function main() {
	const args = process.argv.slice(2);
	
	if (args.length !== 2) {
		console.error('Usage: node convert-osm-to-localities.js <input-file> <output-file>');
		console.error('\nExample:');
		console.error('  node scripts/convert-osm-to-localities.js osm-data.json localities.json');
		process.exit(1);
	}
	
	const [inputFile, outputFile] = args;
	
	// Check input file exists
	if (!fs.existsSync(inputFile)) {
		console.error(`Error: Input file not found: ${inputFile}`);
		process.exit(1);
	}
	
	console.log('='.repeat(60));
	console.log('OSM to Localities Converter');
	console.log('='.repeat(60));
	console.log(`Input:  ${inputFile}`);
	console.log(`Output: ${outputFile}`);
	console.log('');
	
	// Read and parse OSM data
	const osmData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
	
	if (!osmData.elements || !Array.isArray(osmData.elements)) {
		console.error('Error: Invalid OSM data format. Expected "elements" array.');
		process.exit(1);
	}
	
	console.log(`Found ${osmData.elements.length} OSM elements`);
	
	// Convert each element
	const localities = [];
	let skipped = 0;
	
	for (const element of osmData.elements) {
		const locality = convertOsmToLocality(element);
		if (locality) {
			localities.push(locality);
			console.log(`✓ Converted: ${locality.name}`);
		} else {
			skipped++;
		}
	}
	
	console.log('');
	console.log(`Converted: ${localities.length}`);
	console.log(`Skipped: ${skipped}`);
	
	// Write output
	fs.writeFileSync(outputFile, JSON.stringify(localities, null, 2));
	
	console.log('');
	console.log('='.repeat(60));
	console.log('Conversion complete!');
	console.log(`Output written to: ${outputFile}`);
	console.log('='.repeat(60));
	console.log('');
	console.log('Next steps:');
	console.log(`  node scripts/import-localities.js ${outputFile}`);
}

main();

