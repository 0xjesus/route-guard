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

// Map controller interface for external control
export interface MapController {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  focusOnReport: (report: ReportMarker) => void;
  showAllReports: () => void;
  toggleHeatmap: () => void;
  toggleClustering: () => void;
  getStreetViewPreview: (lat: number, lng: number) => string;
  calculateRoute: (origin: string, destination: string) => Promise<RouteHazard[]>;
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

const AdvancedMap = forwardRef<MapController, AdvancedMapProps>(
  ({ reports, selectedReport, onReportSelect, onLocationSelect, showHeatmap = false, className }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
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

      calculateRoute: async (origin: string, destination: string): Promise<RouteHazard[]> => {
        if (!directionsServiceRef.current || !directionsRendererRef.current || !mapInstance.current) {
          return [];
        }

        return new Promise((resolve, reject) => {
          directionsServiceRef.current!.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRendererRef.current!.setDirections(result);

                // Get route path for hazard detection
                const routePath = result.routes[0]?.overview_path || [];
                const hazards: RouteHazard[] = [];

                // Check each report against the route
                reports.forEach((report) => {
                  const reportLatLng = new google.maps.LatLng(report.lat, report.lng);
                  let minDistance = Infinity;
                  let distanceAlongRoute = 0;
                  let cumulativeDistance = 0;

                  // Check distance from each point on the route path
                  for (let i = 0; i < routePath.length; i++) {
                    const pathPoint = routePath[i];
                    const distance = google.maps.geometry.spherical.computeDistanceBetween(
                      reportLatLng,
                      pathPoint
                    );

                    if (distance < minDistance) {
                      minDistance = distance;
                      distanceAlongRoute = cumulativeDistance;
                    }

                    // Calculate cumulative distance along route
                    if (i > 0) {
                      cumulativeDistance += google.maps.geometry.spherical.computeDistanceBetween(
                        routePath[i - 1],
                        pathPoint
                      );
                    }
                  }

                  // If report is within 500 meters of route, it's a hazard
                  if (minDistance <= 500) {
                    hazards.push({
                      report,
                      distanceFromStart: distanceAlongRoute,
                    });
                  }
                });

                // Sort hazards by distance along route
                hazards.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

                resolve(hazards);
              } else {
                console.error("Directions request failed:", status);
                reject(new Error(`Directions request failed: ${status}`));
              }
            }
          );
        });
      },

      clearRoute: () => {
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
