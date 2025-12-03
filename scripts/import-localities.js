/**
 * Script to import locality data into the system
 * 
 * Usage:
 *   node scripts/import-localities.js <file-or-directory>
 * 
 * Examples:
 *   node scripts/import-localities.js sample-data/sample-locality.json
 *   node scripts/import-localities.js sample-data/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:5173/api/localities';

async function importLocality(locality) {
	console.log(`  Importing: ${locality.name}...`);
	
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
		console.log(`  ✓ Created locality ID: ${result.id}`);
		return result;
	} catch (error) {
		console.error(`  ✗ Failed to import ${locality.name}:`, error.message);
		throw error;
	}
}

async function processFile(filePath) {
	console.log(`\nProcessing file: ${filePath}`);
	
	const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

	if (Array.isArray(data)) {
		console.log(`Found ${data.length} localities in array`);
		let successCount = 0;
		let errorCount = 0;

		for (const locality of data) {
			try {
				await importLocality(locality);
				successCount++;
			} catch (error) {
				errorCount++;
			}
		}

		console.log(`\nResults: ${successCount} succeeded, ${errorCount} failed`);
	} else {
		await importLocality(data);
	}
}

async function processDirectory(dirPath) {
	console.log(`\nProcessing directory: ${dirPath}`);
	
	const files = fs.readdirSync(dirPath)
		.filter(f => f.endsWith('.json'))
		.map(f => path.join(dirPath, f));

	console.log(`Found ${files.length} JSON files`);

	for (const file of files) {
		await processFile(file);
	}
}

async function main() {
	const args = process.argv.slice(2);
	
	if (args.length === 0) {
		console.error('Usage: node import-localities.js <file-or-directory>');
		console.error('\nExamples:');
		console.error('  node scripts/import-localities.js sample-data/sample-locality.json');
		console.error('  node scripts/import-localities.js sample-data/');
		process.exit(1);
	}

	const targetPath = path.resolve(args[0]);

	// Check if path exists
	if (!fs.existsSync(targetPath)) {
		console.error(`Error: Path does not exist: ${targetPath}`);
		process.exit(1);
	}

	console.log('='.repeat(60));
	console.log('Locality Import Script');
	console.log('='.repeat(60));
	console.log(`API URL: ${API_URL}`);
	console.log(`Target: ${targetPath}`);

	const stats = fs.statSync(targetPath);

	try {
		if (stats.isFile()) {
			await processFile(targetPath);
		} else if (stats.isDirectory()) {
			await processDirectory(targetPath);
		} else {
			console.error('Error: Path is neither a file nor directory');
			process.exit(1);
		}

		console.log('\n' + '='.repeat(60));
		console.log('Import complete!');
		console.log('='.repeat(60));
	} catch (error) {
		console.error('\nImport failed:', error);
		process.exit(1);
	}
}

main().catch(console.error);

