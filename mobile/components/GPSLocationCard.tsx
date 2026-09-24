import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Navigation, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react-native";
import * as Location from "expo-location";
import { LocationData } from "../types";
import { AppCard } from "./ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

interface GPSLocationCardProps {
  location: LocationData | null;
  onLocationCaptured: (loc: LocationData) => void;
}

export function GPSLocationCard({ location, onLocationCaptured }: GPSLocationCardProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestAndFetchLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Location permission denied. Using site default coordinates.");
        // Fallback default coordinates for Jharia mine site
        onLocationCaptured({
          latitude: 23.7957,
          longitude: 86.4304,
          accuracy: 5.0,
          altitude: 184.3,
          timestamp: Date.now(),
        });
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      onLocationCaptured({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        altitude: currentLocation.coords.altitude,
        timestamp: currentLocation.timestamp,
      });
    } catch (err: any) {
      console.warn("GPS acquire warning:", err.message);
      setErrorMsg("GPS signal weak inside pit. Using site coordinates.");
      onLocationCaptured({
        latitude: 23.7957,
        longitude: 86.4304,
        accuracy: 10.0,
        altitude: 184.3,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!location) {
      requestAndFetchLocation();
    }
  }, []);

  return (
    <AppCard variant="glass" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Navigation size={16} color={COLORS.primary} />
          <Text style={styles.title}>Geospatial Field GPS Tagging</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={requestAndFetchLocation}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <RefreshCw size={12} color={COLORS.primary} />
              <Text style={styles.refreshText}>Recalibrate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {location ? (
        <View style={styles.coordGrid}>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>Latitude:</Text>
            <Text style={styles.coordValue}>{location.latitude.toFixed(6)}° N</Text>
          </View>

          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>Longitude:</Text>
            <Text style={styles.coordValue}>{location.longitude.toFixed(6)}° E</Text>
          </View>

          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>Accuracy:</Text>
            <Text style={styles.coordValue}>
              ±{location.accuracy ? location.accuracy.toFixed(1) : "5.0"} m
            </Text>
          </View>

          {location.altitude && (
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>Altitude / Elev:</Text>
              <Text style={styles.coordValue}>{location.altitude.toFixed(1)} m</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Acquiring GPS satellite fix...</Text>
        </View>
      )}

      {location && (
        <View style={styles.statusFooter}>
          <CheckCircle2 size={12} color={COLORS.safe} />
          <Text style={styles.statusText}>
            GPS Location Locked & Geo-Tagged to Inspection
          </Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorFooter}>
          <AlertCircle size={12} color={COLORS.warning} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  refreshText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  coordGrid: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.xs,
    padding: 10,
    gap: 6,
  },
  coordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coordLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  coordValue: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk-Bold",
  },
  loadingBox: {
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  statusFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  statusText: {
    color: COLORS.safe,
    fontSize: 11,
    fontWeight: "600",
  },
  errorFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 11,
  },
});
