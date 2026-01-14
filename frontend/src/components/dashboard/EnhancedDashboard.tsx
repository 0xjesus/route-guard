"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useBalance, useDisconnect, useConnect } from "wagmi";
import { formatEther } from "viem";
import {
  MapPin,
  List,
  Plus,
  Bell,
  Clock,
  CheckCircle2,
  TrendingUp,
  Coins,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Car,
  Construction,
  Megaphone,
  AlertTriangle,
  Flame,
  Navigation,
  Layers,
  Maximize2,
  Map as MapIcon,
  Compass,
  Shield,
  LogOut,
  Copy,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Route,
  MapPinned,
  Wallet,
  Smartphone,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { EVENT_TYPES, EventType, ReportMarker } from "@/components/map/GoogleMap";
import type { MapController, RouteHazard, RouteResult, RouteInfo } from "@/components/map/AdvancedMap";
import ReportSheet from "@/components/layout/ReportSheet";
import PlacesAutocomplete from "@/components/ui/PlacesAutocomplete";
import { useReportCount, useConfirmReport, useSendRegards } from "@/hooks/useRoadGuard";
import { parseEther } from "viem";

// Dynamic import for map
const AdvancedMap = dynamic(() => import("@/components/map/AdvancedMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-mantle-bg-primary flex items-center justify-center">
      <div className="spinner w-8 h-8" />
    </div>
  ),
});

interface EnhancedDashboardProps {
  onBack: () => void;
}

type ViewMode = "split" | "map" | "feed";

const EVENT_ICONS: Record<EventType, any> = {
  ACCIDENT: Car,
  ROAD_CLOSURE: Construction,
  PROTEST: Megaphone,
  POLICE_ACTIVITY: Shield,
  HAZARD: AlertTriangle,
  TRAFFIC_JAM: Clock,
};

// Event type ID to key mapping
const EVENT_TYPE_MAP: Record<number, EventType> = {
  0: "ACCIDENT",
  1: "ROAD_CLOSURE",
  2: "PROTEST",
  3: "POLICE_ACTIVITY",
  4: "HAZARD",
  5: "TRAFFIC_JAM",
};

