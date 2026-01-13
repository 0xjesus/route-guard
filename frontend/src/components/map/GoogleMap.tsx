"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";

// Mantle-branded dark map style
const MANTLE_MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0A0B0D" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0A0B0D" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#A1A7B4" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#12141A" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4A9994" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#222632" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#222632" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#A1A7B4" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#181B23" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#65B3AE" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#12141A" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4A9994" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0A0B0D" }],
  },
];

// Event type configurations
export const EVENT_TYPES = {
  ACCIDENT: { id: 0, label: "Accident", color: "#EF4444", icon: "🚗", image: "/images/accident.png" },
  ROAD_CLOSURE: { id: 1, label: "Road Closure", color: "#F97316", icon: "🚧", image: "/images/road-closure.png" },
  PROTEST: { id: 2, label: "Protest", color: "#A855F7", icon: "📢", image: null },
  POLICE_ACTIVITY: { id: 3, label: "Police Activity", color: "#3B82F6", icon: "👮", image: null },
  HAZARD: { id: 4, label: "Hazard", color: "#EAB308", icon: "⚠️", image: "/images/hazard.png" },
  TRAFFIC_JAM: { id: 5, label: "Traffic Jam", color: "#6B7280", icon: "🚦", image: null },
} as const;

export type EventType = keyof typeof EVENT_TYPES;

export interface ReportMarker {
  id: number;
  lat: number;
  lng: number;
  eventType: EventType;
  confirmationCount: number;
  totalRegards: string;
  stakeAmount?: number;
  commitment?: string;
  txHash?: string | null;
  timestamp: number;
  expiresAt: number;
}

interface GoogleMapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  reports?: ReportMarker[];
  onReportClick?: (report: ReportMarker) => void;
  className?: string;
}

// Create custom marker element
function createMarkerElement(eventType: EventType, confirmationCount: number, totalRegards: string): HTMLElement {
  const config = EVENT_TYPES[eventType];
  const isConfirmed = confirmationCount >= 3;

  const el = document.createElement("div");
  el.style.cssText = "cursor: pointer; pointer-events: auto;";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: relative;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;

  const marker = document.createElement("div");

  // Use image markers for types that have custom images
  if (config.image) {
    marker.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${config.color}20, ${config.color}40);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 24px ${config.color}50;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      backdrop-filter: blur(8px);
      ${isConfirmed ? `border: 3px solid #10B981;` : `border: 2px solid ${config.color}80;`}
    `;
    marker.innerHTML = `<img src="${config.image}" alt="${config.label}" style="width: 32px; height: 32px; object-fit: contain;" />`;
  } else {
    marker.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${config.color};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${config.color}40;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      ${isConfirmed ? `border: 3px solid #10B981;` : `border: 2px solid rgba(255,255,255,0.3);`}
    `;
    marker.innerHTML = `<span style="font-size: 18px;">${config.icon}</span>`;
  }

  // Hover effects
  marker.onmouseenter = () => {
    marker.style.transform = "scale(1.15)";
    marker.style.boxShadow = `0 6px 20px rgba(0,0,0,0.5), 0 0 30px ${config.color}60`;
  };
  marker.onmouseleave = () => {
    marker.style.transform = "scale(1)";
    marker.style.boxShadow = `0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${config.color}40`;
  };

  wrapper.appendChild(marker);

  // Verified badge
  if (isConfirmed) {
    const badge = document.createElement("div");
    badge.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      background: #10B981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #0A0B0D;
    `;
    badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 20 20" fill="white"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>`;
    wrapper.appendChild(badge);
  }

  // Rewards indicator
  if (parseFloat(totalRegards) > 0) {
    const rewards = document.createElement("div");
    rewards.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #65B3AE;
      color: #0A0B0D;
      font-size: 9px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 8px;
      white-space: nowrap;
    `;
    rewards.textContent = `${totalRegards} MNT`;
    wrapper.appendChild(rewards);
  }

  el.appendChild(wrapper);
  return el;
}

// Create selected location marker
function createSelectedMarker(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="relative">
      <div class="w-6 h-6 bg-[#65B3AE] rounded-full animate-ping absolute"></div>
      <div class="w-6 h-6 bg-[#65B3AE] rounded-full relative flex items-center justify-center">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  `;
  return el;
}

export default function GoogleMap({
  onLocationSelect,
  selectedLocation,
  reports = [],
  onReportClick,
  className = "",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const selectedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["marker"],
      });

      try {
        const { Map } = await loader.importLibrary("maps");
        await loader.importLibrary("marker");

        if (!mapRef.current) return;

        // Get user location
        let center = { lat: 40.7128, lng: -74.006 }; // NYC default
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
              });
            });
            center = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          } catch {
            console.log("Geolocation not available, using default");
          }
        }

        const mapInstance = new Map(mapRef.current, {
          center,
          zoom: 14,
          styles: MANTLE_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          mapId: "roadguard-map",
          gestureHandling: "greedy",
          clickableIcons: false,
        });

        // Click handler for location selection
        mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng && onLocationSelect) {
            onLocationSelect(e.latLng.lat(), e.latLng.lng());
          }
        });

        setMap(mapInstance);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, [onLocationSelect]);

  // Handle report markers
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear old markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    // Add new markers
    reports.forEach((report) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: report.lat, lng: report.lng },
        content: createMarkerElement(report.eventType, report.confirmationCount, report.totalRegards),
      });

      marker.addListener("click", () => {
        if (onReportClick) {
          onReportClick(report);
        }
      });

      markersRef.current.set(report.id, marker);
    });
  }, [map, isLoaded, reports, onReportClick]);

  // Handle selected location marker
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove old selected marker
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.map = null;
      selectedMarkerRef.current = null;
    }

    // Add new selected marker
    if (selectedLocation) {
      selectedMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: selectedLocation,
        content: createSelectedMarker(),
      });

      // Pan to selected location
      map.panTo(selectedLocation);
    }
  }, [map, isLoaded, selectedLocation]);

  return (
    <div className={`map-container ${className}`}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-mantle-bg-primary flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner w-8 h-8" />
            <p className="text-mantle-text-secondary text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Mantle Branding */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-mantle-bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-mantle-accent/20 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-mantle-accent to-mantle-accent-dark flex items-center justify-center">
              <span className="text-xs font-bold text-mantle-black">M</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-mantle-text-primary">Mantle L2</p>
              <p className="text-[10px] text-mantle-accent">Live Network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-mantle-bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-white/10 shadow-lg">
          <div className="flex flex-wrap gap-2">
            {Object.entries(EVENT_TYPES).map(([key, config]) => (
              <div
                key={key}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors cursor-default"
                title={config.label}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}60` }}
                />
                <span className="text-[10px] text-mantle-text-secondary hidden sm:inline">{config.label}</span>
                <span className="text-xs sm:hidden">{config.icon}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions hint */}
      <div className="absolute top-4 right-4 z-10 hidden sm:block">
        <div className="bg-mantle-bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 shadow-lg">
          <p className="text-[10px] text-mantle-text-tertiary">
            <span className="text-mantle-accent">Click map</span> to report • <span className="text-mantle-accent">Click marker</span> for details
          </p>
        </div>
      </div>
    </div>
  );
}
