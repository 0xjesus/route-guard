"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useBalance, useDisconnect } from "wagmi";
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
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { EVENT_TYPES, EventType, ReportMarker } from "@/components/map/GoogleMap";
import type { MapController, RouteHazard } from "@/components/map/AdvancedMap";
import ReportSheet from "@/components/layout/ReportSheet";
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

  // Route planning state
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeHazards, setRouteHazards] = useState<RouteHazard[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Fetch reports from API
  const fetchReports = useCallback(async (lat: number, lng: number) => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/reports?lat=${lat}&lng=${lng}&radius=50`);
      const data = await res.json();

      if (data.reports && data.reports.length > 0) {
        const now = Date.now();
        // Transform API response to ReportMarker format and filter expired
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
          }))
          .filter((r: ReportMarker) => r.expiresAt * 1000 > now); // Client-side expiration filter
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
    // Always fetch NYC first to show existing reports
    fetchReports(40.7128, -74.006);

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
    setRouteHazards([]);

    try {
      const hazards = await mapRef.current?.calculateRoute(routeOrigin, routeDestination);
      if (hazards) {
        setRouteHazards(hazards);
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
    setRouteHazards([]);
    setRouteOrigin("");
    setRouteDestination("");
    setRouteError(null);
  }, []);

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
      {/* Compact Header */}
      <header className="flex-shrink-0 px-4 py-3 bg-mantle-bg-primary/95 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-mantle-bg-elevated flex items-center justify-center hover:bg-mantle-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-mantle-text-secondary" />
            </button>
            <Image
              src="/images/logo.png"
              alt="RoadGuard Logo"
              width={36}
              height={36}
              className="w-9 h-9"
            />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-white">RoadGuard</h1>
              <p className="text-xs text-mantle-text-tertiary">Dashboard</p>
            </div>
          </div>

          {/* Center: View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-mantle-bg-elevated rounded-xl">
            <button
              onClick={() => setViewMode("feed")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "feed" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "split" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary"
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "map" ? "bg-mantle-accent text-black" : "text-mantle-text-secondary"
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Wallet & Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={() => fetchReports(userLocation.lat, userLocation.lng)}
              disabled={isLoadingReports}
              className="w-9 h-9 rounded-xl bg-mantle-bg-elevated flex items-center justify-center hover:bg-mantle-bg-tertiary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-mantle-text-secondary ${isLoadingReports ? 'animate-spin' : ''}`} />
            </button>

            {/* Wallet Menu */}
            {isConnected && address && (
              <div className="relative">
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-mantle-bg-elevated hover:bg-mantle-bg-tertiary transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-mantle-success animate-pulse" />
                  <span className="text-sm font-mono text-white hidden sm:inline">
                    {truncateAddress(address)}
                  </span>
                  {balance && (
                    <span className="text-sm text-mantle-accent font-medium hidden md:inline">
                      {parseFloat(formatEther(balance.value)).toFixed(2)} MNT
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-mantle-text-tertiary transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Wallet Dropdown */}
                <AnimatePresence>
                  {showWalletMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-mantle-bg-card rounded-2xl p-4 shadow-lg border border-white/10 z-50"
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
      <div className="flex-1 flex overflow-hidden">
        {/* Feed Panel */}
        <AnimatePresence mode="wait">
          {(viewMode === "feed" || viewMode === "split") && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className={`flex-shrink-0 flex flex-col bg-mantle-bg-primary border-r border-white/5 overflow-hidden ${
                viewMode === "split" ? "w-96" : "w-full"
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
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {CITIES.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleCitySelect(city)}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-mantle-bg-elevated border border-white/5 hover:border-mantle-accent/50 hover:bg-mantle-bg-tertiary transition-all"
                    >
                      <div className="text-sm font-medium text-white">{city.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setFilterType("ALL")}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterType === "ALL"
                        ? "bg-mantle-accent text-black"
                        : "bg-mantle-bg-elevated text-mantle-text-secondary"
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
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                          filterType === key
                            ? "text-black"
                            : "bg-mantle-bg-elevated text-mantle-text-secondary"
                        }`}
                        style={{
                          backgroundColor: filterType === key ? config.color : undefined,
                        }}
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
                {/* Loading State */}
                {isLoadingReports && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-mantle-accent animate-spin mb-4" />
                    <p className="text-sm text-mantle-text-secondary">Loading reports...</p>
                  </div>
                )}

                {/* Empty State - No Reports */}
                {!isLoadingReports && filteredReports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Image
                      src="/images/no-reports.png"
                      alt="No reports"
                      width={200}
                      height={200}
                      className="w-48 h-48 opacity-80 mb-4"
                    />
                    <h3 className="text-lg font-semibold text-white mb-2">No Reports Yet</h3>
                    <p className="text-sm text-mantle-text-secondary text-center max-w-xs">
                      Be the first to report an incident in this area and help keep your community safe.
                    </p>
                    <button
                      onClick={() => {
                        if (!selectedLocation) {
                          setSelectedLocation(userLocation);
                        }
                        setShowReportSheet(true);
                      }}
                      className="mt-4 px-6 py-3 rounded-xl bg-mantle-accent text-black font-semibold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Report Incident
                    </button>
                  </div>
                )}

                {!isLoadingReports && filteredReports.map((report, index) => {
                  const config = EVENT_TYPES[report.eventType];
                  const Icon = EVENT_ICONS[report.eventType];
                  const isHovered = hoveredReport === report.id;

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onMouseEnter={() => handleReportHover(report.id)}
                      onMouseLeave={() => handleReportHover(null)}
                      onClick={() => handleReportSelect(report)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isHovered
                          ? "bg-mantle-bg-tertiary border-mantle-accent/50 scale-[1.02]"
                          : "bg-mantle-bg-elevated border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
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
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-mantle-accent/20 text-mantle-accent">
                                #{report.id}
                              </span>
                            </div>
                            <span className="text-xs text-mantle-text-tertiary">
                              {formatTimeAgo(report.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {report.confirmationCount}
                            </span>
                            <span className="text-mantle-accent flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {report.stakeAmount?.toFixed(3) || "0"}
                            </span>
                            {report.commitment && (
                              <span className="text-purple-400 flex items-center gap-1" title="Privacy Shield Active">
                                <Shield className="w-3 h-3" />
                                Shielded
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-mantle-text-tertiary flex-shrink-0" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Panel */}
        <AnimatePresence mode="wait">
          {(viewMode === "map" || viewMode === "split") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
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

              {/* Map Action Buttons */}
              <div className="absolute bottom-24 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowRoutePlanner(!showRoutePlanner)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                    showRoutePlanner
                      ? "bg-mantle-accent text-black"
                      : "bg-mantle-bg-elevated text-mantle-text-secondary border border-white/10"
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
                      : "bg-mantle-bg-elevated text-mantle-text-secondary border border-white/10"
                  }`}
                  title="Toggle Heatmap"
                >
                  <Flame className="w-5 h-5" />
                </button>
                <button
                  onClick={() => mapRef.current?.showAllReports()}
                  className="w-12 h-12 rounded-xl bg-mantle-bg-elevated text-mantle-text-secondary border border-white/10 flex items-center justify-center shadow-lg hover:border-mantle-accent/50 transition-all"
                  title="Show All Reports"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              {/* Route Planner Panel */}
              <AnimatePresence>
                {showRoutePlanner && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute top-4 left-4 w-80 bg-mantle-bg-card/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg overflow-hidden z-20"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-mantle-accent" />
                        <h3 className="font-semibold text-white">Route Planner</h3>
                      </div>
                      <button
                        onClick={() => setShowRoutePlanner(false)}
                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* Form */}
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <input
                            type="text"
                            value={routeOrigin}
                            onChange={(e) => setRouteOrigin(e.target.value)}
                            placeholder="Origin (e.g., Times Square, NYC)"
                            className="flex-1 bg-mantle-bg-tertiary rounded-lg px-3 py-2 text-sm text-white placeholder:text-mantle-text-tertiary border border-white/10 focus:border-mantle-accent focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <input
                            type="text"
                            value={routeDestination}
                            onChange={(e) => setRouteDestination(e.target.value)}
                            placeholder="Destination (e.g., Central Park)"
                            className="flex-1 bg-mantle-bg-tertiary rounded-lg px-3 py-2 text-sm text-white placeholder:text-mantle-text-tertiary border border-white/10 focus:border-mantle-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      {routeError && (
                        <p className="text-xs text-red-400">{routeError}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={handleCalculateRoute}
                          disabled={isCalculatingRoute}
                          className="flex-1 py-2.5 rounded-xl bg-mantle-accent text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-mantle-accent-light transition-colors disabled:opacity-50"
                        >
                          {isCalculatingRoute ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Navigation className="w-4 h-4" />
                          )}
                          {isCalculatingRoute ? "Calculating..." : "Get Route"}
                        </button>
                        {(routeOrigin || routeDestination || routeHazards.length > 0) && (
                          <button
                            onClick={handleClearRoute}
                            className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hazards List */}
                    {routeHazards.length > 0 && (
                      <div className="border-t border-white/10">
                        <div className="p-3 bg-orange-500/10 border-b border-orange-500/20">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-semibold text-orange-300">
                              {routeHazards.length} Hazard{routeHazards.length !== 1 ? "s" : ""} on Your Route
                            </span>
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {routeHazards.map((hazard, index) => {
                            const config = EVENT_TYPES[hazard.report.eventType];
                            const Icon = EVENT_ICONS[hazard.report.eventType];
                            return (
                              <div
                                key={hazard.report.id}
                                onClick={() => handleReportSelect(hazard.report)}
                                className="p-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0"
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${config.color}20` }}
                                >
                                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white">{config.label}</div>
                                  <div className="text-xs text-mantle-text-tertiary">
                                    {formatDistance(hazard.distanceFromStart)} ahead
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-mantle-text-tertiary" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No Hazards Message */}
                    {routeHazards.length === 0 && routeOrigin && routeDestination && !isCalculatingRoute && !routeError && (
                      <div className="p-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">Route clear - no hazards detected!</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Hazard Alert Banner */}
              <AnimatePresence>
                {routeHazards.length > 0 && !showRoutePlanner && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    onClick={() => setShowRoutePlanner(true)}
                    className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-orange-500/90 backdrop-blur-md rounded-xl p-3 shadow-lg cursor-pointer hover:bg-orange-500 transition-colors z-10"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {routeHazards.length} Hazard{routeHazards.length !== 1 ? "s" : ""} Ahead!
                        </div>
                        <div className="text-xs text-white/80">
                          Tap to view details
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/80" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Report Button */}
              <button
                onClick={() => {
                  // Use current map center or user location as default
                  if (!selectedLocation) {
                    setSelectedLocation(userLocation);
                  }
                  setShowReportSheet(true);
                }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black font-semibold flex items-center gap-3 shadow-glow-accent hover:scale-105 transition-transform"
              >
                <Plus className="w-5 h-5" />
                Report Incident
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Sheet */}
      <ReportSheet
        isOpen={showReportSheet}
        onClose={() => {
          setShowReportSheet(false);
          setSelectedLocation(null);
        }}
        selectedLocation={selectedLocation}
        onSuccess={() => {
          setShowReportSheet(false);
          setSelectedLocation(null);
        }}
      />

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showReportDetail && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowReportDetail(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-mantle-bg-elevated rounded-3xl overflow-hidden mx-4 my-8 max-h-[calc(100vh-4rem)] flex flex-col"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Report Details</h2>
                <button
                  onClick={() => setShowReportDetail(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
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

                      <div className="flex gap-3">
                        <button
                          onClick={handleConfirmReport}
                          disabled={isConfirmPending || !isConnected}
                          className="flex-1 py-4 rounded-xl bg-green-500/20 text-green-400 font-semibold flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="flex-1 py-4 rounded-xl bg-gradient-to-r from-mantle-accent to-mantle-accent-dark text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
