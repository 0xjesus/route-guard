"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { EVENT_TYPES, EventType, ReportMarker } from "./GoogleMap";

// Route hazard result
export interface RouteHazard {
  report: ReportMarker;
  distanceFromStart: number; // meters along route
}

// Single route info
export interface RouteInfo {
  index: number;
  summary: string;
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
  durationInTraffic?: string;
  hazardCount: number;
  hazards: RouteHazard[];
  warnings: string[];
  color: string; // Route color for UI display
  // For Google Maps navigation
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  waypoints: { lat: number; lng: number }[];
}

// Full route result with data
export interface RouteResult {
  startAddress: string;
  endAddress: string;
  routes: RouteInfo[];
  selectedRouteIndex: number;
}

// Map controller interface for external control
export interface MapController {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  focusOnReport: (report: ReportMarker) => void;
  showAllReports: () => void;
  toggleHeatmap: () => void;
  toggleClustering: () => void;
  getStreetViewPreview: (lat: number, lng: number) => string;
  calculateRoute: (origin: string, destination: string, showAlternatives?: boolean) => Promise<RouteResult>;
  selectRoute: (index: number) => void;
  selectRoutes: (indices: number[]) => void;
  clearRoute: () => void;
}

interface AdvancedMapProps {
  reports: ReportMarker[];
  selectedReport?: ReportMarker | null;
  onReportSelect?: (report: ReportMarker) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
  showHeatmap?: boolean;
  className?: string;
}

// Route colors for comparison
const ROUTE_COLORS = [
  { main: "#65B3AE", alt: "#65B3AE50" }, // Teal (selected)
  { main: "#8B5CF6", alt: "#8B5CF650" }, // Purple
  { main: "#F59E0B", alt: "#F59E0B50" }, // Orange
  { main: "#EC4899", alt: "#EC489950" }, // Pink
  { main: "#10B981", alt: "#10B98150" }, // Green
];

