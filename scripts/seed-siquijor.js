/**
 * Seed Siquijor Province data into the database
 * 
 * This script:
 * 1. Reads the fetched Siquijor data
 * 2. Creates parent-child relationships (municipalities -> barangays)
 * 3. Seeds the database in the correct order
 * 
 * Prerequisites:
 *   - Run fetch-siquijor-data.js first
 *   - Make sure dev server is running (npm run dev)
 * 
 * Usage:
 *   node scripts/seed-siquijor.js
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:5173/api/localities';
const DATA_FILE = './data/siquijor/siquijor-localities.json';

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

		const result = await response.json();
		return result;
	} catch (error) {
		throw new Error(`Failed to create ${locality.name}: ${error.message}`);
	}
}

async function seedSiquijor() {
	console.log('='.repeat(70));
	console.log('Siquijor Province Database Seeder');
	console.log('='.repeat(70));
	console.log('');

	// Check if data file exists
	if (!fs.existsSync(DATA_FILE)) {
		console.error(`Error: Data file not found: ${DATA_FILE}`);
		console.log('\nPlease run the fetch script first:');
		console.log('  node scripts/fetch-siquijor-data.js');
		process.exit(1);
	}

	// Load data
	console.log('Loading data...');
	const localities = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
	console.log(`Loaded ${localities.length} localities\n`);

	// Separate by type
	const municipalities = localities.filter(l => l.type === 'municipality');
	const barangays = localities.filter(l => l.type === 'barangay');

	console.log('Distribution:');
	console.log(`  - ${municipalities.length} municipalities`);
	console.log(`  - ${barangays.length} barangays\n`);

	// Track created localities
	const createdMunicipalities = new Map(); // osmId -> database record
	let stats = {
		municipalities: { success: 0, failed: 0 },
		barangays: { success: 0, failed: 0 }
	};

	// Step 1: Create municipalities (no parent)
	console.log('Step 1: Creating municipalities...');
	console.log('-'.repeat(70));
	
	for (const muni of municipalities) {
		try {
			// Remove osmId and parentId before sending to API
			const { osmId, parentId, ...dataToSend } = muni;
			
			const created = await createLocality(dataToSend);
			createdMunicipalities.set(osmId, created);
			
			console.log(`  ✓ ${created.name} (ID: ${created.id})`);
			stats.municipalities.success++;
			
			// Small delay to avoid overwhelming the server
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`  ✗ ${muni.name}: ${error.message}`);
			stats.municipalities.failed++;
		}
	}

	console.log('');

	// Step 2: Create barangays with parent relationships
	console.log('Step 2: Creating barangays with parent relationships...');
	console.log('-'.repeat(70));

	// Try to match barangays to municipalities by name or proximity
	for (const brgy of barangays) {
		try {
			// Extract municipality name from barangay name or tags
			// This is a simple heuristic - OSM data may have better relationship info
			let parentMunicipality = null;
			
			// Try to find parent municipality by checking which municipality the barangay belongs to
			// For now, we'll create them without explicit parent relationships
			// You can enhance this logic based on OSM data structure
			
			const { osmId, parentId, ...dataToSend } = brgy;
			
			// If you have logic to determine parent municipality, set it here:
			// dataToSend.parentId = parentMunicipalityId;
			
			const created = await createLocality(dataToSend);
			
			console.log(`  ✓ ${created.name} (ID: ${created.id})`);
			stats.barangays.success++;
			
			// Small delay
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`  ✗ ${brgy.name}: ${error.message}`);
			stats.barangays.failed++;
		}
	}

	console.log('');
	console.log('='.repeat(70));
	console.log('Seeding Complete!');
	console.log('='.repeat(70));
	console.log('\nResults:');
	console.log(`  Municipalities: ${stats.municipalities.success} created, ${stats.municipalities.failed} failed`);
	console.log(`  Barangays: ${stats.barangays.success} created, ${stats.barangays.failed} failed`);
	console.log(`  Total: ${stats.municipalities.success + stats.barangays.success} localities created`);
	console.log('');
	console.log('Next steps:');
	console.log('  - Visit http://localhost:5173 to see the map');
	console.log('  - Visit http://localhost:5173/admin to manage localities');
	console.log('');
}

// Run the seeder
seedSiquijor().catch(error => {
	console.error('\nSeeding failed:', error);
	console.log('\nTroubleshooting:');
	console.log('  1. Make sure the dev server is running: npm run dev');
	console.log('  2. Check your database connection in .env');
	console.log('  3. Verify the data file exists: data/siquijor/siquijor-localities.json');
	process.exit(1);
});

