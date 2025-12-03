/**
 * Convert ALL Philippine barangay data from shapefiles
 * Processes all regions (PH01-PH18) and creates full national dataset
 * 
 * Usage:
 *   npm install
 *   node scripts/convert-all-philippines.js
 */

import AdmZip from 'adm-zip';
import shapefile from 'shapefile';
import fs from 'fs';
import path from 'path';

const SHAPEFILE_DIR = './data/shapefiles';
const OUTPUT_FILE = './data/philippines-all-localities.json';
const TEMP_DIR = './data/temp';

// All Philippine regions
const REGIONS = [
	'PH01', 'PH02', 'PH03', 'PH04', 'PH05', 'PH06', 'PH07', 'PH08',
	'PH09', 'PH10', 'PH11', 'PH12', 'PH13', 'PH14', 'PH15', 'PH16',
	'PH17', 'PH18'
];

async function unzipRegionShapefiles(regionCode) {
	// Create temp directory for this region
	const regionTempDir = path.join(TEMP_DIR, regionCode);
	if (!fs.existsSync(regionTempDir)) {
		fs.mkdirSync(regionTempDir, { recursive: true });
	}

	// Unzip each component
	const extensions = ['shp', 'shx', 'dbf', 'prj', 'cpg'];
	
	for (const ext of extensions) {
		const zipFile = path.join(SHAPEFILE_DIR, `${regionCode}.${ext}.zip`);
		
		if (!fs.existsSync(zipFile)) {
			continue;
		}

		try {
			const zip = new AdmZip(zipFile);
			zip.extractAllTo(regionTempDir, true);
		} catch (error) {
			console.error(`    ✗ Error extracting ${ext}:`, error.message);
		}
	}
	
	return regionTempDir;
}

async function readRegionShapefile(regionTempDir) {
	// Find the .shp file
	const files = fs.readdirSync(regionTempDir);
	const shpFile = files.find(f => f.endsWith('.shp'));
	
	if (!shpFile) {
		return [];
	}

	const shpPath = path.join(regionTempDir, shpFile);
	const dbfPath = shpPath.replace('.shp', '.dbf');

	const features = [];
	const source = await shapefile.open(shpPath, dbfPath);
	
	let result;
	while (!(result = await source.read()).done) {
		features.push(result.value);
	}
	
	return features;
}

function convertFeatureToLocality(feature) {
	const props = feature.properties;
	const geom = feature.geometry;
	
	// Based on the terminal output, we know the fields are:
	// Reg_Code, Reg_Name, Pro_Code, Pro_Name, Mun_Code, Mun_Name, Bgy_Code, Bgy_Name
	
	const locality = {
		name: props.Bgy_Name || props.bgy_name || 'Unnamed',
		code: props.Bgy_Code || props.bgy_code || undefined,
		type: 'barangay',
		
		// Parent information
		municipalityCode: props.Mun_Code || props.mun_code || undefined,
		municipalityName: props.Mun_Name || props.mun_name || undefined,
		provinceCode: props.Pro_Code || props.pro_code || undefined,
		provinceName: props.Pro_Name || props.pro_name || undefined,
		regionCode: props.Reg_Code || props.reg_code || undefined,
		regionName: props.Reg_Name || props.reg_name || undefined,
		
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
	if (fs.existsSync(TEMP_DIR)) {
		fs.rmSync(TEMP_DIR, { recursive: true, force: true });
	}
}

async function main() {
	console.log('='.repeat(70));
	console.log('PHILIPPINE NATIONAL BARANGAY DATA CONVERTER');
	console.log('='.repeat(70));
	console.log('');
	console.log('This will process ALL Philippine regions (PH01-PH18)');
	console.log('Expected: ~42,000+ barangays nationwide');
	console.log('This may take 5-10 minutes...');
	console.log('');

	const allLocalities = [];
	let totalFeatures = 0;

	try {
		for (const regionCode of REGIONS) {
			console.log(`Processing ${regionCode}...`);
			
			try {
				// Unzip
				const regionTempDir = await unzipRegionShapefiles(regionCode);
				
				// Read shapefile
				const features = await readRegionShapefile(regionTempDir);
				
				if (features.length === 0) {
					console.log(`  ⚠ No data found\n`);
					continue;
				}
				
				console.log(`  ✓ Read ${features.length} barangays`);
				
				// Convert to our format
				const localities = features.map(convertFeatureToLocality);
				allLocalities.push(...localities);
				totalFeatures += features.length;
				
				// Show sample from first region
				if (allLocalities.length > 0 && allLocalities.length === localities.length) {
					console.log(`  Sample: ${localities[0].name}, ${localities[0].municipalityName}, ${localities[0].provinceName}`);
				}
				
				console.log('');
				
			} catch (error) {
				console.error(`  ✗ Error processing ${regionCode}:`, error.message);
				console.log('');
			}
		}
		
		console.log('='.repeat(70));
		console.log('Processing Complete!');
		console.log('='.repeat(70));
		console.log(`Total barangays: ${allLocalities.length}`);
		console.log('');
		
		// Group by region for statistics
		const byRegion = {};
		allLocalities.forEach(loc => {
			const region = loc.regionName || 'Unknown';
			byRegion[region] = (byRegion[region] || 0) + 1;
		});
		
		console.log('Breakdown by region:');
		Object.entries(byRegion).sort((a, b) => a[0].localeCompare(b[0])).forEach(([region, count]) => {
			console.log(`  ${region}: ${count} barangays`);
		});
		console.log('');
		
		// Save to file in chunks to avoid memory issues
		console.log('Saving to file (chunked writing)...');
		const writeStream = fs.createWriteStream(OUTPUT_FILE);
		
		writeStream.write('[\n');
		
		const CHUNK_SIZE = 1000;
		for (let i = 0; i < allLocalities.length; i += CHUNK_SIZE) {
			const chunk = allLocalities.slice(i, i + CHUNK_SIZE);
			
			for (let j = 0; j < chunk.length; j++) {
				const locality = chunk[j];
				const json = JSON.stringify(locality, null, 2);
				
				// Indent each line
				const indented = json.split('\n').map(line => '  ' + line).join('\n');
				
				writeStream.write(indented);
				
				// Add comma if not the last item
				if (i + j < allLocalities.length - 1) {
					writeStream.write(',\n');
				} else {
					writeStream.write('\n');
				}
			}
			
			// Progress indicator
			const progress = Math.min(100, ((i + CHUNK_SIZE) / allLocalities.length * 100)).toFixed(1);
			process.stdout.write(`  Writing: ${progress}%\r`);
		}
		
		writeStream.write(']');
		writeStream.end();
		
		await new Promise((resolve, reject) => {
			writeStream.on('finish', resolve);
			writeStream.on('error', reject);
		});
		
		console.log(`\n✓ Saved to: ${OUTPUT_FILE}`);
		console.log(`  File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
		console.log('');
		
		console.log('='.repeat(70));
		console.log('Next Steps:');
		console.log('='.repeat(70));
		console.log('');
		console.log('The data has been saved. To import into your database:');
		console.log('');
		console.log('  node scripts/seed-philippines.js');
		console.log('');
		console.log('Note: Importing 42,000+ barangays will take 15-30 minutes.');
		console.log('Make sure your dev server is running first!');
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

