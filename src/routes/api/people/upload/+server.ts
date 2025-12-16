import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Person } from '$lib/database/entities/Person';
import { Locality } from '$lib/database/entities/Locality';

interface CSVRow {
	'First Name': string;
	'Middle Name'?: string;
	'Last Name': string;
	'Extension Name'?: string;
	'Town': string;
	'Barangay': string;
	'Purok'?: string;
	'Precinct'?: string;
	'Is Supporter'?: string;
	'Is Leader'?: string;
	'Comments'?: string;
}

function parseCSV(csvText: string): CSVRow[] {
	const lines = csvText.trim().split('\n');
	if (lines.length === 0) {
		throw new Error('CSV file is empty');
	}

	// Parse header
	const header = lines[0].split(',').map((h) => h.trim());

	// Validate required fields
	const requiredFields = ['First Name', 'Last Name', 'Town', 'Barangay'];
	for (const field of requiredFields) {
		if (!header.includes(field)) {
			throw new Error(`Missing required column: ${field}`);
		}
	}

	// Parse rows
	const rows: CSVRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue; // Skip empty lines

		const values = line.split(',').map((v) => v.trim());
		const row: any = {};

		for (let j = 0; j < header.length; j++) {
			row[header[j]] = values[j] || '';
		}

		rows.push(row);
	}

	return rows;
}

function parseBoolean(value: string | undefined): boolean | null {
	if (!value || value === '') return null;
	const lower = value.toLowerCase();
	if (lower === 'true' || lower === 'yes' || lower === '1') return true;
	if (lower === 'false' || lower === 'no' || lower === '0') return false;
	return null;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		if (!file.name.endsWith('.csv')) {
			return json({ success: false, error: 'File must be a CSV file' }, { status: 400 });
		}

		const csvText = await file.text();
		const rows = parseCSV(csvText);

		if (rows.length === 0) {
			return json({ success: false, error: 'CSV file contains no data rows' }, { status: 400 });
		}

		const results = {
			total: rows.length,
			successful: 0,
			failed: 0,
			errors: [] as { rowNumber: number; error: string; data: any }[]
		};

		// Process each row
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const rowNumber = i + 2; // +2 because of header and 0-indexing

			try {
				// Validate required fields
				if (!row['First Name'] || !row['Last Name'] || !row['Town'] || !row['Barangay']) {
					throw new Error('Missing required fields: First Name, Last Name, Town, or Barangay');
				}

				// Find town (municipality) by name
				const town = await Locality.findOne({
					where: { name: row['Town'] }
				});

				if (!town) {
					throw new Error(`Town not found: ${row['Town']}`);
				}

				// Find barangay by name within the selected town
				const barangay = await Locality.findOne({
					where: { name: row['Barangay'], parentId: town.id }
				});

				if (!barangay) {
					throw new Error(`Barangay not found: ${row['Barangay']} in town ${row['Town']}`);
				}

				// Create person
				const person = new Person();
				person.firstName = row['First Name'];
				person.lastName = row['Last Name'];
				person.middleName = row['Middle Name'] || null;
				person.extensionName = row['Extension Name'] || null;
				person.barangayId = barangay.id;
				person.purok = row['Purok'] || null;
				person.precinct = row['Precinct'] || null;
				person.isSupporter = parseBoolean(row['Is Supporter']);
				person.isLeader = parseBoolean(row['Is Leader']);
				person.comments = row['Comments'] || null;

				await person.save();
				results.successful++;
			} catch (error) {
				results.failed++;
				results.errors.push({
					rowNumber,
					error: error instanceof Error ? error.message : String(error),
					data: row
				});
			}
		}

		return json({
			success: results.failed === 0,
			message: `Processed ${results.total} rows: ${results.successful} successful, ${results.failed} failed`,
			results
		});
	} catch (error) {
		console.error('Error uploading CSV:', error);
		return json(
			{
				success: false,
				error: 'Failed to process CSV',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
