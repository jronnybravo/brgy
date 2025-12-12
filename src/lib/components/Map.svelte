<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';

	export let localities: any[] = [];
	export let center: [number, number] = [9.2, 123.5];
	export let zoom: number = 11;
	export let colorMap: Record<number, string> = {};
	export let electionResults: any = null;

	let mapContainer: HTMLDivElement;
	let map: LeafletMap;
	let geoJsonLayer: LeafletGeoJSON;
	let L: any;

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

	function getPopupContent(locality: any): string {
		const result = electionResults?.results?.[locality.id];
		
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
		
		content += '</div>';
		return content;
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
						layer.bindPopup(getPopupContent(locality), {
							className: 'custom-popup'
						});
					}

					layer.on('mouseover', function () {
						this.setStyle({
							fillOpacity: 0.9,
							weight: 3
						});
						this.bringToFront();
					});

					layer.on('mouseout', function () {
						const hasResults = colorMap[feature.properties.id];
						this.setStyle({
							fillOpacity: hasResults ? 0.7 : 0.4,
							weight: hasResults ? 2 : 1
						});
					});

					layer.on('click', function () {
						window.dispatchEvent(
							new CustomEvent('localityClick', { detail: feature.properties })
						);
					});
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
		.custom-popup .leaflet-popup-content-wrapper {
			background: #1a1a3e;
			color: white;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.4);
		}
		.custom-popup .leaflet-popup-tip {
			background: #1a1a3e;
		}
		.custom-popup .popup-content h3 {
			margin: 0 0 4px 0;
			font-size: 14px;
			font-weight: 600;
		}
		.custom-popup .popup-content .type {
			margin: 0 0 8px 0;
			font-size: 11px;
			opacity: 0.6;
			text-transform: capitalize;
		}
		.custom-popup .popup-content .results {
			border-top: 1px solid rgba(255,255,255,0.1);
			padding-top: 8px;
			margin-top: 8px;
		}
		.custom-popup .popup-content .result-row {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 3px 0;
			font-size: 12px;
		}
		.custom-popup .popup-content .result-row.winner {
			font-weight: 600;
		}
		.custom-popup .popup-content .dot {
			width: 10px;
			height: 10px;
			border-radius: 2px;
			flex-shrink: 0;
		}
		.custom-popup .popup-content .cand-name {
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 120px;
		}
		.custom-popup .popup-content .cand-votes {
			color: #a78bfa;
			font-size: 11px;
		}
		.custom-popup .popup-content .total {
			margin: 8px 0 0 0;
			font-size: 11px;
			opacity: 0.6;
			border-top: 1px solid rgba(255,255,255,0.1);
			padding-top: 6px;
		}
	</style>
</svelte:head>

<div bind:this={mapContainer} class="map-container"></div>

<style>
	.map-container {
		width: 100%;
		height: 100%;
		min-height: 500px;
		border-radius: 8px;
	}
</style>