// Cities for exploration
const CITIES = [
  { name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
];

export default function EnhancedDashboard({ onBack }: EnhancedDashboardProps) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { data: reportCount } = useReportCount();
  const { confirmReport, isPending: isConfirmPending, isSuccess: isConfirmSuccess } = useConfirmReport();
  const { sendRegards, isPending: isTipPending, isSuccess: isTipSuccess } = useSendRegards();
  const mapRef = useRef<MapController>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [filterType, setFilterType] = useState<EventType | "ALL">("ALL");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [hoveredReport, setHoveredReport] = useState<number | null>(null);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 });
  const [tipAmount, setTipAmount] = useState("0.01");
  const [showTipInput, setShowTipInput] = useState(false);

  // Mobile bottom sheet state
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);

  // Route planning state
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [selectedRouteIndices, setSelectedRouteIndices] = useState<Set<number>>(new Set([0]));
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Connect wallet modal state
  const [showConnectWalletModal, setShowConnectWalletModal] = useState(false);

  // Mobile detection
  const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasInjectedProvider = typeof window !== "undefined" && !!(window as any).ethereum;

  // Open MetaMask deep link
  const openInMetaMask = useCallback(() => {
    const currentUrl = window.location.href;
    const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, "")}`;
    window.location.href = metamaskDeepLink;
  }, []);

  // Fetch reports from API
  const fetchReports = useCallback(async (lat: number, lng: number) => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/reports?lat=${lat}&lng=${lng}&radius=500`);
      const data = await res.json();

      if (data.reports && data.reports.length > 0) {
        // Transform API response to ReportMarker format
        const transformedReports: ReportMarker[] = data.reports
          .map((r: any) => ({
            id: r.id,
            lat: r.lat,
            lng: r.lng,
            eventType: EVENT_TYPE_MAP[r.eventType] || "ACCIDENT",
            confirmationCount: r.confirmationCount || 0,
            totalRegards: r.totalRegards || "0",
            stakeAmount: r.stakeAmount || 0,
            commitment: r.commitment,
            txHash: r.txHash,
            timestamp: r.timestamp ? r.timestamp * 1000 : Date.now(),
            expiresAt: r.expiresAt || 0,
          })); // Show all reports from chain (no client-side expiration filter)
        setReports(transformedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  // Get user location and fetch reports on mount
  useEffect(() => {
    // Fetch Mexico region first to show existing on-chain reports
    fetchReports(19.4326, -99.1332); // Mexico City

    // Then try to get user location for the "My Location" button
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          // Keep NYC as default
        }
      );
    }
  }, [fetchReports]);

  // Refresh reports after confirm/tip success
  useEffect(() => {
    if (isConfirmSuccess || isTipSuccess) {
      fetchReports(userLocation.lat, userLocation.lng);
      setShowTipInput(false);
    }
  }, [isConfirmSuccess, isTipSuccess, fetchReports, userLocation]);

  // Handle confirm report
  const handleConfirmReport = useCallback(() => {
    if (selectedReport) {
      confirmReport(BigInt(selectedReport.id));
    }
  }, [selectedReport, confirmReport]);

  // Handle send tip
  const handleSendTip = useCallback(() => {
    if (selectedReport && tipAmount) {
      sendRegards(BigInt(selectedReport.id), parseEther(tipAmount));
    }
  }, [selectedReport, tipAmount, sendRegards]);

  // Copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setShowWalletMenu(false);
    onBack();
  };

  const filteredReports = reports.filter((report) => {
    if (filterType !== "ALL" && report.eventType !== filterType) return false;
    return true;
  });

  // Handle report selection with map sync
  const handleReportSelect = useCallback((report: ReportMarker) => {
    setSelectedReport(report);
    setShowReportDetail(true);

    // Fly to location on map
    mapRef.current?.focusOnReport(report);
  }, []);

  // Handle report hover - subtle map feedback
  const handleReportHover = useCallback((reportId: number | null) => {
    setHoveredReport(reportId);
    if (reportId) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        // Subtle pan without zoom
        mapRef.current?.flyTo(report.lat, report.lng, 14);
      }
    }
  }, [reports]);

  // Handle city exploration
  const handleCitySelect = useCallback((city: typeof CITIES[0]) => {
    mapRef.current?.flyTo(city.lat, city.lng, 12);
    setUserLocation({ lat: city.lat, lng: city.lng });
    fetchReports(city.lat, city.lng);
  }, [fetchReports]);

  // Handle route calculation
  const handleCalculateRoute = useCallback(async () => {
    if (!routeOrigin || !routeDestination) {
      setRouteError("Please enter both origin and destination");
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const result = await mapRef.current?.calculateRoute(routeOrigin, routeDestination);
      if (result) {
        setRouteResult(result);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setRouteError("Failed to calculate route. Please check your addresses and try again.");
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [routeOrigin, routeDestination]);

  // Handle clear route
  const handleClearRoute = useCallback(() => {
    mapRef.current?.clearRoute();
    setRouteResult(null);
    setSelectedRouteIndices(new Set([0]));
    setRouteOrigin("");
    setRouteDestination("");
    setRouteError(null);
  }, []);

  // Handle route selection - toggles selection for multi-compare
  const handleToggleRoute = useCallback((index: number) => {
    setSelectedRouteIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        // Don't allow deselecting if it's the only one
        if (newSet.size > 1) {
          newSet.delete(index);
        }
      } else {
        newSet.add(index);
      }
      mapRef.current?.selectRoutes(Array.from(newSet));
      return newSet;
    });
  }, []);

  // Select a single route (for navigation)
  const handleSelectRoute = useCallback((index: number) => {
    setSelectedRouteIndices(new Set([index]));
    mapRef.current?.selectRoutes([index]);
  }, []);

  // Open Google Maps navigation for a specific route
  const handleStartNavigation = useCallback((route?: RouteInfo) => {
    if (!routeResult) return;

    // Use first selected route if no specific route provided
    const firstSelectedIndex = Array.from(selectedRouteIndices)[0] || 0;
    const selectedRoute = route || routeResult.routes[firstSelectedIndex];
    if (!selectedRoute) return;

    // Build Google Maps URL with waypoints for specific route
    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${selectedRoute.startLat},${selectedRoute.startLng}`;
    url += `&destination=${selectedRoute.endLat},${selectedRoute.endLng}`;

    // Add waypoints to force specific route
    if (selectedRoute.waypoints.length > 0) {
      const waypointsStr = selectedRoute.waypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join("|");
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }

    url += `&travelmode=driving`;
    window.open(url, "_blank");
  }, [routeResult, selectedRouteIndices]);

  // Format distance in km
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="h-screen flex flex-col bg-mantle-bg-primary overflow-hidden">
      {/* Header - Minimal on mobile, full on desktop */}
      <header className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 bg-mantle-bg-primary/95 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-mantle-bg-elevated flex items-center justify-center active:bg-mantle-bg-tertiary touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 text-mantle-text-secondary" />
            </button>
            <Image
              src="/images/logo.png"
              alt="RoadGuard Logo"
              width={36}
              height={36}
              className="w-7 h-7 sm:w-9 sm:h-9"
            />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-white">RoadGuard</h1>
              <p className="text-xs text-mantle-text-tertiary">Dashboard</p>
            </div>
          </div>

          {/* Center: View Mode Toggle - Desktop only */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-mantle-bg-elevated rounded-xl flex-shrink-0">
            <button
              onClick={() => setViewMode("feed")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "feed" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary hover:bg-white/10"
              }`}
              title="Feed View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "split" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary hover:bg-white/10"
              }`}
              title="Split View"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "map" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary hover:bg-white/10"
              }`}
              title="Map View"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile: Simple title */}
          <div className="sm:hidden flex-1 text-center">
            <span className="text-sm font-semibold text-white">RoadGuard</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Plan Route Button - Desktop only */}
            <button
              onClick={() => {
                setShowRoutePlanner(true);
                if (viewMode === "feed") setViewMode("split");
              }}
              className="hidden sm:flex px-4 py-2 rounded-xl bg-gradient-to-r from-mantle-accent to-teal-400 text-black font-bold text-sm items-center gap-2 hover:scale-105 transition-transform shadow-lg"
            >
              <Route className="w-4 h-4" />
              <span>Plan Route</span>
            </button>

            {/* Refresh Button - Desktop only */}
            <button
              onClick={() => fetchReports(userLocation.lat, userLocation.lng)}
              disabled={isLoadingReports}
              className="hidden sm:flex w-9 h-9 rounded-xl bg-mantle-bg-elevated items-center justify-center hover:bg-mantle-bg-tertiary disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-mantle-text-secondary ${isLoadingReports ? 'animate-spin' : ''}`} />
            </button>

            {/* Wallet Menu / Connect Button */}
            {isConnected && address ? (
              <div className="relative">
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="h-9 flex items-center justify-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-mantle-bg-elevated active:bg-mantle-bg-tertiary touch-manipulation"
                >
                  <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-mantle-success animate-pulse" />
                  <span className="text-xs sm:text-sm font-mono text-white">
                    {truncateAddress(address).slice(0, 6)}...
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-mantle-text-tertiary transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Wallet Dropdown - Full width on mobile */}
                <AnimatePresence>
                  {showWalletMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-2 sm:w-72 bg-mantle-bg-card rounded-2xl p-5 sm:p-4 shadow-lg border border-white/10 z-50"
                    >
                      <div className="space-y-4">
                        {/* Balance */}
                        <div className="text-center pb-3 border-b border-white/10">
                          <p className="text-xs text-mantle-text-tertiary mb-1">Balance</p>
                          <p className="text-2xl font-bold text-white">
                            {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : "0.00"}{" "}
                            <span className="text-sm text-mantle-text-secondary">MNT</span>
                          </p>
                        </div>

                        {/* Address */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-mantle-text-secondary font-mono">
                            {truncateAddress(address)}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={copyAddress}
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-mantle-text-tertiary hover:text-white"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={`https://mantlescan.xyz/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-mantle-text-tertiary hover:text-white"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                        {copied && (
                          <p className="text-xs text-mantle-success text-center">Address copied!</p>
                        )}

                        {/* Disconnect */}
                        <button
                          onClick={handleDisconnect}
                          className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Disconnect Wallet
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Connect Wallet Button - Shows when NOT connected */
              <button
                onClick={() => setShowConnectWalletModal(true)}
                className="h-9 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-mantle-accent to-teal-400 text-black font-bold text-xs sm:text-sm active:scale-95 transition-transform touch-manipulation"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close wallet menu */}
      {showWalletMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowWalletMenu(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">

        {/* === DESKTOP: Side Panel (unchanged) === */}
        <AnimatePresence mode="wait">
          {(viewMode === "feed" || viewMode === "split") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`hidden sm:flex flex-shrink-0 flex-col bg-mantle-bg-primary border-r border-white/5 overflow-hidden ${
                viewMode === "split" ? "w-[380px] lg:w-[420px]" : "w-full"
              }`}
            >
              {/* Stats Bar */}
              <div className="flex-shrink-0 p-4 border-b border-white/5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-mantle-bg-elevated">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-mantle-accent" />
                      <span className="text-lg font-bold text-white">{reports.length}</span>
                    </div>
                    <span className="text-xs text-mantle-text-tertiary">Active</span>
                  </div>
                  <div className="p-3 rounded-xl bg-mantle-bg-elevated">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-lg font-bold text-white">
                        {reports.filter((r) => r.confirmationCount >= 3).length}
                      </span>
                    </div>
                    <span className="text-xs text-mantle-text-tertiary">Verified</span>
                  </div>
                  <div className="p-3 rounded-xl bg-mantle-bg-elevated">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-lg font-bold text-white">
                        {reports.reduce((acc, r) => acc + r.confirmationCount, 0)}
                      </span>
                    </div>
                    <span className="text-xs text-mantle-text-tertiary">Confirms</span>
                  </div>
                </div>
              </div>

              {/* City Explorer */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-mantle-accent" />
                  <span className="text-xs font-medium text-mantle-text-secondary">Explore Cities</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
                  {CITIES.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleCitySelect(city)}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-mantle-bg-elevated border border-white/5 hover:border-mantle-accent/50 hover:bg-mantle-bg-tertiary transition-all"
                    >
                      <div className="text-sm font-medium text-white whitespace-nowrap">{city.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                  <button
                    onClick={() => setFilterType("ALL")}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterType === "ALL"
                        ? "bg-mantle-accent text-black"
                        : "bg-mantle-bg-elevated text-mantle-text-secondary hover:bg-white/10"
                    }`}
                  >
                    All ({reports.length})
                  </button>
                  {Object.entries(EVENT_TYPES).map(([key, config]) => {
                    const count = reports.filter((r) => r.eventType === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilterType(key as EventType)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                          filterType === key
                            ? "text-black"
                            : "bg-mantle-bg-elevated text-mantle-text-secondary hover:bg-white/10"
                        }`}
                        style={{ backgroundColor: filterType === key ? config.color : undefined }}
                      >
                        <span>{config.icon}</span>
                        {count}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reports List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingReports && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-mantle-accent animate-spin mb-4" />
                    <p className="text-sm text-mantle-text-secondary">Loading reports...</p>
                  </div>
                )}

                {!isLoadingReports && filteredReports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Image src="/images/no-reports.png" alt="No reports" width={200} height={200} className="w-48 h-48 opacity-80 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Reports Yet</h3>
                    <p className="text-sm text-mantle-text-secondary text-center max-w-xs">
                      Be the first to report an incident in this area.
                    </p>
                  </div>
                )}

                {!isLoadingReports && filteredReports.map((report, index) => {
                  const config = EVENT_TYPES[report.eventType];
                  const Icon = EVENT_ICONS[report.eventType];
                  const isHovered = hoveredReport === report.id;

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onMouseEnter={() => handleReportHover(report.id)}
                      onMouseLeave={() => handleReportHover(null)}
                      onClick={() => handleReportSelect(report)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isHovered ? "bg-mantle-bg-tertiary border-mantle-accent/50" : "bg-mantle-bg-elevated border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative" style={{ backgroundColor: `${config.color}20` }}>
                          <Icon className="w-6 h-6" style={{ color: config.color }} />
                          {report.confirmationCount >= 3 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white text-sm">{config.label}</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-mantle-accent/20 text-mantle-accent">#{report.id}</span>
                            </div>
                            <span className="text-xs text-mantle-text-tertiary">{formatTimeAgo(report.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{report.confirmationCount}</span>
                            <span className="text-mantle-accent flex items-center gap-1"><Coins className="w-3 h-3" />{report.stakeAmount?.toFixed(3) || "0"}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-mantle-text-tertiary" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Panel - Always visible on mobile, conditional on desktop */}
        <AnimatePresence mode="wait">
          {(viewMode === "map" || viewMode === "split" || true) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex-1 relative ${viewMode === "feed" ? "hidden sm:block" : ""}`}
            >
              <AdvancedMap
                ref={mapRef}
                reports={filteredReports}
                selectedReport={selectedReport}
                onReportSelect={handleReportSelect}
                onLocationSelect={(lat, lng) => {
                  setSelectedLocation({ lat, lng });
                  setShowReportSheet(true);
                }}
                showHeatmap={showHeatmap}
                className="w-full h-full"
              />

              {/* PROMINENT Route Planner Button - Top Center - DESKTOP only, or mobile when NO routes */}
              {!showRoutePlanner && !routeResult && (
                <motion.button
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  onClick={() => setShowRoutePlanner(true)}
                  className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 px-5 sm:px-6 py-3.5 sm:py-3 rounded-2xl bg-gradient-to-r from-mantle-accent via-teal-400 to-mantle-accent text-black font-bold flex items-center gap-2.5 sm:gap-3 shadow-glow-accent active:scale-95 sm:hover:scale-105 transition-transform z-20 animate-pulse-subtle touch-manipulation"
                >
                  <Route className="w-5 h-5" />
                  <span className="text-sm sm:text-base">Plan Your Route</span>
                  <div className="w-2 h-2 rounded-full bg-black/30 animate-ping" />
                </motion.button>
              )}
              {/* Desktop: Show Plan Route button even with routes (smaller, top right area) */}
              {!showRoutePlanner && routeResult && (
                <motion.button
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  onClick={() => setShowRoutePlanner(true)}
                  className="hidden sm:flex absolute top-4 left-4 px-4 py-2.5 rounded-xl bg-mantle-bg-elevated/90 backdrop-blur text-white font-medium text-sm items-center gap-2 shadow-lg hover:bg-mantle-bg-tertiary transition-all border border-white/10"
                >
                  <Route className="w-4 h-4" />
                  <span>Edit Route</span>
                </motion.button>
              )}

              {/* Map Action Buttons - Desktop only */}
              <div className="hidden sm:flex absolute bottom-24 right-4 flex-col gap-2">
                <button
                  onClick={() => setShowRoutePlanner(!showRoutePlanner)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                    showRoutePlanner
                      ? "bg-mantle-accent text-black"
                      : "bg-mantle-bg-elevated/95 backdrop-blur-sm text-mantle-text-secondary border border-white/10 hover:bg-mantle-bg-tertiary"
                  }`}
                  title="Route Planner"
                >
                  <Route className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                    showHeatmap
                      ? "bg-orange-500 text-white"
                      : "bg-mantle-bg-elevated/95 backdrop-blur-sm text-mantle-text-secondary border border-white/10 hover:bg-mantle-bg-tertiary"
                  }`}
                  title="Toggle Heatmap"
                >
                  <Flame className="w-5 h-5" />
                </button>
                <button
                  onClick={() => mapRef.current?.showAllReports()}
                  className="w-12 h-12 rounded-xl bg-mantle-bg-elevated/95 backdrop-blur-sm text-mantle-text-secondary border border-white/10 flex items-center justify-center shadow-lg hover:bg-mantle-bg-tertiary transition-all"
                  title="Show All Reports"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              {/* Route Planner Panel - Desktop only here */}
              <AnimatePresence>
                {showRoutePlanner && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="hidden sm:flex absolute top-4 left-4 bottom-4 w-[400px] lg:w-[440px] bg-mantle-bg-primary rounded-2xl border border-white/10 shadow-2xl z-30 flex-col overflow-hidden"
                  >
                    {/* Header - Larger touch targets for mobile */}
                    <div className="flex-shrink-0 px-5 py-4 sm:py-3 border-b border-white/10 bg-[#1a1d26] sm:rounded-t-2xl safe-area-top">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-mantle-accent flex items-center justify-center">
                            <Route className="w-6 h-6 sm:w-5 sm:h-5 text-black" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-xl sm:text-lg">Route Planner</h3>
                            <p className="text-sm sm:text-xs text-gray-400">Find the safest route</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowRoutePlanner(false)}
                          className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 touch-manipulation"
                        >
                          <X className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Form - Better mobile spacing */}
                    <div className="flex-shrink-0 px-5 py-5 sm:p-4 bg-[#15171e] border-b border-white/10">
                      <div className="space-y-4 sm:space-y-3 mb-5 sm:mb-4">
                        {/* Origin Input */}
                        <div className="flex items-center gap-4 sm:gap-3">
                          <div className="w-4 h-4 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
                          <div className="flex-1">
                            <PlacesAutocomplete
                              value={routeOrigin}
                              onChange={setRouteOrigin}
                              placeholder="Where from?"
                              showMyLocation={true}
                            />
                          </div>
                        </div>
                        {/* Destination Input */}
                        <div className="flex items-center gap-4 sm:gap-3">
                          <div className="w-4 h-4 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0" />
                          <div className="flex-1">
                            <PlacesAutocomplete
                              value={routeDestination}
                              onChange={setRouteDestination}
                              placeholder="Where to?"
                            />
                          </div>
                        </div>
                      </div>

                      {routeError && (
                        <div className="mb-4 p-4 sm:p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-base sm:text-sm">
                          {routeError}
                        </div>
                      )}

                      {/* Action Buttons - Larger for mobile */}
                      <div className="flex gap-3 sm:gap-2">
                        <button
                          onClick={handleCalculateRoute}
                          disabled={isCalculatingRoute}
                          className="flex-1 py-4 sm:py-3 rounded-xl bg-mantle-accent text-black font-bold text-lg sm:text-base flex items-center justify-center gap-3 sm:gap-2 active:scale-[0.98] transition-transform touch-manipulation disabled:opacity-50"
                        >
                          {isCalculatingRoute ? (
                            <RefreshCw className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Navigation className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                          {isCalculatingRoute ? "Searching..." : "Find Routes"}
                        </button>
                        {(routeOrigin || routeDestination || routeResult) && (
                          <button
                            onClick={handleClearRoute}
                            className="px-5 sm:px-4 py-4 sm:py-3 rounded-xl bg-white/10 text-white font-semibold text-lg sm:text-base active:bg-white/20 touch-manipulation"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Results Area - Scrollable with momentum */}
                    <div className="flex-1 overflow-y-auto overscroll-contain bg-[#12141a] -webkit-overflow-scrolling-touch">
                      {/* Loading State */}
                      {isCalculatingRoute && (
                        <div className="p-10 sm:p-8 text-center">
                          <RefreshCw className="w-16 h-16 sm:w-12 sm:h-12 text-mantle-accent mx-auto mb-5 animate-spin" />
                          <p className="text-white font-semibold text-xl sm:text-base">Finding routes...</p>
                          <p className="text-base sm:text-sm text-gray-500 mt-2">Analyzing traffic & hazards</p>
                        </div>
                      )}

                      {/* Routes Found */}
                      {routeResult && routeResult.routes.length > 0 && !isCalculatingRoute && (
                        <div className="p-5 sm:p-4 pb-8 sm:pb-4">
                          {/* Summary Badge */}
                          <div className="mb-5 sm:mb-4 p-4 sm:p-3 bg-mantle-accent/20 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-white font-bold text-lg sm:text-base">{routeResult.routes.length} Routes</span>
                                {selectedRouteIndices.size > 1 && (
                                  <span className="px-2 py-1 bg-mantle-accent/30 rounded-lg text-sm sm:text-xs text-mantle-accent font-bold">
                                    {selectedRouteIndices.size} comparing
                                  </span>
                                )}
                              </div>
                              <span className="text-sm sm:text-xs text-gray-400">Tap to compare</span>
                            </div>
                          </div>

                          {/* Route Cards - Optimized for touch */}
                          <div className="space-y-4 sm:space-y-3">
                            {routeResult.routes.map((route, idx) => {
                              const isSelected = selectedRouteIndices.has(idx);
                              const isFastest = route.durationValue === Math.min(...routeResult.routes.map(r => r.durationValue));
                              const isShortest = route.distanceValue === Math.min(...routeResult.routes.map(r => r.distanceValue));
                              const isSafest = route.hazardCount === Math.min(...routeResult.routes.map(r => r.hazardCount));
                              const routeColors = ["#65B3AE", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981"];
                              const routeColor = routeColors[idx % routeColors.length];

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleToggleRoute(idx)}
                                  className="rounded-2xl sm:rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] touch-manipulation"
                                  style={{
                                    borderColor: isSelected ? routeColor : "transparent",
                                    backgroundColor: isSelected ? `${routeColor}12` : "#1a1d26",
                                  }}
                                >
                                  <div className="p-5 sm:p-4">
                                    {/* Route Header - Larger touch area */}
                                    <div className="flex items-center gap-4 sm:gap-3 mb-4 sm:mb-3">
                                      {/* Checkbox - Bigger for mobile */}
                                      <div
                                        className="w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded flex items-center justify-center border-2 flex-shrink-0 transition-all"
                                        style={{
                                          borderColor: isSelected ? routeColor : "#4b5563",
                                          backgroundColor: isSelected ? routeColor : "transparent",
                                        }}
                                      >
                                        {isSelected && (
                                          <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 text-black" />
                                        )}
                                      </div>
                                      {/* Route Number Badge */}
                                      <div
                                        className="w-14 h-14 sm:w-10 sm:h-10 rounded-xl sm:rounded-lg flex items-center justify-center font-bold text-xl sm:text-base text-black flex-shrink-0"
                                        style={{ backgroundColor: routeColor }}
                                      >
                                        {idx + 1}
                                      </div>
                                      {/* Route Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-lg sm:text-base truncate">{route.summary || `Route ${idx + 1}`}</div>
                                        <div className="flex gap-2 sm:gap-1 mt-2 sm:mt-1 flex-wrap">
                                          {isFastest && <span className="text-xs sm:text-[10px] bg-blue-500 text-white px-2.5 sm:px-2 py-1 sm:py-0.5 rounded-full sm:rounded font-medium">FASTEST</span>}
                                          {isShortest && <span className="text-xs sm:text-[10px] bg-purple-500 text-white px-2.5 sm:px-2 py-1 sm:py-0.5 rounded-full sm:rounded font-medium">SHORTEST</span>}
                                          {isSafest && route.hazardCount === 0 && <span className="text-xs sm:text-[10px] bg-green-500 text-white px-2.5 sm:px-2 py-1 sm:py-0.5 rounded-full sm:rounded font-medium">SAFEST</span>}
                                        </div>
                                      </div>
                                      {/* Hazard Badge */}
                                      <div className={`px-3 sm:px-2 py-2 sm:py-1 rounded-lg sm:rounded text-sm sm:text-xs font-bold flex-shrink-0 ${
                                        route.hazardCount === 0
                                          ? "bg-green-500/20 text-green-400"
                                          : "bg-orange-500/20 text-orange-400"
                                      }`}>
                                        {route.hazardCount === 0 ? "CLEAR" : `${route.hazardCount}`}
                                      </div>
                                    </div>

                                    {/* Stats Grid - Larger text for mobile */}
                                    <div className="grid grid-cols-3 gap-3 sm:gap-2 mb-4 sm:mb-3">
                                      <div className="bg-black/40 rounded-xl sm:rounded-lg p-3 sm:p-2 text-center">
                                        <div className="text-white font-bold text-lg sm:text-sm">{route.distance}</div>
                                        <div className="text-xs sm:text-[10px] text-gray-500 mt-1">Distance</div>
                                      </div>
                                      <div className="bg-black/40 rounded-xl sm:rounded-lg p-3 sm:p-2 text-center">
                                        <div className="text-white font-bold text-lg sm:text-sm">{route.duration}</div>
                                        <div className="text-xs sm:text-[10px] text-gray-500 mt-1">Duration</div>
                                      </div>
                                      <div className="bg-black/40 rounded-xl sm:rounded-lg p-3 sm:p-2 text-center">
                                        <div className={`font-bold text-lg sm:text-sm ${route.hazardCount === 0 ? "text-green-400" : "text-orange-400"}`}>
                                          {route.hazardCount}
                                        </div>
                                        <div className="text-xs sm:text-[10px] text-gray-500 mt-1">Hazards</div>
                                      </div>
                                    </div>

                                    {/* Traffic info */}
                                    {route.durationInTraffic && (
                                      <div className="text-sm sm:text-xs text-gray-400 mb-4 sm:mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 sm:w-3 sm:h-3" />
                                        {route.durationInTraffic} with traffic
                                      </div>
                                    )}

                                    {/* Navigate Button - Large touch target */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartNavigation(route);
                                      }}
                                      className="w-full py-4 sm:py-3 rounded-xl sm:rounded-lg font-bold text-base sm:text-sm flex items-center justify-center gap-3 sm:gap-2 active:scale-[0.98] transition-transform touch-manipulation"
                                      style={{
                                        backgroundColor: isSelected ? "#3B82F6" : "rgba(255,255,255,0.1)",
                                        color: "white",
                                      }}
                                    >
                                      <Navigation className="w-5 h-5 sm:w-4 sm:h-4" />
                                      Open in Maps
                                      <ExternalLink className="w-4 h-4 sm:w-3 sm:h-3" />
                                    </button>
                                  </div>

                                  {/* Hazards List */}
                                  {isSelected && route.hazards.length > 0 && (
                                    <div className="border-t border-white/10 p-3 bg-orange-500/5">
                                      <div className="text-xs font-bold text-orange-400 mb-2">HAZARDS ON ROUTE:</div>
                                      {route.hazards.slice(0, 3).map((hazard) => {
                                        const config = EVENT_TYPES[hazard.report.eventType];
                                        return (
                                          <div
                                            key={hazard.report.id}
                                            className="flex items-center gap-2 py-1 text-sm"
                                          >
                                            <span style={{ color: config.color }}>{config.icon}</span>
                                            <span className="text-white">{config.label}</span>
                                            <span className="text-gray-500 text-xs ml-auto">
                                              {formatDistance(hazard.distanceFromStart)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Empty State - Mobile optimized */}
                      {!routeResult && !isCalculatingRoute && (
                        <div className="p-12 sm:p-8 text-center">
                          <div className="w-20 h-20 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                            <MapPin className="w-10 h-10 sm:w-8 sm:h-8 text-gray-500" />
                          </div>
                          <p className="text-white font-semibold text-xl sm:text-base mb-2">Enter addresses above</p>
                          <p className="text-base sm:text-sm text-gray-500">We&apos;ll find the safest route for you</p>
                        </div>
                      )}
                    </div>

                    {/* Safe area bottom padding for mobile */}
                    <div className="sm:hidden h-6 bg-[#12141a] safe-area-bottom" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Route Info Banner - DESKTOP ONLY */}
              <AnimatePresence>
                {routeResult && routeResult.routes.length > 0 && !showRoutePlanner && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    onClick={() => setShowRoutePlanner(true)}
                    className={`hidden sm:flex absolute top-4 right-4 w-96 backdrop-blur-md rounded-2xl p-4 shadow-xl cursor-pointer hover:scale-[1.02] transition-transform z-10 ${
                      Array.from(selectedRouteIndices).reduce((sum, idx) => sum + (routeResult.routes[idx]?.hazardCount || 0), 0) > 0
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-mantle-accent to-teal-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        {Array.from(selectedRouteIndices).reduce((sum, idx) => sum + (routeResult.routes[idx]?.hazardCount || 0), 0) > 0 ? (
                          <AlertTriangle className="w-6 h-6 text-white" />
                        ) : (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-white">
                          {selectedRouteIndices.size > 1
                            ? `Comparing ${selectedRouteIndices.size} Routes`
                            : Array.from(selectedRouteIndices).reduce((sum, idx) => sum + (routeResult.routes[idx]?.hazardCount || 0), 0) > 0
                            ? `${Array.from(selectedRouteIndices).reduce((sum, idx) => sum + (routeResult.routes[idx]?.hazardCount || 0), 0)} Hazards Ahead!`
                            : "Route Clear!"}
                        </div>
                        <div className="text-sm text-white/80 truncate">
                          {routeResult.routes[Array.from(selectedRouteIndices)[0] || 0]?.distance} • {routeResult.routes[Array.from(selectedRouteIndices)[0] || 0]?.duration}
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-white/80 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Report Button - Desktop only */}
              <button
                onClick={() => {
                  if (!selectedLocation) {
                    setSelectedLocation(userLocation);
                  }
                  setShowReportSheet(true);
                }}
                className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black font-bold text-base items-center gap-3 shadow-glow-accent hover:scale-105 transition-transform"
              >
                <Plus className="w-5 h-5" />
                Report Incident
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === MOBILE: Google Maps Style UI === */}
        {/* Layer 1: Bottom Sheet (z-20) */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 pointer-events-none z-20">
          <div className="pointer-events-auto">
            {/* Collapsed: Just a small tab */}
            {!mobileSheetExpanded && (
              <button
                onClick={() => setMobileSheetExpanded(true)}
                className="mx-auto mb-3 flex items-center gap-2 px-4 py-2.5 rounded-full bg-mantle-bg-primary/95 backdrop-blur border border-white/10 shadow-lg touch-manipulation active:scale-95"
              >
                <MapPin className="w-4 h-4 text-mantle-accent" />
                <span className="text-sm font-medium text-white">
                  {filteredReports.length} Reports
                </span>
                <ChevronUp className="w-4 h-4 text-mantle-text-secondary" />
              </button>
            )}

            {/* Expanded: Full sheet */}
            <AnimatePresence>
              {mobileSheetExpanded && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-mantle-bg-primary rounded-t-3xl border-t border-white/10 shadow-2xl"
                  style={{ height: "70vh", maxHeight: "70vh" }}
                >
                  {/* Header with close */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-mantle-accent/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-mantle-accent" />
                      </div>
                      <div>
                        <span className="text-base font-bold text-white">Nearby Reports</span>
                        <div className="flex items-center gap-2 text-xs text-mantle-text-tertiary">
                          <span>{filteredReports.length} found</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileSheetExpanded(false)}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 touch-manipulation"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                      <button
                        onClick={() => setFilterType("ALL")}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium touch-manipulation ${
                          filterType === "ALL" ? "bg-mantle-accent text-black" : "bg-white/10 text-white"
                        }`}
                      >
                        All ({reports.length})
                      </button>
                      {Object.entries(EVENT_TYPES).map(([key, config]) => {
                        const count = reports.filter((r) => r.eventType === key).length;
                        return (
                          <button
                            key={key}
                            onClick={() => setFilterType(key as EventType)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium touch-manipulation ${
                              filterType === key ? "text-black" : "bg-white/10 text-white"
                            }`}
                            style={{ backgroundColor: filterType === key ? config.color : undefined }}
                          >
                            {config.icon} {count}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reports List */}
                  <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6" style={{ height: "calc(70vh - 130px)" }}>
                    {isLoadingReports ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-mantle-accent animate-spin" />
                      </div>
                    ) : filteredReports.length === 0 ? (
                      <div className="text-center py-12">
                        <MapPin className="w-12 h-12 text-mantle-text-tertiary mx-auto mb-3" />
                        <p className="text-white font-medium">No reports here</p>
                        <p className="text-sm text-mantle-text-tertiary">Be the first to report!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredReports.map((report) => {
                          const config = EVENT_TYPES[report.eventType];
                          const Icon = EVENT_ICONS[report.eventType];
                          return (
                            <div
                              key={report.id}
                              onClick={() => {
                                handleReportSelect(report);
                                setMobileSheetExpanded(false);
                              }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-mantle-bg-elevated active:bg-mantle-bg-tertiary touch-manipulation"
                            >
                              <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${config.color}20` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: config.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white text-sm">{config.label}</span>
                                  {report.confirmationCount >= 3 && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                  )}
                                </div>
                                <div className="text-xs text-mantle-text-tertiary">
                                  {formatTimeAgo(report.timestamp)} • {report.confirmationCount} confirms
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-mantle-text-tertiary flex-shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Layer 2: FABs (z-[25]) - Only when sheet is collapsed */}
        {!mobileSheetExpanded && (
          <div className="sm:hidden fixed inset-0 pointer-events-none z-[25]">
            {/* Right FABs - Different based on route state */}
            {!routeResult ? (
              // No routes: Show Route, Heatmap, Fit buttons
              <div className="absolute right-4 bottom-16 flex flex-col gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowRoutePlanner(true)}
                  className="w-11 h-11 rounded-full bg-mantle-accent text-black flex items-center justify-center shadow-lg active:scale-95 touch-manipulation"
                >
                  <Route className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-95 touch-manipulation ${
                    showHeatmap ? "bg-orange-500 text-white" : "bg-white text-gray-800"
                  }`}
                >
                  <Flame className="w-5 h-5" />
                </button>
                <button
                  onClick={() => mapRef.current?.showAllReports()}
                  className="w-11 h-11 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg active:scale-95 touch-manipulation"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              // Routes active: Show Heatmap and Clear buttons
              <div className="absolute right-4 bottom-16 flex flex-col gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-95 touch-manipulation ${
                    showHeatmap ? "bg-orange-500 text-white" : "bg-white text-gray-800"
                  }`}
                >
                  <Flame className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClearRoute}
                  className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Left: Report button */}
            <div className="absolute left-4 bottom-16 pointer-events-auto">
              <button
                onClick={() => {
                  if (!selectedLocation) setSelectedLocation(userLocation);
                  setShowReportSheet(true);
                }}
                className="h-11 px-4 rounded-full bg-mantle-accent text-black font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 touch-manipulation"
              >
                <Plus className="w-4 h-4" />
                Report
              </button>
            </div>
          </div>
        )}

        {/* Layer 3: Active Route Banner (z-30) - Top when routes exist */}
        {routeResult && !showRoutePlanner && !mobileSheetExpanded && (
          <div className="sm:hidden fixed top-14 left-3 right-3 z-30 pointer-events-auto">
            <button
              onClick={() => setShowRoutePlanner(true)}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-xl flex items-center gap-3 active:scale-[0.98] touch-manipulation border border-blue-400/20"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-bold text-white">
                  {selectedRouteIndices.size} Route{selectedRouteIndices.size !== 1 ? "s" : ""} Active
                </div>
                <div className="text-xs text-white/70">
                  Tap to edit or navigate
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full flex-shrink-0">
                <span className="text-xs text-white font-medium">Edit</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Report Sheet */}
      <ReportSheet
        isOpen={showReportSheet}
        onClose={() => {
          setShowReportSheet(false);
          setSelectedLocation(null);
        }}
        selectedLocation={selectedLocation}
        onLocationChange={(loc) => setSelectedLocation(loc)}
        onSuccess={() => {
          setShowReportSheet(false);
          setSelectedLocation(null);
        }}
      />

      {/* === MOBILE Route Planner Modal === */}
      <AnimatePresence>
        {showRoutePlanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex sm:hidden fixed inset-0 z-[100] bg-mantle-bg-primary flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-mantle-bg-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mantle-accent flex items-center justify-center">
                  <Route className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Route Planner</h3>
                  <p className="text-xs text-mantle-text-tertiary">Find the safest route</p>
                </div>
              </div>
              <button
                onClick={() => setShowRoutePlanner(false)}
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 touch-manipulation"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-shrink-0 px-4 py-4 bg-mantle-bg-elevated border-b border-white/10">
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <PlacesAutocomplete
                      value={routeOrigin}
                      onChange={setRouteOrigin}
                      placeholder="Where from?"
                      showMyLocation={true}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <PlacesAutocomplete
                      value={routeDestination}
                      onChange={setRouteDestination}
                      placeholder="Where to?"
                    />
                  </div>
                </div>
              </div>

              {routeError && (
                <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {routeError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCalculateRoute}
                  disabled={isCalculatingRoute}
                  className="flex-1 py-3 rounded-xl bg-mantle-accent text-black font-bold flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation disabled:opacity-50"
                >
                  {isCalculatingRoute ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5" />
                  )}
                  {isCalculatingRoute ? "Searching..." : "Find Routes"}
                </button>
                {(routeOrigin || routeDestination || routeResult) && (
                  <button
                    onClick={handleClearRoute}
                    className="px-4 py-3 rounded-xl bg-white/10 text-white font-medium active:bg-white/20 touch-manipulation"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isCalculatingRoute && (
                <div className="p-8 text-center">
                  <RefreshCw className="w-12 h-12 text-mantle-accent mx-auto mb-4 animate-spin" />
                  <p className="text-white font-medium">Finding routes...</p>
                  <p className="text-sm text-mantle-text-tertiary mt-1">Analyzing traffic & hazards</p>
                </div>
              )}

              {!isCalculatingRoute && routeResult && routeResult.routes.length > 0 && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-mantle-text-tertiary font-medium uppercase tracking-wide">
                      {routeResult.routes.length} routes found
                    </p>
                    <p className="text-xs text-mantle-accent">
                      {selectedRouteIndices.size} selected
                    </p>
                  </div>

                  {routeResult.routes.map((route, index) => (
                    <div
                      key={index}
                      onClick={() => handleToggleRoute(index)}
                      className={`p-4 rounded-xl border-2 transition-all touch-manipulation ${
                        selectedRouteIndices.has(index)
                          ? "border-mantle-accent bg-mantle-accent/10"
                          : "border-white/10 bg-mantle-bg-elevated active:bg-mantle-bg-tertiary"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: route.color }}
                          />
                          <span className="font-bold text-white">{route.summary}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedRouteIndices.has(index) ? "border-mantle-accent bg-mantle-accent" : "border-white/30"
                        }`}>
                          {selectedRouteIndices.has(index) && <CheckCircle2 className="w-4 h-4 text-black" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-white">{route.distance}</span>
                        <span className="text-mantle-text-tertiary">{route.duration}</span>
                        {route.hazardCount > 0 ? (
                          <span className="text-orange-400 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            {route.hazardCount} hazards
                          </span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Clear
                          </span>
                        )}
                      </div>
                      {/* Navigate Button for each route */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartNavigation(route);
                        }}
                        className="w-full mt-3 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation"
                      >
                        <Navigation className="w-4 h-4" />
                        Open in Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* View on Map Button */}
                  <button
                    onClick={() => setShowRoutePlanner(false)}
                    className="w-full py-4 rounded-xl bg-mantle-accent text-black font-bold flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation mt-4"
                  >
                    <MapIcon className="w-5 h-5" />
                    View Routes on Map
                  </button>
                </div>
              )}

              {!isCalculatingRoute && !routeResult && (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-mantle-text-tertiary mx-auto mb-4" />
                  <p className="text-white font-medium">Enter your route</p>
                  <p className="text-sm text-mantle-text-tertiary mt-1">We&apos;ll find the safest path</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Detail Modal - Mobile optimized */}
      <AnimatePresence>
        {showReportDetail && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center safe-area-inset"
            onClick={() => setShowReportDetail(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-mantle-bg-elevated rounded-t-3xl sm:rounded-3xl overflow-hidden sm:mx-4 sm:my-8 max-h-[90vh] sm:max-h-[calc(100vh-4rem)] flex flex-col"
            >
              {/* Header with close button - Larger touch targets */}
              <div className="flex items-center justify-between p-4 sm:p-4 border-b border-white/10 safe-area-top">
                <h2 className="text-xl sm:text-lg font-semibold text-white">Report Details</h2>
                <button
                  onClick={() => setShowReportDetail(false)}
                  className="w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 sm:hover:bg-white/20 transition-colors touch-manipulation"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {(() => {
                  const config = EVENT_TYPES[selectedReport.eventType];
                  const Icon = EVENT_ICONS[selectedReport.eventType];
                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="w-8 h-8" style={{ color: config.color }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{config.label}</h3>
                          <p className="text-sm text-mantle-text-secondary">
                            {formatTimeAgo(selectedReport.timestamp)} ago
                          </p>
                        </div>
                        {selectedReport.confirmationCount >= 3 && (
                          <div className="ml-auto px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-mantle-bg-tertiary">
                          <div className="text-2xl font-bold text-white mb-1">
                            {selectedReport.confirmationCount}
                          </div>
                          <div className="text-xs text-mantle-text-tertiary">Confirms</div>
                        </div>
                        <div className="p-4 rounded-xl bg-mantle-bg-tertiary">
                          <div className="text-2xl font-bold text-mantle-accent mb-1">
                            {selectedReport.stakeAmount?.toFixed(3) || "0"}
                          </div>
                          <div className="text-xs text-mantle-text-tertiary">Staked MNT</div>
                        </div>
                        <div className="p-4 rounded-xl bg-mantle-bg-tertiary">
                          <div className="text-2xl font-bold text-yellow-400 mb-1">
                            {Number(selectedReport.totalRegards) / 1e18 || 0}
                          </div>
                          <div className="text-xs text-mantle-text-tertiary">Tips MNT</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-mantle-bg-tertiary flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-mantle-text-tertiary" />
                        <div>
                          <div className="text-sm text-mantle-text-secondary">Location</div>
                          <div className="text-white font-mono text-sm">
                            {selectedReport.lat.toFixed(6)}, {selectedReport.lng.toFixed(6)}
                          </div>
                        </div>
                      </div>

                      {/* Navigate Button */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.lat},${selectedReport.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-between hover:bg-blue-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                            <Navigation className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">Open in Google Maps</div>
                            <div className="text-xs text-blue-300">Get directions to this incident</div>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-blue-400" />
                      </a>

                      {/* Blockchain Verification */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-mantle-accent/10 to-purple-500/10 border border-mantle-accent/20 space-y-3">
                        <div className="flex items-center gap-2 text-mantle-accent font-semibold text-sm">
                          <Shield className="w-4 h-4" />
                          On-Chain Verification
                        </div>

                        <div className="space-y-2">
                          {/* Transaction Hash - Direct link to the tx */}
                          {selectedReport.txHash && (
                            <a
                              href={`https://mantlescan.xyz/tx/${selectedReport.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between group"
                            >
                              <span className="text-xs text-mantle-text-tertiary">Transaction</span>
                              <span className="text-xs text-mantle-accent font-mono flex items-center gap-1 group-hover:underline">
                                {selectedReport.txHash.slice(0, 10)}...{selectedReport.txHash.slice(-8)}
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            </a>
                          )}

                          {/* Report ID */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-mantle-text-tertiary">Report ID (on-chain)</span>
                            <span className="text-xs text-white font-mono">#{selectedReport.id}</span>
                          </div>

                          {/* Privacy Shield Explanation */}
                          {selectedReport.commitment && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-semibold text-purple-300">Privacy Shield Active</span>
                              </div>
                              <p className="text-[11px] text-mantle-text-tertiary mb-2">
                                Your identity is protected with a commitment hash. Only you with your passphrase can claim rewards.
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-mantle-text-tertiary">Commitment:</span>
                                <code className="text-[10px] text-purple-400 font-mono bg-black/30 px-2 py-0.5 rounded">
                                  {selectedReport.commitment.slice(0, 10)}...{selectedReport.commitment.slice(-6)}
                                </code>
                              </div>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-mantle-text-tertiary">Block Time</span>
                            <span className="text-xs text-white font-mono">
                              {new Date(selectedReport.timestamp * 1000).toLocaleString()}
                            </span>
                          </div>

                          {/* Contract Address */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-mantle-text-tertiary">Contract</span>
                            <a
                              href="https://mantlescan.xyz/address/0x23a95d01af99F06c446522765E6F3E604865D58a"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-mantle-accent font-mono hover:underline"
                            >
                              0x23a9...D58a
                            </a>
                          </div>

                          {/* View Report Data on Mantlescan */}
                          <a
                            href={`https://mantlescan.xyz/address/0x23a95d01af99F06c446522765E6F3E604865D58a#readContract#F3`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 mt-2 py-2 rounded-lg bg-mantle-accent/20 text-mantle-accent text-xs font-medium hover:bg-mantle-accent/30 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Verify Report #{selectedReport.id} on Mantlescan
                          </a>
                        </div>
                      </div>

                      {/* Tip Input */}
                      {showTipInput && (
                        <div className="p-4 rounded-xl bg-mantle-bg-tertiary space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={tipAmount}
                              onChange={(e) => setTipAmount(e.target.value)}
                              min="0.001"
                              step="0.001"
                              className="flex-1 bg-mantle-bg-secondary rounded-lg px-4 py-2 text-white border border-white/10 focus:border-mantle-accent focus:outline-none"
                              placeholder="0.01"
                            />
                            <span className="text-mantle-text-secondary">MNT</span>
                          </div>
                          <div className="flex gap-2">
                            {["0.01", "0.05", "0.1"].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => setTipAmount(amt)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  tipAmount === amt
                                    ? "bg-mantle-accent text-black"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                              >
                                {amt} MNT
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 safe-area-bottom pb-2 sm:pb-0">
                        <button
                          onClick={handleConfirmReport}
                          disabled={isConfirmPending || !isConnected}
                          className="flex-1 py-4 sm:py-4 rounded-xl bg-green-500/20 text-green-400 font-semibold text-base sm:text-sm flex items-center justify-center gap-2 active:bg-green-500/30 sm:hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
                        >
                          {isConfirmPending ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                          {isConfirmPending ? "Confirming..." : "Confirm Report"}
                        </button>
                        <button
                          onClick={() => {
                            if (showTipInput) {
                              handleSendTip();
                            } else {
                              setShowTipInput(true);
                            }
                          }}
                          disabled={isTipPending || !isConnected}
                          className="flex-1 py-4 sm:py-4 rounded-xl bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black font-semibold text-base sm:text-sm flex items-center justify-center gap-2 active:opacity-90 sm:hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
                        >
                          {isTipPending ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Coins className="w-5 h-5" />
                          )}
                          {isTipPending ? "Sending..." : showTipInput ? `Send ${tipAmount} MNT` : "Send Tip"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect Wallet Modal */}
      <AnimatePresence>
        {showConnectWalletModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowConnectWalletModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-mantle-bg-elevated rounded-3xl p-6 border border-white/10"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-mantle-accent/20 flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-mantle-accent" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
                <p className="text-sm text-mantle-text-secondary">
                  Connect your wallet to report incidents and earn rewards
                </p>
              </div>

              <div className="space-y-3">
                {/* If on mobile without injected provider, show MetaMask deep link first */}
                {isMobile && !hasInjectedProvider && (
                  <>
                    <button
                      onClick={openInMetaMask}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                      <Smartphone className="w-5 h-5" />
                      Open in MetaMask App
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-mantle-bg-elevated text-mantle-text-tertiary">or use WalletConnect</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Show connectors */}
                {connectors.map((connector) => {
                  // On mobile without provider, only show WalletConnect
                  if (isMobile && !hasInjectedProvider && connector.id !== "walletConnect") {
                    return null;
                  }
                  // Skip injected if MetaMask is available
                  if (connector.id === "injected" && connectors.some((c) => c.id === "metaMaskSDK")) {
                    return null;
                  }

                  const isMetaMask = connector.id === "metaMaskSDK" || connector.id === "io.metamask";
                  const isWalletConnect = connector.id === "walletConnect";

                  return (
                    <button
                      key={connector.uid}
                      onClick={() => {
                        connect({ connector });
                        setShowConnectWalletModal(false);
                      }}
                      disabled={isConnectPending}
                      className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-transform ${
                        isMetaMask
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                          : isWalletConnect
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "bg-mantle-bg-tertiary text-white border border-white/10"
                      }`}
                    >
                      {isConnectPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-5 h-5" />
                          {connector.name}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowConnectWalletModal(false)}
                className="w-full mt-4 py-3 text-mantle-text-tertiary text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
