/**
 * Convert Siquijor data from Philippine shapefiles (PH07 - Central Visayas)
 * 
 * Usage:
 *   npm install
 *   node scripts/convert-shapefile-siquijor.js
 */

import AdmZip from 'adm-zip';
import shapefile from 'shapefile';
import fs from 'fs';
import path from 'path';

const REGION_CODE = 'PH18'; // Negros Island Region (includes Siquijor)
const SHAPEFILE_DIR = './data/shapefiles';
const OUTPUT_DIR = './data/siquijor';
const TEMP_DIR = './data/temp';

async function unzipShapefiles() {
	console.log('Unzipping PH18 shapefiles (Negros Island Region)...');
	
	// Create temp directory
	if (!fs.existsSync(TEMP_DIR)) {
		fs.mkdirSync(TEMP_DIR, { recursive: true });
	}

	// Unzip each component
	const extensions = ['shp', 'shx', 'dbf', 'prj', 'cpg'];
	
	for (const ext of extensions) {
		const zipFile = path.join(SHAPEFILE_DIR, `${REGION_CODE}.${ext}.zip`);
		
		if (!fs.existsSync(zipFile)) {
			console.log(`  ⚠ Skipping ${ext} (not found)`);
			continue;
		}

		try {
			const zip = new AdmZip(zipFile);
			zip.extractAllTo(TEMP_DIR, true);
			console.log(`  ✓ Extracted ${ext}`);
		} catch (error) {
			console.error(`  ✗ Error extracting ${ext}:`, error.message);
		}
	}
	
	console.log('');
}

async function readShapefile() {
	console.log('Reading shapefile...');
	
	// Find the .shp file in temp directory
	const files = fs.readdirSync(TEMP_DIR);
	const shpFile = files.find(f => f.endsWith('.shp'));
	
	if (!shpFile) {
		throw new Error('No .shp file found in extracted files');
	}

	const shpPath = path.join(TEMP_DIR, shpFile);
	const dbfPath = shpPath.replace('.shp', '.dbf');
	
	console.log(`  Reading: ${shpFile}`);
	console.log('');

	const features = [];
	const source = await shapefile.open(shpPath, dbfPath);
	
	let result;
	while (!(result = await source.read()).done) {
		features.push(result.value);
	}
	
	console.log(`✓ Read ${features.length} features from shapefile\n`);
	return features;
}

function filterSiquijorFeatures(features) {
	console.log('Filtering Siquijor features...');
	
	// Try different possible field names for province/municipality
	const siquijorFeatures = features.filter(feature => {
		const props = feature.properties;
		
		// Check various possible field names
		const province = props.PROVINCE || props.Province || props.province || 
		                props.PROV_NAME || props.ADM2_EN || props.NAME_2 || '';
		const municipality = props.MUNICIPALITY || props.Municipality || props.municipality ||
		                    props.MUN_NAME || props.ADM3_EN || props.NAME_3 || '';
		const name = props.NAME || props.Name || props.name || '';
		
		// Check if it's in Siquijor
		return province.toLowerCase().includes('siquijor') ||
		       municipality.toLowerCase().includes('siquijor') ||
		       name.toLowerCase().includes('siquijor') ||
		       // Check specific Siquijor municipalities
		       ['larena', 'lazi', 'maria', 'san juan', 'enrique villanueva'].some(m => 
		           municipality.toLowerCase().includes(m) || name.toLowerCase().includes(m)
		       );
	});
	
	console.log(`  Found ${siquijorFeatures.length} Siquijor features`);
	
	// Show sample properties to help debug
	if (siquijorFeatures.length > 0) {
		console.log('\n  Sample feature properties:');
		console.log('  ', JSON.stringify(siquijorFeatures[0].properties, null, 2));
	} else {
		// Show all available field names
		console.log('\n  Available fields in shapefile:');
		if (features.length > 0) {
			console.log('  ', Object.keys(features[0].properties));
		}
	}
	
	console.log('');
	return siquijorFeatures;
}

