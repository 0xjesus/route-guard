"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther, parseEther, keccak256, encodePacked } from "viem";
import {
  MapPin,
  Shield,
  Coins,
  AlertCircle,
  Check,
  ExternalLink,
  Car,
  Construction,
  Megaphone,
  AlertTriangle,
  Clock,
  Camera,
  X,
  Upload,
  Loader2,
  Image as ImageIcon,
  Search,
  Crosshair,
} from "lucide-react";
import Image from "next/image";
import { BottomSheet, Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSubmitReport, useReporterIdentity } from "@/hooks/useRoadGuard";
import { EVENT_TYPES, EventType } from "@/components/map/GoogleMap";
import { cn } from "@/utils/cn";

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: { lat: number; lng: number } | null;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onSuccess?: () => void;
}

const EVENT_ICONS = {
  ACCIDENT: Car,
  ROAD_CLOSURE: Construction,
  PROTEST: Megaphone,
  POLICE_ACTIVITY: Shield,
  HAZARD: AlertTriangle,
  TRAFFIC_JAM: Clock,
};

const MIN_STAKE = "0.001";

export default function ReportSheet({
  isOpen,
  onClose,
  selectedLocation,
  onLocationChange,
  onSuccess,
}: ReportSheetProps) {
  const { isConnected } = useAccount();
  const { identity, createIdentity, loadIdentity } = useReporterIdentity();
  const { submitReport, isPending, isConfirming, isSuccess, error, hash } = useSubmitReport();

  const [step, setStep] = useState<"type" | "details" | "privacy" | "stake" | "success">("type");
  const [eventType, setEventType] = useState<EventType>("ACCIDENT");
  const [description, setDescription] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [stakeAmount, setStakeAmount] = useState(MIN_STAKE);
  const [isMobile, setIsMobile] = useState(false);

  // Location search state
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  // Photo upload state
  const [photos, setPhotos] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo upload handler
  const uploadPhoto = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    // Create preview
    const preview = URL.createObjectURL(file);
    const photoEntry = { file, preview };
    setPhotos(prev => [...prev, photoEntry]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Update with uploaded URL
      setPhotos(prev =>
        prev.map(p => p.preview === preview ? { ...p, url: data.url } : p)
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      // Remove failed upload
      setPhotos(prev => prev.filter(p => p.preview !== preview));
      URL.revokeObjectURL(preview);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).slice(0, 3 - photos.length).forEach(file => {
      if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        uploadPhoto(file);
      } else {
        setUploadError("Only images up to 5MB are allowed");
      }
    });
  }, [photos.length, uploadPhoto]);

  const removePhoto = useCallback((preview: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.preview === preview);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.preview !== preview);
    });
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Load identity on mount
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  // Check screen size on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setStep("success");
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  // Track if geocoder is ready
  const [geocoderReady, setGeocoderReady] = useState(false);

  // Initialize Google Places services
  useEffect(() => {
    const initServices = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
        // PlacesService needs a DOM element
        const div = document.createElement("div");
        placesService.current = new google.maps.places.PlacesService(div);
        setGeocoderReady(true);
      } else {
        setTimeout(initServices, 500);
      }
    };
    initServices();
  }, []);

  // Reverse geocode when selectedLocation changes (from map click)
  useEffect(() => {
    if (selectedLocation && !locationSearch && geocoderReady && geocoder.current) {
      geocoder.current.geocode(
        { location: { lat: selectedLocation.lat, lng: selectedLocation.lng } },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            setLocationSearch(results[0].formatted_address);
          }
        }
      );
    }
  }, [selectedLocation, locationSearch, geocoderReady]);

  // Search locations
  const searchLocations = useCallback((query: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearchingLocation(true);
    searchDebounce.current = setTimeout(() => {
      if (autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          { input: query, types: ["geocode", "establishment"] },
          (results, status) => {
            setIsSearchingLocation(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setLocationSuggestions(results);
            } else {
              setLocationSuggestions([]);
            }
          }
        );
      }
    }, 300);
  }, []);

  // Select a location from suggestions
  const selectLocation = useCallback((placeId: string, description: string) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId, fields: ["geometry"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onLocationChange?.({ lat, lng });
          setLocationSearch(description);
          setLocationSuggestions([]);
          setShowLocationSearch(false);
        }
      }
    );
  }, [onLocationChange]);

  // Use current location
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange?.({ lat, lng });

        // Reverse geocode to get address
        if (geocoder.current) {
          geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
            setIsGettingLocation(false);
            if (status === "OK" && results?.[0]) {
              setLocationSearch(results[0].formatted_address);
            }
          });
        } else {
          setIsGettingLocation(false);
        }
        setShowLocationSearch(false);
      },
      (error) => {
        setIsGettingLocation(false);
        console.error("Geolocation error:", error);
        alert("Could not get your location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange]);

  // Reset on close
  const handleClose = () => {
    setStep("type");
    setEventType("ACCIDENT");
    setDescription("");
    setPassphrase("");
    setStakeAmount(MIN_STAKE);
    // Clean up photo previews
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setUploadError(null);
    // Reset location search
    setLocationSearch("");
    setLocationSuggestions([]);
    setShowLocationSearch(false);
    onClose();
  };

  const handleCreateIdentity = () => {
    if (passphrase.length < 8) return;
    createIdentity(passphrase);
    setStep("stake");
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !identity) return;

    try {
      await submitReport({
        commitment: identity.commitment,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        eventType: EVENT_TYPES[eventType].id as 0 | 1 | 2 | 3 | 4 | 5,
        stakeAmount: parseEther(stakeAmount),
      });
    } catch (e) {
      console.error("Submit error:", e);
    }
  };

  // Use different components based on screen size
  const SheetComponent = isMobile ? BottomSheet : Modal;

  const config = EVENT_TYPES[eventType];
  const Icon = EVENT_ICONS[eventType];

  return (
    <SheetComponent
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "success" ? "Report Submitted!" : "Report Incident"}
      size="md"
    >
      {/* Step 1: Select Event Type */}
      {step === "type" && (
        <div className="space-y-6">
          {/* Location Search Section */}
          <div className="space-y-3">
            <h3 className="text-label-lg font-medium text-mantle-text-secondary">
              Where is it happening?
            </h3>

            {/* Search Input */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mantle-text-tertiary" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      searchLocations(e.target.value);
                      setShowLocationSearch(true);
                    }}
                    onFocus={() => locationSuggestions.length > 0 && setShowLocationSearch(true)}
                    placeholder="Search address or place..."
                    className="w-full bg-mantle-bg-tertiary rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-mantle-text-tertiary border border-white/10 focus:border-mantle-accent focus:outline-none"
                  />
                  {isSearchingLocation && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mantle-accent animate-spin" />
                  )}
                </div>

                {/* My Location Button */}
                <button
                  onClick={useMyLocation}
                  disabled={isGettingLocation}
                  className="w-12 h-12 rounded-xl bg-mantle-accent/20 border border-mantle-accent/30 flex items-center justify-center hover:bg-mantle-accent/30 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Use my location"
                >
                  {isGettingLocation ? (
                    <Loader2 className="w-5 h-5 text-mantle-accent animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5 text-mantle-accent" />
                  )}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showLocationSearch && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-mantle-bg-primary rounded-xl border border-white/20 shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => selectLocation(suggestion.place_id, suggestion.description)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-mantle-accent/20 transition-colors text-left border-b border-white/5 last:border-b-0"
                    >
                      <MapPin className="w-5 h-5 text-mantle-accent mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {suggestion.structured_formatting.main_text}
                        </div>
                        <div className="text-xs text-mantle-text-tertiary truncate">
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="flex items-center gap-3 p-3 bg-mantle-success/10 border border-mantle-success/30 rounded-xl">
                <Check className="w-5 h-5 text-mantle-success flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-mantle-success">Location Selected</p>
                  <p className="text-xs text-mantle-text-tertiary font-mono truncate">
                    {locationSearch || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
                  </p>
                </div>
              </div>
            )}

            {!selectedLocation && (
              <p className="text-xs text-mantle-text-tertiary text-center">
                Search for a location above, use your current location, or tap on the map
              </p>
            )}
          </div>

          {/* Event Type Grid */}
          <div>
            <h3 className="text-label-lg font-medium text-mantle-text-secondary mb-3">
              What&apos;s happening?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(EVENT_TYPES).map(([key, cfg]) => {
                const EventIcon = EVENT_ICONS[key as EventType];
                const isSelected = eventType === key;

                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEventType(key as EventType)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      isSelected
                        ? "bg-white/10 border-current"
                        : "bg-mantle-bg-secondary border-transparent hover:bg-mantle-bg-tertiary"
                    )}
                    style={{ color: isSelected ? cfg.color : undefined }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${cfg.color}20` }}
                    >
                      <EventIcon className="w-6 h-6" style={{ color: cfg.color }} />
                    </div>
                    <span
                      className={cn(
                        "text-body-sm font-medium",
                        isSelected ? "text-current" : "text-mantle-text-secondary"
                      )}
                    >
                      {cfg.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => setStep("details")}
            disabled={!selectedLocation}
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Details - Description & Photos */}
      {step === "details" && (
        <div className="space-y-6">
          {/* Description */}
          <div>
            <label className="text-label-lg font-medium text-mantle-text-secondary mb-2 block">
              What&apos;s happening? <span className="text-mantle-text-tertiary">(describe the situation)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Major accident on the highway, 3 cars involved. Traffic backed up for 2 miles..."
              rows={3}
              maxLength={280}
              className="w-full bg-mantle-bg-tertiary border border-white/10 rounded-xl px-4 py-3 text-mantle-text-primary placeholder:text-mantle-text-tertiary focus:outline-none focus:border-mantle-accent resize-none"
            />
            <p className="text-right text-label-sm text-mantle-text-tertiary mt-1">
              {description.length}/280
            </p>
          </div>

          {/* Photo Upload Section */}
          <div>
            <h3 className="text-label-lg font-medium text-mantle-text-secondary mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Add Photos <span className="text-mantle-text-tertiary">(optional)</span>
            </h3>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => photos.length < 3 && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-mantle-accent bg-mantle-accent/10"
                  : "border-white/20 hover:border-mantle-accent/50 hover:bg-white/5",
                photos.length >= 3 && "opacity-50 cursor-not-allowed"
              )}
            >
              {photos.length === 0 ? (
                <div className="py-4">
                  <Upload className="w-8 h-8 text-mantle-text-tertiary mx-auto mb-2" />
                  <p className="text-body-sm text-mantle-text-secondary">
                    Drop photos here or <span className="text-mantle-accent">browse</span>
                  </p>
                  <p className="text-label-sm text-mantle-text-tertiary mt-1">
                    Up to 3 photos, max 5MB each
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap justify-center">
                  {photos.map((photo, idx) => (
                    <div key={photo.preview} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`Upload ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      {!photo.url && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      {photo.url && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(photo.preview);
                            }}
                            className="p-1.5 bg-red-500 rounded-full"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )}
                      {photo.url && (
                        <div className="absolute bottom-1 right-1">
                          <Check className="w-4 h-4 text-green-400 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-mantle-text-tertiary" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload error */}
            {uploadError && (
              <p className="text-label-sm text-mantle-error mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {uploadError}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("type")} className="flex-1">
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(identity ? "stake" : "privacy")}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Privacy Setup */}
      {step === "privacy" && (
        <div className="space-y-6">
          <div className="text-center p-6 bg-mantle-accent/10 rounded-2xl border border-mantle-accent/30">
            <Shield className="w-12 h-12 text-mantle-accent mx-auto mb-4" />
            <h3 className="text-headline-sm font-semibold text-mantle-text-primary mb-2">
              Privacy Shield
            </h3>
            <p className="text-body-sm text-mantle-text-secondary">
              Create a secret passphrase to protect your identity. Your wallet address is never
              stored on-chain.
            </p>
          </div>

          <Input
            type="password"
            label="Secret Passphrase"
            placeholder="Enter at least 8 characters"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            hint="You'll need this to claim rewards. Keep it safe!"
            error={passphrase.length > 0 && passphrase.length < 8 ? "Minimum 8 characters" : undefined}
          />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("details")} className="flex-1">
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateIdentity}
              disabled={passphrase.length < 8}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Stake Amount */}
      {step === "stake" && (
        <div className="space-y-6">
          {/* Report Summary */}
          <div className="p-4 bg-mantle-bg-secondary rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <p className="text-body-sm font-medium text-mantle-text-primary">{config.label}</p>
                <p className="text-label-md text-mantle-text-tertiary">
                  {selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)}
                </p>
              </div>
            </div>
            {identity && (
              <div className="flex items-center gap-2 text-label-md text-mantle-success">
                <Check className="w-4 h-4" />
                Privacy Shield Active
              </div>
            )}
          </div>

          {/* Stake Input */}
          <div>
            <Input
              type="number"
              label="Stake Amount"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min={MIN_STAKE}
              step="0.001"
              rightIcon={<span className="text-mantle-text-tertiary">MNT</span>}
              hint={`Minimum: ${MIN_STAKE} MNT. Returned when confirmed.`}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-mantle-info/10 rounded-xl border border-mantle-info/30 flex gap-3">
            <Coins className="w-5 h-5 text-mantle-info flex-shrink-0 mt-0.5" />
            <div className="text-body-sm text-mantle-text-secondary">
              <p className="font-medium text-mantle-info mb-1">How staking works</p>
              <p>
                Your stake is returned when 3+ users confirm your report. Higher stakes show
                confidence and may earn more tips from grateful users.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-mantle-error/10 rounded-xl border border-mantle-error/30 flex gap-3 overflow-hidden">
              <AlertCircle className="w-5 h-5 text-mantle-error flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-mantle-error font-medium">
                  {error.message?.split('.')[0] || "Transaction failed"}
                </p>
                <details className="mt-1">
                  <summary className="text-xs text-mantle-error/70 cursor-pointer hover:text-mantle-error">
                    Show details
                  </summary>
                  <p className="text-xs text-mantle-error/60 mt-2 break-all max-h-24 overflow-y-auto">
                    {error.message}
                  </p>
                </details>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("details")} className="flex-1">
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isPending || isConfirming}
              className="flex-1"
            >
              {isPending ? "Confirm in Wallet" : isConfirming ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {step === "success" && (
        <div className="space-y-6 text-center">
          <div className="w-32 h-32 mx-auto relative">
            <Image
              src="/images/tx-confirmed.png"
              alt="Transaction Confirmed"
              fill
              className="object-contain"
            />
          </div>

          <div>
            <h3 className="text-headline-md font-semibold text-mantle-text-primary mb-2">
              Report Submitted!
            </h3>
            <p className="text-body-sm text-mantle-text-secondary">
              Your report is now live on the blockchain. You&apos;ll receive your stake back when the
              community confirms it.
            </p>
          </div>

          {hash && (
            <a
              href={`https://mantlescan.xyz/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-mantle-accent hover:underline"
            >
              View on Mantlescan
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Warning */}
          <div className="p-4 bg-mantle-warning/10 rounded-xl border border-mantle-warning/30 text-left">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-mantle-warning flex-shrink-0" />
              <div className="text-body-sm text-mantle-text-secondary">
                <p className="font-medium text-mantle-warning mb-1">Save your passphrase!</p>
                <p>
                  You&apos;ll need your passphrase to claim rewards. Without it, your rewards are lost
                  forever.
                </p>
              </div>
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </SheetComponent>
  );
}
