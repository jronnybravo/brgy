/**
 * Import election results from CSV files
 * 
 * Structure expected:
 *   data/election-results/PROVINCE/CITY/BARANGAY/PRECINCT.csv
 * 
 * Usage:
 *   node scripts/import-election-results.js [--year 2022] [--name "2022 Elections"]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const API_BASE = process.env.API_URL || 'http://localhost:5173/api';
const ELECTION_RESULTS_DIR = './data/election-results';

// Parse command line arguments
const args = process.argv.slice(2);
const yearIndex = args.indexOf('--year');
const nameIndex = args.indexOf('--name');
const ELECTION_YEAR = yearIndex >= 0 ? parseInt(args[yearIndex + 1]) : 2022;
const ELECTION_NAME = nameIndex >= 0 ? args[nameIndex + 1] : `${ELECTION_YEAR} National and Local Elections`;

// Color palette for candidates (will be assigned dynamically)
const CANDIDATE_COLORS = [
	'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
	'#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
	'#F8B500', '#00CED1', '#FF7F50', '#9370DB', '#20B2AA',
	'#FF69B4', '#00FA9A', '#FFD700', '#8A2BE2', '#00BFFF'
];

// Cache for created entities
const cache = {
	election: null,
	contests: new Map(), // key: contestName
	candidates: new Map(), // key: contestId-candidateName
	localities: new Map() // key: normalizedName
};

// Statistics
const stats = {
	filesProcessed: 0,
	resultsCreated: 0,
	resultsFailed: 0,
	contestsCreated: 0,
	candidatesCreated: 0
};

/**
 * Normalize barangay name for matching
 */
