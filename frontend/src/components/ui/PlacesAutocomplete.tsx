"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Crosshair } from "lucide-react";
import { createPortal } from "react-dom";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showMyLocation?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Search location...",
  className = "",
  showMyLocation = false,
}: PlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    const initService = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
      } else {
        setTimeout(initService, 500);
      }
    };
    initService();
  }, []);

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, predictions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch predictions with debounce
  const fetchPredictions = useCallback((input: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!input || input.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceTimer.current = setTimeout(() => {
      if (autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          {
            input,
            types: ["geocode", "establishment"],
          },
          (results, status) => {
            setIsLoading(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(results as Prediction[]);
              setIsOpen(true);
            } else {
              setPredictions([]);
            }
          }
        );
      }
    }, 300);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    fetchPredictions(newValue);
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Get current location
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        if (geocoder.current) {
          geocoder.current.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setIsLocating(false);
              if (status === "OK" && results && results[0]) {
                onChange(results[0].formatted_address);
              } else {
                onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
            }
          );
        } else {
          setIsLocating(false);
          onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      },
      (error) => {
        setIsLocating(false);
        console.error("Geolocation error:", error);
        alert("Could not get your location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Dropdown portal
  const dropdown = isOpen && predictions.length > 0 && typeof window !== "undefined" && createPortal(
    <div
      className="fixed bg-mantle-bg-primary rounded-xl border border-white/20 shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999,
      }}
    >
      {predictions.map((prediction) => (
        <button
          key={prediction.place_id}
          onClick={() => handleSelectPrediction(prediction)}
          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-mantle-accent/20 transition-colors text-left border-b border-white/5 last:border-b-0"
        >
          <MapPin className="w-5 h-5 text-mantle-accent mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              {prediction.structured_formatting.main_text}
            </div>
            <div className="text-xs text-mantle-text-secondary">
              {prediction.structured_formatting.secondary_text}
            </div>
          </div>
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={containerRef} className="relative flex-1 flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={`flex-1 bg-mantle-bg-tertiary rounded-lg px-3 py-2 text-sm text-white placeholder:text-mantle-text-tertiary border border-white/10 focus:border-mantle-accent focus:outline-none ${className}`}
      />

      {/* My Location Button */}
      {showMyLocation && (
        <button
          onClick={handleGetMyLocation}
          disabled={isLocating}
          className="w-9 h-9 rounded-lg bg-mantle-accent/20 border border-mantle-accent/30 flex items-center justify-center hover:bg-mantle-accent/30 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Use my location"
        >
          {isLocating ? (
            <div className="w-4 h-4 border-2 border-mantle-accent/30 border-t-mantle-accent rounded-full animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4 text-mantle-accent" />
          )}
        </button>
      )}

      {dropdown}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-mantle-accent/30 border-t-mantle-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