function convertToLocalityFormat(feature) {
	const props = feature.properties;
	const geom = feature.geometry;
	
	// Extract name from various possible fields
	const name = props.NAME || props.Name || props.name ||
	            props.BARANGAY || props.Barangay || props.barangay ||
	            props.MUNICIPALITY || props.Municipality || props.municipality ||
	            props.MUN_NAME || props.ADM3_EN || props.NAME_3 ||
	            'Unnamed';
	
	// Determine type based on admin level or field names
	let type = 'locality';
	if (props.ADM_LEVEL === '7' || props.BARANGAY || props.barangay) {
		type = 'barangay';
	} else if (props.ADM_LEVEL === '5' || props.ADM_LEVEL === '6' || props.MUNICIPALITY) {
		type = 'municipality';
	}
	
	// Get PSGC code if available
	const code = props.PSGC || props.psgc || props.CODE || props.code || undefined;
	
	// Get population if available
	const population = props.POPULATION || props.population || props.POP || undefined;
	
	const locality = {
		name: name.trim(),
		code: code,
		type: type,
		population: population ? parseInt(population) : undefined,
		boundaryGeoJSON: geom
	};
	
	// Remove undefined fields
	Object.keys(locality).forEach(key => {
		if (locality[key] === undefined) {
			delete locality[key];
		}
	});
	
	return locality;
}

function cleanup() {
	console.log('Cleaning up temporary files...');
	if (fs.existsSync(TEMP_DIR)) {
		fs.rmSync(TEMP_DIR, { recursive: true, force: true });
		console.log('  ✓ Temporary files removed\n');
	}
}

async function main() {
	console.log('='.repeat(70));
	console.log('Siquijor Shapefile Converter');
	console.log('='.repeat(70));
	console.log('');

	try {
		// Step 1: Unzip shapefiles
		await unzipShapefiles();
		
		// Step 2: Read shapefile
		const features = await readShapefile();
		
		// Step 3: Filter Siquijor data
		const siquijorFeatures = filterSiquijorFeatures(features);
		
		if (siquijorFeatures.length === 0) {
			console.error('❌ No Siquijor features found in shapefile!');
			console.log('\nThis could mean:');
			console.log('  1. The shapefile uses different field names');
			console.log('  2. Siquijor data is in a different region file');
			console.log('  3. The shapefile structure is different than expected');
			console.log('\nPlease check the sample properties above.');
			cleanup();
			return;
		}
		
		// Step 4: Convert to our format
		console.log('Converting to locality format...');
		const localities = siquijorFeatures.map(convertToLocalityFormat);
		
		// Separate by type
		const municipalities = localities.filter(l => l.type === 'municipality');
		const barangays = localities.filter(l => l.type === 'barangay');
		
		console.log(`  Converted:`);
		console.log(`    - ${municipalities.length} municipalities`);
		console.log(`    - ${barangays.length} barangays`);
		console.log('');
		
		// Step 5: Save to file
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}
		
		const outputFile = path.join(OUTPUT_DIR, 'siquijor-localities.json');
		fs.writeFileSync(outputFile, JSON.stringify(localities, null, 2));
		
		console.log('='.repeat(70));
		console.log('✓ Success!');
		console.log('='.repeat(70));
		console.log(`Total localities: ${localities.length}`);
		console.log(`  - ${municipalities.length} municipalities`);
		console.log(`  - ${barangays.length} barangays`);
		console.log(`Output: ${outputFile}`);
		console.log('');
		console.log('Next step:');
		console.log('  node scripts/seed-siquijor.js');
		console.log('');
		
		// Cleanup
		cleanup();
		
	} catch (error) {
		console.error('\n❌ Error:', error.message);
		console.error(error.stack);
		cleanup();
		process.exit(1);
	}
}

main();