function normalizeLocalityName(name) {
	return name
		.toUpperCase()
		.replace(/[_-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
	const result = [];
	let current = '';
	let inQuotes = false;
	
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	
	return result;
}

/**
 * Parse candidate name to extract name and party
 */
function parseCandidateName(rawName) {
	// Format: "1. VILLA, JEC-JEC  (PFP)" or "60 ANG PROBINSIYANO"
	const match = rawName.match(/^(\d+\.?\s*)?(.+?)(?:\s*\(([^)]+)\))?$/);
	
	if (match) {
		const ballotNumber = match[1] ? parseInt(match[1].replace(/\D/g, '')) : null;
		const name = match[2].trim();
		const party = match[3] || null;
		
		return { ballotNumber, name, party };
	}
	
	return { ballotNumber: null, name: rawName, party: null };
}

/**
 * Extract position from contest name
 */
function extractPosition(contestName) {
	// "PROVINCIAL GOVERNOR of SIQUIJOR" -> "GOVERNOR"
	// "MEMBER, HOUSE OF REPRESENTATIVES of SIQUIJOR" -> "CONGRESSMAN"
	// "MEMBER, SANGGUNIANG PANLALAWIGAN" -> "BOARD MEMBER"
	// "MEMBER, SANGGUNIANG BAYAN" -> "COUNCILOR"
	
	const upper = contestName.toUpperCase();
	
	if (upper.includes('SENATOR')) return 'SENATOR';
	if (upper.includes('PARTY LIST')) return 'PARTY LIST';
	if (upper.includes('HOUSE OF REPRESENTATIVES')) return 'CONGRESSMAN';
	if (upper.includes('GOVERNOR')) return 'GOVERNOR';
	if (upper.includes('VICE-GOVERNOR')) return 'VICE-GOVERNOR';
	if (upper.includes('MAYOR')) return 'MAYOR';
	if (upper.includes('VICE-MAYOR')) return 'VICE-MAYOR';
	if (upper.includes('SANGGUNIANG PANLALAWIGAN')) return 'BOARD MEMBER';
	if (upper.includes('SANGGUNIANG BAYAN') || upper.includes('SANGGUNIANG PANLUNGSOD')) return 'COUNCILOR';
	
	return contestName;
}

/**
 * API helper functions
 */
async function apiGet(endpoint) {
	const response = await fetch(`${API_BASE}${endpoint}`);
	if (!response.ok) {
		throw new Error(`GET ${endpoint} failed: ${response.status}`);
	}
	return response.json();
}

async function apiPost(endpoint, data) {
	const response = await fetch(`${API_BASE}${endpoint}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(`POST ${endpoint} failed: ${response.status} - ${JSON.stringify(error)}`);
	}
	
	return response.json();
}

/**
 * Load all localities from database for matching
 */
async function loadLocalities() {
	console.log('Loading localities from database...');

	const MUNICIPALITIES = {
		448: 'ENRIQUE VILLANUEVA',
		457: 'LARENA',
		481: 'LAZI',
		499: 'MARIA',
		513: 'SAN JUAN',
		529: 'SIQUIJOR',
	};
	
	try {
		// Load all localities (paginated)
		let allLocalities = [];
		let offset = 0;
		const limit = 10000;
		
		while (true) {
			const batch = await apiGet(`/localities?limit=${limit}&offset=${offset}&type=barangay&province=SIQUIJOR`);
			if (batch.length === 0) break;
			allLocalities = allLocalities.concat(batch);
			offset += limit;
			process.stdout.write(`  Loading: ${allLocalities.length} localities\r`);
		}
		console.log(`  Loaded ${allLocalities.length} localities from database`);
		
		// Build lookup maps with multiple keys for better matching
		for (const loc of allLocalities) {
			const normalized = normalizeLocalityName(loc.name);
			const municipality = MUNICIPALITIES[loc.parentId];
			
			// Store by normalized name
			cache.localities.set(`${normalized}, ${municipality}`, loc);
			
			// Store by code if available
			if (loc.code) {
				cache.localities.set(loc.code, loc);
			}
		}
		
		console.log(`  Cache size: ${cache.localities.size} entries`);
	} catch (error) {
		console.error('Failed to load localities:', error.message);
		throw error;
	}
}

/**
 * Create or get election
 */
async function getOrCreateElection() {
	if (cache.election) return cache.election;
	
	try {
		cache.election = await apiPost('/elections', {
			name: ELECTION_NAME,
			year: ELECTION_YEAR,
			type: 'general'
		});
		console.log(`  Created election: ${cache.election.name}`);
	} catch (error) {
		// Try to get existing
		const elections = await apiGet('/elections');
		cache.election = elections.find(e => e.year === ELECTION_YEAR);
		
		if (!cache.election) {
			throw new Error('Failed to create or find election');
		}
		console.log(`  Using existing election: ${cache.election.name}`);
	}
	
	return cache.election;
}

/**
 * Create or get contest
 */
async function getOrCreateContest(contestName, scope) {
	const key = contestName;
	
	if (cache.contests.has(key)) {
		return cache.contests.get(key);
	}
	
	const election = await getOrCreateElection();
	const position = extractPosition(contestName);
	
	// Extract jurisdiction from contest name
	const jurisdictionMatch = contestName.match(/of\s+(.+)$/i);
	const jurisdiction = jurisdictionMatch ? jurisdictionMatch[1].trim() : null;
	
	try {
		const contest = await apiPost('/elections/contests', {
			name: contestName,
			position,
			scope,
			jurisdiction,
			electionId: election.id
		});
		
		cache.contests.set(key, contest);
		stats.contestsCreated++;
		return contest;
	} catch (error) {
		// Contest might already exist, try to find it
		console.error(`  Failed to create contest: ${contestName}`);
		return null;
	}
}

/**
 * Create or get candidate
 */
async function getOrCreateCandidate(contestId, candidateInfo, colorIndex) {
	const key = `${contestId}-${candidateInfo.name}`;
	
	if (cache.candidates.has(key)) {
		return cache.candidates.get(key);
	}
	
	try {
		const candidate = await apiPost('/elections/candidates', {
			name: candidateInfo.name,
			party: candidateInfo.party,
			ballotNumber: candidateInfo.ballotNumber,
			color: CANDIDATE_COLORS[colorIndex % CANDIDATE_COLORS.length],
			contestId
		});
		
		cache.candidates.set(key, candidate);
		stats.candidatesCreated++;
		return candidate;
	} catch (error) {
		// Candidate might already exist
		return null;
	}
}

/**
 * Create election result
 */
async function createResult(candidateId, localityId, votes, percentage, precinctCode) {
	try {
		await apiPost('/elections/results', {
			candidateId,
			localityId,
			votes,
			percentage,
			precinctCode
		});
		stats.resultsCreated++;
	} catch (error) {
		stats.resultsFailed++;
	}
}

/**
 * Find locality by trying multiple matching strategies
 */
function findLocality(barangayName, municipalityName, provinceName) {

	// Strategy 1: Exact barangay name match
	const normalizedBarangay = normalizeLocalityName(barangayName);
	const normalizedMunicipality = normalizeLocalityName(municipalityName);
	let locality = cache.localities.get(`${normalizedBarangay}, ${normalizedMunicipality}`);
	if (locality) return locality;
	
	// Strategy 2: Try common name variations
	const variations = [
		normalizedBarangay,
		normalizedBarangay.replace('POBLACION', 'POB'),
		normalizedBarangay.replace('POB', 'POBLACION'),
		normalizedBarangay.replace('SAN ', 'STO '),
		normalizedBarangay.replace('STO ', 'SAN '),
		normalizedBarangay.replace('SANTO ', 'STO '),
		normalizedBarangay.replace('SANTA ', 'STA '),
		normalizedBarangay.replace('STA ', 'SANTA '),
		// Handle numbered barangays like "POBLACION_1" -> "POBLACION 1"
		normalizedBarangay.replace(/_(\d+)$/, ' $1'),
	];
	
	for (const variant of variations) {
		locality = cache.localities.get(variant);
		if (locality) return locality;
	}
	
	return null;
}

/**
 * Process a single CSV file
 */
async function processCSVFile(filePath, barangayName, municipalityName, provinceName) {
	const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
	const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
	
	let isHeader = true;
	const precinctCode = path.basename(filePath, '.csv');
	
	// Find matching locality using multiple strategies
	let locality = findLocality(barangayName, municipalityName, provinceName);
	
	// Track unmatched for debugging
	if (!locality) {
		if (!cache.unmatched) cache.unmatched = new Set();
		const key = `${barangayName}, ${municipalityName}`;
		if (!cache.unmatched.has(key)) {
			cache.unmatched.add(key);
			// Uncomment to debug: console.log(`  ⚠ No match: ${key}`);
		}
		return;
	}
	
	let colorIndex = 0;
	let firstLine = true;
	
	for await (const line of rl) {
		if (isHeader) {
			isHeader = false;
			continue;
		}
		
		if (!line.trim()) continue;
		
		const fields = parseCSVLine(line);
		if (fields.length < 7) continue;
		
		const [csvPrecinctCode, location, , scope, contestName, candidateNameRaw, votesStr, percentageStr] = fields;
		
		// On first data line, try to get better locality match from CSV location field
		// Format: "NIR, SIQUIJOR, MARIA, SAGUING"
		if (firstLine && !locality && location) {
			firstLine = false;
			const locationParts = location.split(',').map(s => s.trim());
			if (locationParts.length >= 4) {
				const csvBarangay = locationParts[locationParts.length - 1];
				locality = findLocality(csvBarangay, municipalityName, provinceName);
			}
		}
		
		if (!locality) continue;
		
		const votes = parseInt(votesStr) || 0;
		const percentage = parseFloat(percentageStr) || 0;
		
		// Get or create contest
		const contest = await getOrCreateContest(contestName, scope);
		if (!contest) continue;
		
		// Parse candidate info
		const candidateInfo = parseCandidateName(candidateNameRaw);
		
		// Get or create candidate
		const candidate = await getOrCreateCandidate(contest.id, candidateInfo, colorIndex++);
		if (!candidate) continue;
		
		// Create result
		await createResult(candidate.id, locality.id, votes, percentage, precinctCode);
	}
}

/**
 * Recursively find all CSV files
 */
function findCSVFiles(dir, results = []) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		
		if (entry.isDirectory()) {
			findCSVFiles(fullPath, results);
		} else if (entry.name.endsWith('.csv')) {
			// Extract location info from path
			// Structure: election-results/PROVINCE/MUNICIPALITY/BARANGAY/precinct.csv
			const relativePath = path.relative(ELECTION_RESULTS_DIR, fullPath);
			const parts = relativePath.split(path.sep);
			
			if (parts.length >= 4) {
				results.push({
					path: fullPath,
					province: parts[0],
					municipality: parts[1],
					barangay: parts[2],
					precinct: parts[3].replace('.csv', '')
				});
			}
		}
	}
	
	return results;
}

/**
 * Main import function
 */
async function importElectionResults() {
	console.log('='.repeat(70));
	console.log('ELECTION RESULTS IMPORTER');
	console.log('='.repeat(70));
	console.log('');
	console.log(`Election: ${ELECTION_NAME} (${ELECTION_YEAR})`);
	console.log(`Source: ${ELECTION_RESULTS_DIR}`);
	console.log('');
	
	// Check if directory exists
	if (!fs.existsSync(ELECTION_RESULTS_DIR)) {
		console.error(`❌ Directory not found: ${ELECTION_RESULTS_DIR}`);
		process.exit(1);
	}
	
	// Load localities for matching
	await loadLocalities();
	
	if (cache.localities.size === 0) {
		console.error('❌ No localities found. Please seed localities first.');
		process.exit(1);
	}
	
	// Find all CSV files
	console.log('\nScanning for CSV files...');
	const csvFiles = findCSVFiles(ELECTION_RESULTS_DIR);
	console.log(`  Found ${csvFiles.length} CSV files`);
	
	// Group by barangay for progress tracking
	const byProvince = {};
	for (const file of csvFiles) {
		byProvince[file.province] = byProvince[file.province] || [];
		byProvince[file.province].push(file);
	}
	
	console.log('\nProvince breakdown:');
	for (const [province, files] of Object.entries(byProvince)) {
		console.log(`  ${province}: ${files.length} precincts`);
	}
	
	// Process files
	console.log('\nImporting results...');
	
	for (const file of csvFiles) {
		await processCSVFile(file.path, file.barangay, file.municipality, file.province);
		stats.filesProcessed++;
		
		if (stats.filesProcessed % 50 === 0) {
			process.stdout.write(`\r  Progress: ${stats.filesProcessed}/${csvFiles.length} files`);
		}
	}
	
	console.log('\n');
	console.log('='.repeat(70));
	console.log('Import Complete!');
	console.log('='.repeat(70));
	console.log('');
	console.log('Statistics:');
	console.log(`  Files processed: ${stats.filesProcessed}`);
	console.log(`  Contests created: ${stats.contestsCreated}`);
	console.log(`  Candidates created: ${stats.candidatesCreated}`);
	console.log(`  Results created: ${stats.resultsCreated}`);
	console.log(`  Results failed: ${stats.resultsFailed}`);
	
	// Report unmatched barangays
	if (cache.unmatched && cache.unmatched.size > 0) {
		console.log('');
		console.log(`⚠ Unmatched barangays (${cache.unmatched.size}):`);
		const unmatchedArray = Array.from(cache.unmatched).sort();
		for (const name of unmatchedArray.slice(0, 20)) {
			console.log(`    - ${name}`);
		}
		if (unmatchedArray.length > 20) {
			console.log(`    ... and ${unmatchedArray.length - 20} more`);
		}
	}
	console.log('');
}

importElectionResults().catch(error => {
	console.error('\n❌ Import failed:', error);
	process.exit(1);
});

