/**
 * Check if database columns exist
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

async function checkSchema() {
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '3306'),
		user: process.env.DB_USERNAME || 'root',
		password: process.env.DB_PASSWORD || '',
		database: process.env.DB_DATABASE || 'brgy_mapping'
	});

	console.log('Checking localities table schema...\n');

	const [columns] = await connection.query('DESCRIBE localities');
	
	console.log('Columns in localities table:');
	columns.forEach(col => {
		console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
	});

	const hasProvinceName = columns.some(col => col.Field === 'provinceName');
	const hasMunicipalityName = columns.some(col => col.Field === 'municipalityName');

	console.log('');
	console.log(`provinceName column exists: ${hasProvinceName ? '✓' : '✗'}`);
	console.log(`municipalityName column exists: ${hasMunicipalityName ? '✓' : '✗'}`);

	if (!hasProvinceName || !hasMunicipalityName) {
		console.log('\n⚠️  Columns are missing! TypeORM synchronize should create them.');
		console.log('Try restarting the dev server.');
	} else {
		// Check if any data has provinceName populated
		const [result] = await connection.query(
			'SELECT COUNT(*) as count FROM localities WHERE provinceName IS NOT NULL'
		);
		console.log(`\nRecords with provinceName populated: ${result[0].count}`);
		
		if (result[0].count === 0) {
			console.log('\n⚠️  No records have provinceName populated.');
			console.log('You need to re-seed with the updated script.');
		}
	}

	await connection.end();
}

checkSchema().catch(console.error);

