/**
 * Test Overpass API connectivity
 */

const SERVERS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter',
	'https://overpass.openstreetmap.ru/api/interpreter'
];

// Simple test query - just get one node in Manila
const testQuery = '[out:json][timeout:25];node(14.5995,120.9842,14.6,120.99);out 1;';

async function testServer(url) {
	try {
		console.log(`Testing: ${url}`);
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `data=${encodeURIComponent(testQuery)}`
		});

		if (!response.ok) {
			console.log(`  ✗ HTTP ${response.status}: ${response.statusText}\n`);
			return false;
		}

		const data = await response.json();
		console.log(`  ✓ Working! Returned ${data.elements?.length || 0} elements\n`);
		return true;
	} catch (error) {
		console.log(`  ✗ Error: ${error.message}\n`);
		return false;
	}
}

async function main() {
	console.log('='.repeat(70));
	console.log('Overpass API Server Test');
	console.log('='.repeat(70));
	console.log('');

	let workingServer = null;

	for (const server of SERVERS) {
		const works = await testServer(server);
		if (works && !workingServer) {
			workingServer = server;
		}
	}

	console.log('='.repeat(70));
	if (workingServer) {
		console.log(`✓ Working server found: ${workingServer}`);
		console.log('');
		console.log('You can update your fetch script to use this server:');
		console.log(`const OVERPASS_API = '${workingServer}';`);
	} else {
		console.log('✗ No working servers found');
		console.log('');
		console.log('All Overpass API servers appear to be down or unreachable.');
		console.log('Please try again later or use the manual data file.');
	}
	console.log('='.repeat(70));
}

main();

