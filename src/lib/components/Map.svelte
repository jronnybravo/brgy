<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';

	export let localities: any[] = [];
	export let center: [number, number] = [9.2, 123.5];
	export let zoom: number = 11;
	export let colorMap: Record<number, string> = {};
	export let electionResults: any = null;
	export let assistanceData: any = null;

	let mapContainer: HTMLDivElement;
	let map: LeafletMap;
	let geoJsonLayer: LeafletGeoJSON;
	let L: any;
	let customPopup: HTMLDivElement | null = null;
	let lastMouseX = 0;
	let lastMouseY = 0;

	onMount(async () => {
		L = await import('leaflet');

		map = L.map(mapContainer).setView(center, zoom);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
			maxZoom: 19
		}).addTo(map);

		if (localities.length > 0) {
			addLocalitiesLayer();
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});

	function getLocalityColor(localityId: number): string {
		if (colorMap[localityId]) {
			return colorMap[localityId];
		}
		return '#6366f1'; // Default indigo
	}

	function showCustomPopup(locality: any, x: number, y: number) {
		const result = electionResults?.results?.[locality.id];
		const assistance = assistanceData?.barangays?.find((b: any) => b.id === locality.id);
		
		let content = `
			<div class="popup-content">
				<h3>${locality.name}</h3>
				${locality.type ? `<p class="type">${locality.type}</p>` : ''}
		`;
		
		if (result && electionResults?.candidates) {
			content += `<div class="results">`;
			
			// Sort candidates by votes for this locality
			const candidateVotes = Object.entries(result.votes || {})
				.map(([candId, votes]) => {
					const candidate = electionResults.candidates.find((c: any) => c.id === parseInt(candId));
					return { candidate, votes };
				})
				.filter(cv => cv.candidate)
				.sort((a: any, b: any) => (b.votes as number) - (a.votes as number));
			
			for (const { candidate, votes } of candidateVotes.slice(0, 5)) {
				const isWinner = candidate.id === result.winnerId;
				const pct = result.totalVotes > 0 
					? ((votes as number / result.totalVotes) * 100).toFixed(1) 
					: '0.0';
				
				content += `
					<div class="result-row ${isWinner ? 'winner' : ''}">
						<span class="dot" style="background:${candidate.color}"></span>
						<span class="cand-name">${candidate.name}</span>
						<span class="cand-votes">${(votes as number).toLocaleString()} (${pct}%)</span>
					</div>
				`;
			}
			
			content += `<p class="total">Total: ${result.totalVotes.toLocaleString()}</p></div>`;
		}

		if (assistance !== undefined) {
			content += `<div class="assistance-data">
				<p class="section-title"><strong>Financial Assistance Disbursed</strong></p>`;
			
			const types = Object.keys(assistance.byType);
			if (types.length > 0) {
				content += `<div class="assistance-types">`;
				types.forEach((type) => {
					const amount = assistance.byType[type];
					content += `
						<div class="assistance-row">
							<span class="type-label">${type}:</span>
							<span class="type-amount">₱${(amount as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
						</div>
					`;
				});
				content += `</div>`;
			}
			
			content += `<p class="total-assistance" style="margin-top: 0.5em; border-top: 1px solid #ddd; padding-top: 0.5em;">Total: ₱${assistance.totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>`;
			content += `</div>`;
		}
		
		content += '</div>';
		
		// Remove old popup if exists
		if (customPopup) {
			customPopup.remove();
		}
		
		// Create new custom popup element
		const popupEl = document.createElement('div');
		popupEl.className = 'custom-popup-container';
		popupEl.innerHTML = content;
		
		// Position based on available space
		const mapContainer = map.getContainer();
		const mapHeight = mapContainer.clientHeight;
		const mapWidth = mapContainer.clientWidth;
		const mapRect = mapContainer.getBoundingClientRect();
		
		const popupWidth = 300;
		const popupHeight = 140;
		const offset = 10; // Smaller offset, closer to cursor
		
		let left = mapRect.left + x + offset;
		let top = mapRect.top + y - popupHeight / 2; // Center vertically on cursor
		
		// If popup would go off right edge, show on left side instead
		if (left + popupWidth > window.innerWidth) {
			left = mapRect.left + x - popupWidth - offset;
		}
		
		// Keep popup within reasonable bounds horizontally - prefer right side when possible
		left = Math.max(mapRect.left + 10, Math.min(left, window.innerWidth - popupWidth - 10));
		
		// Adjust vertical position to keep popup fully visible
		const bottomSpace = window.innerHeight - (mapRect.top + y);
		const topSpace = mapRect.top + y;
		
		// If not enough space below, move above cursor (large threshold for maximum margin)
		if (bottomSpace < popupHeight + 2000) {
			top = mapRect.top + y - popupHeight - offset;
		}
		
		// Ensure top doesn't go above map top
		if (top < mapRect.top) {
			top = mapRect.top + 10;
		}
		
		// Ensure bottom doesn't go below viewport
		if (top + popupHeight > window.innerHeight) {
			top = window.innerHeight - popupHeight - 10;
		}
		
		popupEl.style.left = left + 'px';
		popupEl.style.top = top + 'px';
		
		document.body.appendChild(popupEl);
		customPopup = popupEl;
	}

	function hideCustomPopup() {
		if (customPopup) {
			customPopup.remove();
			customPopup = null;
		}
	}

	function getPopupContent(locality: any): string {
		const result = electionResults?.results?.[locality.id];
		const assistance = assistanceData?.barangays?.find((b: any) => b.id === locality.id);
		
		let content = `
			<div class="popup-content">
				<h3>${locality.name}</h3>
				${locality.type ? `<p class="type">${locality.type}</p>` : ''}
		`;
		
		if (result && electionResults?.candidates) {
			content += `<div class="results">`;
			
			// Sort candidates by votes for this locality
			const candidateVotes = Object.entries(result.votes || {})
				.map(([candId, votes]) => {
					const candidate = electionResults.candidates.find((c: any) => c.id === parseInt(candId));
					return { candidate, votes };
				})
				.filter(cv => cv.candidate)
				.sort((a: any, b: any) => (b.votes as number) - (a.votes as number));
			
			for (const { candidate, votes } of candidateVotes.slice(0, 5)) {
				const isWinner = candidate.id === result.winnerId;
				const pct = result.totalVotes > 0 
					? ((votes as number / result.totalVotes) * 100).toFixed(1) 
					: '0.0';
				
				content += `
					<div class="result-row ${isWinner ? 'winner' : ''}">
						<span class="dot" style="background:${candidate.color}"></span>
						<span class="cand-name">${candidate.name}</span>
						<span class="cand-votes">${(votes as number).toLocaleString()} (${pct}%)</span>
					</div>
				`;
			}
			
			content += `<p class="total">Total: ${result.totalVotes.toLocaleString()}</p></div>`;
		}

		if (assistance !== undefined) {
			content += `<div class="assistance-data">
				<p class="section-title"><strong>Financial Assistance Disbursed</strong></p>`;
			
			const types = Object.keys(assistance.byType);
			if (types.length > 0) {
				content += `<div class="assistance-types">`;
				types.forEach((type) => {
					const amount = assistance.byType[type];
					content += `
						<div class="assistance-row">
							<span class="type-label">${type}:</span>
							<span class="type-amount">₱${(amount as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
						</div>
					`;
				});
				content += `</div>`;
			}
			
			content += `<p class="total-assistance" style="margin-top: 0.5em; border-top: 1px solid #ddd; padding-top: 0.5em;">Total: ₱${assistance.totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>`;
			content += `</div>`;
		}
		
		content += '</div>';
		return content;
	}

	function getNavigationLink(locality: any): string {
		// If locality has a parent, it's a barangay; parent is the municipality
		if (locality.parentId) {
			return `/dashboard/municipalities/${locality.parentId}/barangays/${locality.id}`;
		}
		// If no parent, it's likely a municipality itself
		return `/dashboard/municipalities/${locality.id}`;
	}

	function isValidGeoJSON(geoJson: any): boolean {
		if (!geoJson) return false;
		if (typeof geoJson === 'string') {
			try {
				geoJson = JSON.parse(geoJson);
			} catch {
				return false;
			}
		}
		// Check if it has the required geometry properties
		return geoJson && (geoJson.type === 'Polygon' || geoJson.type === 'MultiPolygon' || geoJson.type === 'Point' || geoJson.type === 'LineString');
	}

	function addLocalitiesLayer() {
		if (!L || !map) return;

		if (geoJsonLayer) {
			map.removeLayer(geoJsonLayer);
		}

		const validLocalities = localities.filter(loc => {
			if (!loc.boundaryGeoJSON) return false;
			
			// Validate GeoJSON
			let geoJson = loc.boundaryGeoJSON;
			if (typeof geoJson === 'string') {
				try {
					geoJson = JSON.parse(geoJson);
				} catch {
					console.warn(`Invalid GeoJSON for locality ${loc.name}`, geoJson);
					return false;
				}
			}
			return isValidGeoJSON(geoJson);
		});

		if (validLocalities.length === 0) {
			console.warn('No valid localities with GeoJSON found');
			return;
		}

		const featureCollection = {
			type: 'FeatureCollection',
			features: validLocalities.map((locality) => {
				let geoJson = locality.boundaryGeoJSON;
				if (typeof geoJson === 'string') {
					geoJson = JSON.parse(geoJson);
				}
				return {
					type: 'Feature',
					properties: {
						id: locality.id,
						name: locality.name,
						code: locality.code,
						type: locality.type,
						population: locality.population
					},
					geometry: geoJson
				};
			})
		};

		try {
			geoJsonLayer = L.geoJSON(featureCollection, {
				style: (feature: any) => {
					const hasResults = colorMap[feature.properties.id];
					return {
						fillColor: getLocalityColor(feature.properties.id),
						weight: hasResults ? 2 : 1,
						opacity: 1,
						color: hasResults ? '#ffffff' : 'rgba(255,255,255,0.3)',
						fillOpacity: hasResults ? 0.7 : 0.4
					};
				},
				onEachFeature: (feature: any, layer: any) => {
					const locality = localities.find(l => l.id === feature.properties.id);
					if (locality) {
						// Don't use Leaflet's built-in popup
						
						// Show custom popup on hover
						layer.on('mouseover', function (this: any, event: any) {
							const mapContainer = map.getContainer();
							const mouseX = event.originalEvent.clientX - mapContainer.getBoundingClientRect().left;
							const mouseY = event.originalEvent.clientY - mapContainer.getBoundingClientRect().top;
							
							lastMouseX = mouseX;
							lastMouseY = mouseY;
							
							showCustomPopup(locality, mouseX, mouseY);
							
							this.setStyle({
								fillOpacity: 0.9,
								weight: 3
							});
							this.bringToFront();
						});

						// Update popup position on mousemove
						layer.on('mousemove', function (this: any, event: any) {
							const mapContainer = map.getContainer();
							const mouseX = event.originalEvent.clientX - mapContainer.getBoundingClientRect().left;
							const mouseY = event.originalEvent.clientY - mapContainer.getBoundingClientRect().top;
							
							lastMouseX = mouseX;
							lastMouseY = mouseY;
							
							if (customPopup) {
								showCustomPopup(locality, mouseX, mouseY);
							}
						});

						// Hide popup and restore style on mouseout
						layer.on('mouseout', function (this: any) {
							hideCustomPopup();
							const hasResults = colorMap[feature.properties.id];
							this.setStyle({
								fillOpacity: hasResults ? 0.7 : 0.4,
								weight: hasResults ? 2 : 1
							});
						});

						// Navigate on click
						layer.on('click', function () {
							const navigationLink = getNavigationLink(locality);
							window.location.href = navigationLink;
						});
					}
				}
			}).addTo(map);

			if (featureCollection.features.length > 0) {
				map.fitBounds(geoJsonLayer.getBounds());
			}
		} catch (error) {
			console.error('Error adding GeoJSON layer to map:', error);
		}
	}

	$: if (map && L && localities) {
		addLocalitiesLayer();
	}

	$: if (map && L && colorMap) {
		addLocalitiesLayer();
	}
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
	<style>
		.custom-popup-container {
			position: fixed;
			background: #1a1a3e;
			color: white;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.4);
			padding: 12px;
			max-width: 300px;
			z-index: 9999;
			pointer-events: none;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		}
		.custom-popup .leaflet-popup-content-wrapper {
			background: #1a1a3e;
			color: white;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.4);
		}
		.custom-popup .leaflet-popup-tip {
			background: #1a1a3e;
		}
		.custom-popup-container .popup-content h3 {
			margin: 0 0 4px 0;
			font-size: 14px;
			font-weight: 600;
		}
		.custom-popup-container .popup-content .type {
			margin: 0 0 8px 0;
			font-size: 11px;
			opacity: 0.6;
			text-transform: capitalize;
		}
		.custom-popup-container .popup-content .results {
			border-top: 1px solid rgba(255,255,255,0.1);
			padding-top: 8px;
			margin-top: 8px;
		}
		.custom-popup-container .popup-content .result-row {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 3px 0;
			font-size: 12px;
		}
		.custom-popup-container .popup-content .result-row.winner {
			font-weight: 600;
		}
		.custom-popup-container .popup-content .dot {
			width: 10px;
			height: 10px;
			border-radius: 2px;
			flex-shrink: 0;
		}
		.custom-popup-container .popup-content .cand-name {
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 120px;
		}
		.custom-popup-container .popup-content .cand-votes {
			color: #a78bfa;
			font-size: 11px;
		}
		.custom-popup-container .popup-content .total {
			margin: 8px 0 0 0;
			font-size: 11px;
			opacity: 0.6;
			border-top: 1px solid rgba(255,255,255,0.1);
			padding-top: 6px;
		}
		.custom-popup-container .popup-content .assistance-data {
			border-top: 1px solid rgba(255,255,255,0.1);
			padding-top: 8px;
			margin-top: 8px;
		}
		.custom-popup-container .popup-content .section-title {
			margin: 0 0 4px 0;
			font-size: 12px;
		}
		.custom-popup-container .popup-content .total-assistance {
			margin: 4px 0;
			font-size: 12px;
			font-weight: 600;
			color: #60a5fa;
		}
		.custom-popup-container .popup-content .assistance-types {
			font-size: 11px;
			margin-top: 6px;
		}
		.custom-popup-container .popup-content .assistance-row {
			display: flex;
			justify-content: space-between;
			padding: 2px 0;
			gap: 8px;
		}
		.custom-popup-container .popup-content .type-label {
			opacity: 0.8;
		}
		.custom-popup-container .popup-content .type-amount {
			color: #10b981;
			font-weight: 500;
		}
	</style>
</svelte:head>

<div bind:this={mapContainer} class="map-container"></div>

<style>
	.map-container {
		width: 100%;
		height: 500px;
		border-radius: 8px;
	}
</style>
