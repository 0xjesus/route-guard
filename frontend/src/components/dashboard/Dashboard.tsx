"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import {
  MapPin,
  List,
  User,
  Plus,
  Bell,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  TrendingUp,
  Coins,
  Shield,
  ChevronRight,
  X,
  Car,
  Construction,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import GoogleMap, { EVENT_TYPES, EventType, ReportMarker } from "@/components/map/GoogleMap";
import ReportSheet from "@/components/layout/ReportSheet";
import { useReportCount } from "@/hooks/useRoadGuard";
import { formatEther } from "viem";

interface DashboardProps {
  onBack: () => void;
}

type Tab = "feed" | "map" | "profile";

const EVENT_ICONS: Record<EventType, any> = {
  ACCIDENT: Car,
  ROAD_CLOSURE: Construction,
  PROTEST: Megaphone,
  POLICE_ACTIVITY: Shield,
  HAZARD: AlertTriangle,
  TRAFFIC_JAM: Clock,
};

// Demo reports for showcase
const DEMO_REPORTS: ReportMarker[] = [
  { id: 1, lat: 19.4326, lng: -99.1332, eventType: "ACCIDENT", confirmationCount: 5, totalRegards: "0.15", timestamp: Date.now() - 300000, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
  { id: 2, lat: 19.4280, lng: -99.1450, eventType: "TRAFFIC_JAM", confirmationCount: 12, totalRegards: "0.08", timestamp: Date.now() - 600000, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
  { id: 3, lat: 19.4400, lng: -99.1280, eventType: "ROAD_CLOSURE", confirmationCount: 8, totalRegards: "0.25", timestamp: Date.now() - 900000, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
  { id: 4, lat: 19.4350, lng: -99.1500, eventType: "HAZARD", confirmationCount: 3, totalRegards: "0.05", timestamp: Date.now() - 1200000, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
  { id: 5, lat: 19.4250, lng: -99.1200, eventType: "POLICE_ACTIVITY", confirmationCount: 7, totalRegards: "0.12", timestamp: Date.now() - 1500000, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
];

export default function Dashboard({ onBack }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: reportCount } = useReportCount();

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [reports, setReports] = useState<ReportMarker[]>(DEMO_REPORTS);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<EventType | "ALL">("ALL");

  const filteredReports = reports.filter((report) => {
    if (filterType !== "ALL" && report.eventType !== filterType) return false;
    return true;
  });

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setShowReportSheet(true);
  }, []);

  const handleReportClick = useCallback((report: ReportMarker) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  }, []);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-mantle-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-mantle-bg-primary/95 backdrop-blur-md border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mantle-accent to-mantle-accent-dark flex items-center justify-center">
              <Shield className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">RoadGuard</h1>
              <p className="text-xs text-mantle-text-tertiary">
                {isConnected ? truncateAddress(address!) : "Not connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {balance && (
              <div className="px-3 py-1.5 rounded-lg bg-mantle-bg-elevated text-sm">
                <span className="text-mantle-accent font-medium">
                  {parseFloat(formatEther(balance.value)).toFixed(3)}
                </span>
                <span className="text-mantle-text-tertiary ml-1">MNT</span>
              </div>
            )}
            <button className="w-9 h-9 rounded-xl bg-mantle-bg-elevated flex items-center justify-center relative">
              <Bell className="w-4 h-4 text-mantle-text-secondary" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-mantle-accent" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-4"
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-mantle-bg-elevated border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-mantle-accent/20 flex items-center justify-center mb-2">
                    <TrendingUp className="w-4 h-4 text-mantle-accent" />
                  </div>
                  <div className="text-xl font-bold text-white">{Number(reportCount || 0)}</div>
                  <div className="text-xs text-mantle-text-tertiary">Total Reports</div>
                </div>
                <div className="p-4 rounded-2xl bg-mantle-bg-elevated border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{reports.filter(r => r.confirmationCount >= 3).length}</div>
                  <div className="text-xs text-mantle-text-tertiary">Verified</div>
                </div>
                <div className="p-4 rounded-2xl bg-mantle-bg-elevated border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2">
                    <Coins className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-xl font-bold text-white">
                    {reports.reduce((acc, r) => acc + parseFloat(r.totalRegards), 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-mantle-text-tertiary">MNT Rewards</div>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mantle-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-mantle-bg-elevated border border-white/5 rounded-xl text-sm text-white placeholder:text-mantle-text-tertiary focus:outline-none focus:border-mantle-accent/50"
                  />
                </div>
                <button className="px-4 py-3 bg-mantle-bg-elevated border border-white/5 rounded-xl flex items-center gap-2">
                  <Filter className="w-4 h-4 text-mantle-text-secondary" />
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    filterType === "ALL"
                      ? "bg-mantle-accent text-black"
                      : "bg-mantle-bg-elevated text-mantle-text-secondary"
                  }`}
                >
                  All
                </button>
                {Object.entries(EVENT_TYPES).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key as EventType)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      filterType === key
                        ? "text-black"
                        : "bg-mantle-bg-elevated text-mantle-text-secondary"
                    }`}
                    style={{
                      backgroundColor: filterType === key ? config.color : undefined,
                    }}
                  >
                    <span>{config.icon}</span>
                    {config.label}
                  </button>
                ))}
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-mantle-text-secondary">Recent Activity</h2>
                {filteredReports.map((report, index) => {
                  const config = EVENT_TYPES[report.eventType];
                  const Icon = EVENT_ICONS[report.eventType];
                  return (
                    <motion.button
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleReportClick(report)}
                      className="w-full p-4 rounded-2xl bg-mantle-bg-elevated border border-white/5 hover:border-white/10 transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white">{config.label}</h3>
                            <span className="text-xs text-mantle-text-tertiary">
                              {formatTimeAgo(report.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-mantle-text-secondary mb-2">
                            Near coordinates {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-mantle-text-secondary">
                                {report.confirmationCount} confirmed
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Coins className="w-4 h-4 text-mantle-accent" />
                              <span className="text-xs text-mantle-text-secondary">
                                {report.totalRegards} MNT
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-mantle-text-tertiary flex-shrink-0" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-140px)]"
            >
              <GoogleMap
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                reports={reports}
                onReportClick={handleReportClick}
              />
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Profile Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-mantle-accent/20 to-mantle-accent-dark/10 border border-mantle-accent/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-mantle-accent/30 flex items-center justify-center">
                    <User className="w-8 h-8 text-mantle-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {isConnected ? truncateAddress(address!) : "Not Connected"}
                    </h2>
                    <p className="text-sm text-mantle-text-secondary">Road Guardian</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">12</div>
                    <div className="text-xs text-mantle-text-tertiary">Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-mantle-accent">0.85</div>
                    <div className="text-xs text-mantle-text-tertiary">MNT Earned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">98%</div>
                    <div className="text-xs text-mantle-text-tertiary">Accuracy</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full p-4 rounded-xl bg-mantle-bg-elevated border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-mantle-accent" />
                    <span className="text-white">Privacy Settings</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mantle-text-tertiary" />
                </button>
                <button className="w-full p-4 rounded-xl bg-mantle-bg-elevated border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-orange-400" />
                    <span className="text-white">Claim Rewards</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mantle-text-tertiary" />
                </button>
                <button
                  onClick={onBack}
                  className="w-full p-4 rounded-xl bg-mantle-error/10 border border-mantle-error/20 flex items-center justify-center gap-2 text-mantle-error"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-mantle-bg-primary/95 backdrop-blur-md border-t border-white/5 px-6 py-2 pb-safe">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === "feed" ? "bg-mantle-accent/10" : ""
            }`}
          >
            <List className={`w-5 h-5 ${activeTab === "feed" ? "text-mantle-accent" : "text-mantle-text-tertiary"}`} />
            <span className={`text-xs ${activeTab === "feed" ? "text-mantle-accent" : "text-mantle-text-tertiary"}`}>
              Feed
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("map");
              setShowReportSheet(true);
            }}
            className="relative -mt-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mantle-accent to-mantle-accent-dark flex items-center justify-center shadow-glow-accent">
              <Plus className="w-6 h-6 text-black" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === "profile" ? "bg-mantle-accent/10" : ""
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === "profile" ? "text-mantle-accent" : "text-mantle-text-tertiary"}`} />
            <span className={`text-xs ${activeTab === "profile" ? "text-mantle-accent" : "text-mantle-text-tertiary"}`}>
              Profile
            </span>
          </button>
        </div>
      </nav>

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
              className="w-full sm:max-w-md bg-mantle-bg-elevated rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Report Details</h2>
                <button
                  onClick={() => setShowReportDetail(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {(() => {
                const config = EVENT_TYPES[selectedReport.eventType];
                const Icon = EVENT_ICONS[selectedReport.eventType];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-8 h-8" style={{ color: config.color }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                        <p className="text-sm text-mantle-text-secondary">
                          {formatTimeAgo(selectedReport.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-mantle-bg-tertiary">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-mantle-text-tertiary" />
                        <span className="text-sm text-mantle-text-secondary">Location</span>
                      </div>
                      <p className="text-white font-mono">
                        {selectedReport.lat.toFixed(6)}, {selectedReport.lng.toFixed(6)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-mantle-bg-tertiary text-center">
                        <div className="text-2xl font-bold text-white mb-1">
                          {selectedReport.confirmationCount}
                        </div>
                        <div className="text-xs text-mantle-text-tertiary">Confirmations</div>
                      </div>
                      <div className="p-4 rounded-xl bg-mantle-bg-tertiary text-center">
                        <div className="text-2xl font-bold text-mantle-accent mb-1">
                          {selectedReport.totalRegards}
                        </div>
                        <div className="text-xs text-mantle-text-tertiary">MNT Tips</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Confirm
                      </button>
                      <button className="flex-1 py-3 rounded-xl bg-mantle-accent text-black font-medium flex items-center justify-center gap-2">
                        <Coins className="w-5 h-5" />
                        Send Tip
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
