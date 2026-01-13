"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Gift,
  MapPin,
  AlertTriangle,
  Car,
  Construction,
  Megaphone,
  Shield,
  Zap,
  Clock,
  List,
} from "lucide-react";
import { EVENT_TYPES, EventType } from "./GoogleMap";

interface MapOverlayProps {
  onReportClick: () => void;
  onRewardsClick: () => void;
  onFeedClick?: () => void;
  selectedEventType: EventType | null;
  onEventTypeSelect: (type: EventType | null) => void;
  isConnected: boolean;
}

const EVENT_ICONS: Record<EventType, typeof Car> = {
  ACCIDENT: Car,
  ROAD_CLOSURE: Construction,
  PROTEST: Megaphone,
  POLICE_ACTIVITY: Shield,
  HAZARD: AlertTriangle,
  TRAFFIC_JAM: Clock,
};

export default function MapOverlay({
  onReportClick,
  onRewardsClick,
  onFeedClick,
  selectedEventType,
  onEventTypeSelect,
  isConnected,
}: MapOverlayProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      {/* Quick Actions - Bottom Center (Mobile) / Right Side (Desktop) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-overlay">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-row sm:flex-col gap-3"
        >
          {/* Report Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReportClick}
            disabled={!isConnected}
            className="btn-primary btn-lg shadow-glow-accent-lg disabled:opacity-50 disabled:shadow-none"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Report</span>
          </motion.button>

          {/* Rewards Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRewardsClick}
            disabled={!isConnected}
            className="btn-secondary btn-lg disabled:opacity-50"
          >
            <Gift className="w-5 h-5" />
            <span className="hidden sm:inline">Rewards</span>
          </motion.button>

          {/* Filter Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-icon ${showFilters ? "!bg-mantle-accent !text-mantle-black" : ""}`}
          >
            <Zap className="w-5 h-5" />
          </motion.button>

          {/* Feed Toggle */}
          {onFeedClick && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFeedClick}
              className="btn-icon"
            >
              <List className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Event Type Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 sm:top-6 sm:right-24 z-overlay"
          >
            <div className="glass rounded-2xl p-4 w-64">
              <h3 className="text-sm font-semibold text-mantle-text-primary mb-3">
                Filter by Event Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EVENT_TYPES).map(([key, config]) => {
                  const Icon = EVENT_ICONS[key as EventType];
                  const isSelected = selectedEventType === key;

                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        onEventTypeSelect(isSelected ? null : (key as EventType))
                      }
                      className={`
                        flex items-center gap-2 p-2.5 rounded-xl text-left text-sm
                        transition-all duration-200
                        ${
                          isSelected
                            ? "bg-white/10 border-2"
                            : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                        }
                      `}
                      style={{
                        borderColor: isSelected ? config.color : "transparent",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <span className="text-mantle-text-secondary text-xs">
                        {config.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Clear Filter */}
              {selectedEventType && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => onEventTypeSelect(null)}
                  className="w-full mt-3 py-2 text-sm text-mantle-text-tertiary hover:text-mantle-text-primary transition-colors"
                >
                  Clear Filter
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect Wallet Prompt - Small bottom-left badge */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-24 left-4 z-overlay"
          >
            <div className="bg-mantle-bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-mantle-accent/30 shadow-lg">
              <div className="w-6 h-6 rounded-full bg-mantle-accent/20 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-mantle-accent" />
              </div>
              <p className="text-xs font-medium text-mantle-text-secondary">
                Connect wallet to report
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