const AdvancedMap = forwardRef<MapController, AdvancedMapProps>(
  ({ reports, selectedReport, onReportSelect, onLocationSelect, showHeatmap = false, className }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
    const routeMarkersRef = useRef<google.maps.Marker[]>([]);
    const directionsResultRef = useRef<google.maps.DirectionsResult | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [heatmapVisible, setHeatmapVisible] = useState(showHeatmap);

    // Expose controller methods
    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, zoom = 16) => {
        if (!mapInstance.current) return;

        // Smooth fly animation
        mapInstance.current.panTo({ lat, lng });

        // Animate zoom
        const currentZoom = mapInstance.current.getZoom() || 12;
        const zoomSteps = Math.abs(zoom - currentZoom);
        const zoomDirection = zoom > currentZoom ? 1 : -1;

        let step = 0;
        const animateZoom = () => {
          if (step < zoomSteps && mapInstance.current) {
            mapInstance.current.setZoom(currentZoom + (step * zoomDirection));
            step++;
            requestAnimationFrame(animateZoom);
          }
        };

        setTimeout(animateZoom, 300);
      },

      focusOnReport: (report: ReportMarker) => {
        if (!mapInstance.current) return;

        // Epic fly-to animation
        const map = mapInstance.current;

        // First, zoom out slightly for dramatic effect
        map.setZoom(Math.max((map.getZoom() || 12) - 2, 10));

        setTimeout(() => {
          // Then fly to location
          map.panTo({ lat: report.lat, lng: report.lng });

          setTimeout(() => {
            // Finally zoom in
            map.setZoom(17);

            // Pulse the marker
            const marker = markersRef.current.get(report.id);
            if (marker?.content) {
              const element = marker.content as HTMLElement;
              element.classList.add("pulse-animation");
              setTimeout(() => element.classList.remove("pulse-animation"), 2000);
            }
          }, 500);
        }, 300);
      },

      showAllReports: () => {
        if (!mapInstance.current || reports.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        reports.forEach((r) => bounds.extend({ lat: r.lat, lng: r.lng }));
        mapInstance.current.fitBounds(bounds, 50);
      },

      toggleHeatmap: () => {
        if (heatmapRef.current) {
          const newVisibility = !heatmapVisible;
          heatmapRef.current.setMap(newVisibility ? mapInstance.current : null);
          setHeatmapVisible(newVisibility);
        }
      },

      toggleClustering: () => {
        if (clustererRef.current) {
          // Toggle clustering
          clustererRef.current.clearMarkers();
          clustererRef.current.addMarkers(Array.from(markersRef.current.values()));
        }
      },

      getStreetViewPreview: (lat: number, lng: number) => {
        return `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${lat},${lng}&fov=90&heading=235&pitch=10&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      },

      calculateRoute: async (origin: string, destination: string, showAlternatives = true): Promise<RouteResult> => {
        if (!directionsServiceRef.current || !mapInstance.current) {
          throw new Error("Map not initialized");
        }

        // Clear existing routes
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];
        routeMarkersRef.current.forEach(m => m.setMap(null));
        routeMarkersRef.current = [];
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }

        // Helper function to get hazards for a route
        const getHazardsForRoute = (routePath: google.maps.LatLng[]): RouteHazard[] => {
          const hazards: RouteHazard[] = [];
          reports.forEach((report) => {
            const reportLatLng = new google.maps.LatLng(report.lat, report.lng);
            let minDistance = Infinity;
            let distanceAlongRoute = 0;
            let cumulativeDistance = 0;

            for (let i = 0; i < routePath.length; i++) {
              const pathPoint = routePath[i];
              const distance = google.maps.geometry.spherical.computeDistanceBetween(reportLatLng, pathPoint);

              if (distance < minDistance) {
                minDistance = distance;
                distanceAlongRoute = cumulativeDistance;
              }

              if (i > 0) {
                cumulativeDistance += google.maps.geometry.spherical.computeDistanceBetween(
                  routePath[i - 1],
                  pathPoint
                );
              }
            }

            if (minDistance <= 500) {
              hazards.push({ report, distanceFromStart: distanceAlongRoute });
            }
          });
          return hazards.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
        };

        // Helper to draw all routes
        const drawAllRoutes = (result: google.maps.DirectionsResult, selectedIndex: number) => {
          // Clear existing polylines
          routePolylinesRef.current.forEach(p => p.setMap(null));
          routePolylinesRef.current = [];
          routeMarkersRef.current.forEach(m => m.setMap(null));
          routeMarkersRef.current = [];

          // Draw routes in reverse order so selected is on top
          const routeIndices = result.routes.map((_, i) => i).sort((a, b) => {
            if (a === selectedIndex) return 1;
            if (b === selectedIndex) return -1;
            return 0;
          });

          routeIndices.forEach((routeIndex) => {
            const route = result.routes[routeIndex];
            const isSelected = routeIndex === selectedIndex;
            const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];

            // Create polyline for this route
            const polyline = new google.maps.Polyline({
              path: route.overview_path,
              strokeColor: isSelected ? color.main : "#666666",
              strokeOpacity: isSelected ? 1 : 0.5,
              strokeWeight: isSelected ? 7 : 4,
              map: mapInstance.current,
              zIndex: isSelected ? 100 : routeIndex,
            });

            routePolylinesRef.current.push(polyline);

            // Add route number marker at midpoint
            const midIndex = Math.floor(route.overview_path.length / 2);
            const midPoint = route.overview_path[midIndex];

            const marker = new google.maps.Marker({
              position: midPoint,
              map: mapInstance.current,
              label: {
                text: String(routeIndex + 1),
                color: isSelected ? "#000" : "#fff",
                fontWeight: "bold",
                fontSize: "14px",
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 16,
                fillColor: isSelected ? color.main : "#666666",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
              zIndex: isSelected ? 200 : 50 + routeIndex,
            });

            routeMarkersRef.current.push(marker);
          });

          // Add start marker (green)
          const startMarker = new google.maps.Marker({
            position: result.routes[0].legs[0].start_location,
            map: mapInstance.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#22C55E",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
            zIndex: 300,
          });
          routeMarkersRef.current.push(startMarker);

          // Add end marker (red)
          const endMarker = new google.maps.Marker({
            position: result.routes[0].legs[0].end_location,
            map: mapInstance.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#EF4444",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
            zIndex: 300,
          });
          routeMarkersRef.current.push(endMarker);
        };

        return new Promise((resolve, reject) => {
          directionsServiceRef.current!.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
              provideRouteAlternatives: showAlternatives,
              drivingOptions: {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS,
              },
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                console.log(`[Routes] Google returned ${result.routes.length} routes`);

                // Store result for selectRoute
                directionsResultRef.current = result;

                // Draw all routes with route 0 selected
                drawAllRoutes(result, 0);

                // Fit bounds to show all routes
                const bounds = new google.maps.LatLngBounds();
                result.routes.forEach(route => {
                  route.overview_path.forEach(point => bounds.extend(point));
                });
                mapInstance.current!.fitBounds(bounds, 50);

                // Process ALL routes (main + alternatives)
                const allRoutes: RouteInfo[] = result.routes.map((route, index) => {
                  const leg = route.legs[0];
                  const routePath = route.overview_path || [];
                  const hazards = getHazardsForRoute(routePath);

                  // Get waypoints for Google Maps URL
                  const waypoints: { lat: number; lng: number }[] = [];
                  for (let i = Math.floor(routePath.length / 4); i < routePath.length; i += Math.floor(routePath.length / 4)) {
                    if (waypoints.length < 3) {
                      waypoints.push({
                        lat: routePath[i].lat(),
                        lng: routePath[i].lng(),
                      });
                    }
                  }

                  return {
                    index,
                    summary: route.summary || `Route ${index + 1}`,
                    distance: leg.distance?.text || "N/A",
                    distanceValue: leg.distance?.value || 0,
                    duration: leg.duration?.text || "N/A",
                    durationValue: leg.duration?.value || 0,
                    durationInTraffic: leg.duration_in_traffic?.text,
                    hazardCount: hazards.length,
                    hazards,
                    warnings: route.warnings || [],
                    color: ROUTE_COLORS[index % ROUTE_COLORS.length].main,
                    startLat: leg.start_location.lat(),
                    startLng: leg.start_location.lng(),
                    endLat: leg.end_location.lat(),
                    endLng: leg.end_location.lng(),
                    waypoints,
                  };
                });

                const routeResult: RouteResult = {
                  startAddress: result.routes[0].legs[0].start_address,
                  endAddress: result.routes[0].legs[0].end_address,
                  routes: allRoutes,
                  selectedRouteIndex: 0,
                };

                resolve(routeResult);
              } else {
                console.error("Directions request failed:", status);
                reject(new Error(`Directions request failed: ${status}`));
              }
            }
          );
        });
      },

      selectRoute: (index: number) => {
        if (!directionsResultRef.current || !mapInstance.current) return;

        // Clear and redraw all routes with new selection
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];
        routeMarkersRef.current.forEach(m => m.setMap(null));
        routeMarkersRef.current = [];

        const result = directionsResultRef.current;

        // Draw routes in reverse order so selected is on top
        const routeIndices = result.routes.map((_, i) => i).sort((a, b) => {
          if (a === index) return 1;
          if (b === index) return -1;
          return 0;
        });

        routeIndices.forEach((routeIndex) => {
          const route = result.routes[routeIndex];
          const isSelected = routeIndex === index;
          const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];

          const polyline = new google.maps.Polyline({
            path: route.overview_path,
            strokeColor: isSelected ? color.main : "#666666",
            strokeOpacity: isSelected ? 1 : 0.5,
            strokeWeight: isSelected ? 7 : 4,
            map: mapInstance.current,
            zIndex: isSelected ? 100 : routeIndex,
          });

          routePolylinesRef.current.push(polyline);

          // Route number marker
          const midIndex = Math.floor(route.overview_path.length / 2);
          const midPoint = route.overview_path[midIndex];

          const marker = new google.maps.Marker({
            position: midPoint,
            map: mapInstance.current,
            label: {
              text: String(routeIndex + 1),
              color: isSelected ? "#000" : "#fff",
              fontWeight: "bold",
              fontSize: "14px",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 16,
              fillColor: isSelected ? color.main : "#666666",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
            zIndex: isSelected ? 200 : 50 + routeIndex,
          });

          routeMarkersRef.current.push(marker);
        });

        // Start marker
        const startMarker = new google.maps.Marker({
          position: result.routes[0].legs[0].start_location,
          map: mapInstance.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#22C55E",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          zIndex: 300,
        });
        routeMarkersRef.current.push(startMarker);

        // End marker
        const endMarker = new google.maps.Marker({
          position: result.routes[0].legs[0].end_location,
          map: mapInstance.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#EF4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          zIndex: 300,
        });
        routeMarkersRef.current.push(endMarker);
      },

      selectRoutes: (indices: number[]) => {
        if (!directionsResultRef.current || !mapInstance.current) return;

        // Clear and redraw all routes with new selections
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];
        routeMarkersRef.current.forEach(m => m.setMap(null));
        routeMarkersRef.current = [];

        const result = directionsResultRef.current;
        const selectedSet = new Set(indices);

        // Draw unselected routes first, then selected ones on top
        const routeIndices = result.routes.map((_, i) => i).sort((a, b) => {
          const aSelected = selectedSet.has(a);
          const bSelected = selectedSet.has(b);
          if (aSelected && !bSelected) return 1;
          if (!aSelected && bSelected) return -1;
          return 0;
        });

        routeIndices.forEach((routeIndex) => {
          const route = result.routes[routeIndex];
          const isSelected = selectedSet.has(routeIndex);
          const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];

          const polyline = new google.maps.Polyline({
            path: route.overview_path,
            strokeColor: isSelected ? color.main : "#444444",
            strokeOpacity: isSelected ? 1 : 0.3,
            strokeWeight: isSelected ? 7 : 3,
            map: mapInstance.current,
            zIndex: isSelected ? 100 + routeIndex : routeIndex,
          });

          routePolylinesRef.current.push(polyline);

          // Route number marker
          const midIndex = Math.floor(route.overview_path.length / 2);
          const midPoint = route.overview_path[midIndex];

          const marker = new google.maps.Marker({
            position: midPoint,
            map: mapInstance.current,
            label: {
              text: String(routeIndex + 1),
              color: isSelected ? "#000" : "#888",
              fontWeight: "bold",
              fontSize: "14px",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 18 : 14,
              fillColor: isSelected ? color.main : "#444444",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: isSelected ? 3 : 1,
            },
            zIndex: isSelected ? 200 + routeIndex : 50 + routeIndex,
          });

          routeMarkersRef.current.push(marker);
        });

        // Start marker
        const startMarker = new google.maps.Marker({
          position: result.routes[0].legs[0].start_location,
          map: mapInstance.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#22C55E",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          zIndex: 300,
        });
        routeMarkersRef.current.push(startMarker);

        // End marker
        const endMarker = new google.maps.Marker({
          position: result.routes[0].legs[0].end_location,
          map: mapInstance.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#EF4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          zIndex: 300,
        });
        routeMarkersRef.current.push(endMarker);
      },

      clearRoute: () => {
        // Clear polylines
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];
        // Clear markers
        routeMarkersRef.current.forEach(m => m.setMap(null));
        routeMarkersRef.current = [];
        // Clear stored result
        directionsResultRef.current = null;
        // Clear directions renderer
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
        }
      },
    }));

    // Create animated marker element
    const createMarkerElement = useCallback((report: ReportMarker, isSelected: boolean) => {
      const config = EVENT_TYPES[report.eventType];

      const container = document.createElement("div");
      container.className = `marker-container ${isSelected ? "selected" : ""}`;
      container.innerHTML = `
        <div class="marker-wrapper" style="--marker-color: ${config.color}">
          <div class="marker-pulse"></div>
          <div class="marker-body">
            <span class="marker-icon">${config.icon}</span>
            ${report.confirmationCount >= 3 ? '<div class="verified-badge">✓</div>' : ""}
          </div>
          <div class="marker-pointer"></div>
          ${isSelected ? `
            <div class="marker-info">
              <div class="info-label">${config.label}</div>
              <div class="info-stats">
                <span>✓ ${report.confirmationCount}</span>
                <span>💰 ${report.totalRegards} MNT</span>
              </div>
            </div>
          ` : ""}
        </div>
      `;

      // Add click handler
      container.addEventListener("click", () => {
        onReportSelect?.(report);
      });

      return container;
    }, [onReportSelect]);

    // Initialize map
    useEffect(() => {
      const initMap = async () => {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "visualization", "marker", "geometry", "routes"],
        });

        try {
          const google = await loader.load();

          if (!mapRef.current) return;

          // Custom map styles for dark theme
          const mapStyles = [
            { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8892b0" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3d5c" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a2b" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1f1f3d" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2f1a" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
          ];

          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 19.4326, lng: -99.1332 }, // Mexico City
            zoom: 13,
            styles: mapStyles,
            mapId: "roadguard_dark_map",
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER,
            },
            gestureHandling: "greedy",
          });

          mapInstance.current = map;

          // Initialize DirectionsService and DirectionsRenderer
          directionsServiceRef.current = new google.maps.DirectionsService();
          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#65B3AE",
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          });

          // Add click listener for new reports
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onLocationSelect?.(e.latLng.lat(), e.latLng.lng());
            }
          });

          // Initialize heatmap
          const heatmapData = reports.map((r) => ({
            location: new google.maps.LatLng(r.lat, r.lng),
            weight: r.confirmationCount + 1,
          }));

          heatmapRef.current = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: showHeatmap ? map : null,
            radius: 50,
            opacity: 0.7,
            gradient: [
              "rgba(0, 0, 0, 0)",
              "rgba(101, 179, 174, 0.4)",
              "rgba(101, 179, 174, 0.6)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(239, 68, 68, 1)",
            ],
          });

          setIsLoaded(true);
        } catch (error) {
          console.error("Error loading map:", error);
        }
      };

      initMap();
    }, []);

    // Update markers when reports change
    useEffect(() => {
      if (!isLoaded || !mapInstance.current) return;

      const { AdvancedMarkerElement } = google.maps.marker;

      // Clear old markers
      markersRef.current.forEach((marker) => (marker.map = null));
      markersRef.current.clear();

      // Create new markers
      const markers: google.maps.marker.AdvancedMarkerElement[] = [];

      reports.forEach((report) => {
        const isSelected = selectedReport?.id === report.id;
        const element = createMarkerElement(report, isSelected);

        const marker = new AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat: report.lat, lng: report.lng },
          content: element,
          zIndex: isSelected ? 1000 : report.confirmationCount,
        });

        markersRef.current.set(report.id, marker);
        markers.push(marker);
      });

      // Update clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.addMarkers(markers);
      } else {
        clustererRef.current = new MarkerClusterer({
          map: mapInstance.current,
          markers,
          renderer: {
            render: ({ count, position }) => {
              const el = document.createElement("div");
              el.className = "cluster-marker";
              el.innerHTML = `
                <div class="cluster-body" style="position: relative; width: 56px; height: 56px;">
                  <img src="/images/cluster.png" alt="Cluster" style="width: 100%; height: 100%; object-fit: contain;" />
                  <span class="cluster-count" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                    ${count}
                    <span style="font-size: 8px; font-weight: normal; opacity: 0.9;">reports</span>
                  </span>
                </div>
              `;
              return new AdvancedMarkerElement({
                position,
                content: el,
                zIndex: count,
              });
            },
          },
        });
      }

      // Update heatmap data
      if (heatmapRef.current) {
        const heatmapData = reports.map((r) => ({
          location: new google.maps.LatLng(r.lat, r.lng),
          weight: r.confirmationCount + 1,
        }));
        heatmapRef.current.setData(heatmapData);
      }
    }, [reports, selectedReport, isLoaded, createMarkerElement]);

    return (
      <div className={`relative ${className}`}>
        <div ref={mapRef} className="w-full h-full" />

        {/* Map controls overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => setHeatmapVisible((v) => {
              if (heatmapRef.current) {
                heatmapRef.current.setMap(!v ? mapInstance.current : null);
              }
              return !v;
            })}
            className={`p-3 rounded-xl backdrop-blur-md transition-all ${
              heatmapVisible
                ? "bg-mantle-accent text-black"
                : "bg-black/50 text-white border border-white/10"
            }`}
            title="Toggle Heatmap"
          >
            🔥
          </button>
        </div>

        {/* Loading state */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-mantle-bg-primary flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="spinner w-10 h-10" />
              <p className="text-mantle-text-secondary">Loading map...</p>
            </div>
          </div>
        )}

        {/* Marker styles */}
        <style jsx global>{`
          .marker-container {
            cursor: pointer;
            transform: translateY(0);
            transition: transform 0.3s ease;
          }

          .marker-container:hover {
            transform: translateY(-5px) scale(1.1);
          }

          .marker-container.selected .marker-wrapper {
            transform: scale(1.2);
          }

          .marker-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.3s ease;
          }

          .marker-pulse {
            position: absolute;
            width: 60px;
            height: 60px;
            background: var(--marker-color);
            border-radius: 50%;
            opacity: 0;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }

          .pulse-animation .marker-pulse {
            animation: pulse 0.5s ease-out 3;
          }

          .marker-body {
            position: relative;
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--marker-color), color-mix(in srgb, var(--marker-color) 70%, black));
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px var(--marker-color), 0 0 30px color-mix(in srgb, var(--marker-color) 30%, transparent);
            border: 2px solid rgba(255,255,255,0.3);
          }

          .marker-icon {
            transform: rotate(45deg);
            font-size: 20px;
          }

          .verified-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            width: 18px;
            height: 18px;
            background: #22c55e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: white;
            transform: rotate(45deg);
            border: 2px solid white;
          }

          .marker-pointer {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 10px solid var(--marker-color);
            margin-top: -2px;
          }

          .marker-info {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) rotate(45deg);
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 8px 12px;
            margin-bottom: 10px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.1);
          }

          .marker-info .info-label {
            color: white;
            font-weight: 600;
            font-size: 12px;
            margin-bottom: 4px;
          }

          .marker-info .info-stats {
            display: flex;
            gap: 10px;
            font-size: 11px;
            color: rgba(255,255,255,0.7);
          }

          .cluster-marker {
            cursor: pointer;
          }

          .cluster-body {
            background: linear-gradient(135deg, #65B3AE, #4A9A95);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(101, 179, 174, 0.5);
            border: 3px solid white;
          }

          .cluster-count {
            font-size: 16px;
            font-weight: bold;
            color: white;
            line-height: 1;
          }

          .cluster-label {
            font-size: 8px;
            color: rgba(255,255,255,0.8);
            text-transform: uppercase;
          }
        `}</style>
      </div>
    );
  }
);

AdvancedMap.displayName = "AdvancedMap";
export default AdvancedMap;
