import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2, Tag, MapPin } from "lucide-react-native";
import { PhotoItem } from "../types";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

interface PhotoCardProps {
  photo: PhotoItem;
  onDelete?: (id: string) => void;
}

export function PhotoCard({ photo, onDelete }: PhotoCardProps) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <Text style={styles.filename} numberOfLines={1}>
          {photo.fileName}
        </Text>
        <Text style={styles.timestamp}>{photo.timestamp}</Text>

        {photo.hazardTag && (
          <View style={styles.tagBadge}>
            <Tag size={10} color={COLORS.primary} />
            <Text style={styles.tagText}>{photo.hazardTag}</Text>
          </View>
        )}

        {photo.location && (
          <View style={styles.locationRow}>
            <MapPin size={10} color={COLORS.accent} />
            <Text style={styles.locationText}>
              {photo.location.latitude.toFixed(4)}°, {photo.location.longitude.toFixed(4)}°
            </Text>
          </View>
        )}
      </View>

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(photo.id)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={COLORS.destructive} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginBottom: SPACING.sm,
    alignItems: "center",
  },
  image: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surfaceStrong,
  },
  content: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  filename: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    color: COLORS.accent,
    fontSize: 9,
  },
  deleteBtn: {
    padding: 12,
  },
});
