<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';

	export let localities: any[] = [];
	export let center: [number, number] = [14.5995, 120.9842]; // Default: Manila
	export let zoom: number = 12;

	let mapContainer: HTMLDivElement;
	let map: LeafletMap;
	let geoJsonLayer: LeafletGeoJSON;
	let L: any;

	onMount(async () => {
		// Dynamically import Leaflet to avoid SSR issues
		L = await import('leaflet');

		// Initialize the map
		map = L.map(mapContainer).setView(center, zoom);

		// Add OpenStreetMap tile layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(map);

		// Add GeoJSON layer if localities provided
		if (localities.length > 0) {
			addLocalitiesLayer();
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});

	function addLocalitiesLayer() {
		if (!L || !map) return;

		// Remove existing layer if present
		if (geoJsonLayer) {
			map.removeLayer(geoJsonLayer);
		}

		// Create GeoJSON FeatureCollection
		const featureCollection = {
			type: 'FeatureCollection',
			features: localities.map((locality) => ({
				type: 'Feature',
				properties: {
					id: locality.id,
					name: locality.name,
					code: locality.code,
					type: locality.type,
					population: locality.population
				},
				geometry: locality.boundaryGeoJSON
			}))
		};

		// Add GeoJSON layer with styling and interactions
		geoJsonLayer = L.geoJSON(featureCollection, {
			style: (feature: any) => ({
				fillColor: '#3388ff',
				weight: 2,
				opacity: 1,
				color: '#0066cc',
				fillOpacity: 0.3
			}),
			onEachFeature: (feature: any, layer: any) => {
				// Add popup with locality information
				const props = feature.properties;
				const popupContent = `
					<div style="padding: 8px;">
						<h3 style="margin: 0 0 8px 0; font-size: 16px;">${props.name}</h3>
						${props.code ? `<p style="margin: 4px 0;"><strong>Code:</strong> ${props.code}</p>` : ''}
						${props.type ? `<p style="margin: 4px 0;"><strong>Type:</strong> ${props.type}</p>` : ''}
						${props.population ? `<p style="margin: 4px 0;"><strong>Population:</strong> ${props.population.toLocaleString()}</p>` : ''}
					</div>
				`;
				layer.bindPopup(popupContent);

				// Add hover effect
				layer.on('mouseover', function () {
					this.setStyle({
						fillOpacity: 0.6,
						weight: 3
					});
				});

				layer.on('mouseout', function () {
					this.setStyle({
						fillOpacity: 0.3,
						weight: 2
					});
				});

				// Emit click event (for parent component to handle)
				layer.on('click', function () {
					window.dispatchEvent(
						new CustomEvent('localityClick', { detail: feature.properties })
					);
				});
			}
		}).addTo(map);

		// Fit map to show all localities
		map.fitBounds(geoJsonLayer.getBounds());
	}

	// Reactive statement to update layer when localities change
	$: if (map && L && localities) {
		addLocalitiesLayer();
	}
</script>

<!-- Leaflet CSS -->
<svelte:head>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
</svelte:head>

<div bind:this={mapContainer} class="map-container"></div>

<style>
	.map-container {
		width: 100%;
		height: 100%;
		min-height: 500px;
	}

	:global(.leaflet-popup-content h3) {
		font-weight: 600;
		color: #333;
	}

	:global(.leaflet-popup-content p) {
		font-size: 14px;
		color: #666;
	}
</style>

