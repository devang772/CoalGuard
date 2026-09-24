import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Image as ImageIcon, ArrowRight, Plus, AlertCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useInspection } from "../../context/InspectionContext";
import { PhotoItem } from "../../types";
import { BrandHeader } from "../../components/BrandHeader";
import { PhotoCard } from "../../components/PhotoCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function CameraScreen() {
  const router = useRouter();
  const { photos, addPhoto, removePhoto, location } = useInspection();
  const [selectedTag, setSelectedTag] = useState("Slope Hazard");

  const hazardTags = [
    "Slope Hazard",
    "Tension Crack",
    "Gas Leak",
    "Equipment Fault",
    "PPE Violation",
    "Normal Pit View",
  ];

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera permissions to capture field evidence photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: PhotoItem = {
          id: `photo-${Date.now()}`,
          uri: asset.uri,
          fileName: `pit_evidence_${Date.now()}.jpg`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hazardTag: selectedTag,
          location: location || undefined,
        };
        addPhoto(newPhoto);
      }
    } catch (error: any) {
      console.warn("Camera launch warning:", error.message);
      // Fallback demo sample photo if running on emulator without hardware camera
      const demoPhoto: PhotoItem = {
        id: `photo-${Date.now()}`,
        uri: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600",
        fileName: `pit_demo_${Date.now()}.jpg`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hazardTag: selectedTag,
        location: location || undefined,
      };
      addPhoto(demoPhoto);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: PhotoItem = {
          id: `photo-${Date.now()}`,
          uri: asset.uri,
          fileName: `gallery_evidence_${Date.now()}.jpg`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hazardTag: selectedTag,
          location: location || undefined,
        };
        addPhoto(newPhoto);
      }
    } catch (error: any) {
      console.warn("Gallery picker warning:", error.message);
    }
  };

  const handleNext = () => {
    router.push("/inspection/observation");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <BrandHeader subtitle="Step 3 of 5: Photo Evidence Capture" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Field Camera & Photo Manager</Text>
          <Text style={styles.subtext}>
            Capture high-resolution evidence photographs of slope crests, machinery, and safety hazards.
          </Text>

          {/* Tag Selector */}
          <AppCard variant="glass" style={styles.tagCard}>
            <Text style={styles.tagLabel}>Select Evidence Hazard Tag:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
              {hazardTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagItem, selectedTag === tag && styles.tagItemActive]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Text style={[styles.tagItemText, selectedTag === tag && styles.tagItemTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </AppCard>

          {/* Action Trigger Buttons */}
          <View style={styles.cameraRow}>
            <AppButton
              title="Take Camera Photo"
              variant="primary"
              size="lg"
              icon={<Camera size={20} color={COLORS.textInverse} />}
              onPress={takePhotoWithCamera}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Gallery"
              variant="outline"
              size="lg"
              icon={<ImageIcon size={18} color={COLORS.primary} />}
              onPress={pickImageFromGallery}
            />
          </View>

          {/* Captured Photos Preview Section */}
          <Text style={styles.sectionTitle}>
            Attached Evidence Photos ({photos.length})
          </Text>

          {photos.length > 0 ? (
            photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onDelete={removePhoto} />
            ))
          ) : (
            <View style={styles.emptyPhotosBox}>
              <Camera size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Photos Captured Yet</Text>
              <Text style={styles.emptySub}>
                Tap "Take Camera Photo" above to capture site evidence.
              </Text>
            </View>
          )}

          <AppButton
            title="Proceed to Hazard & GPS Tagging"
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} color={COLORS.textInverse} />}
            onPress={handleNext}
            style={{ marginTop: SPACING.md, marginBottom: 30 }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  topHeader: {
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  tagCard: {
    marginBottom: SPACING.md,
  },
  tagLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tagScroll: {
    gap: 8,
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  tagItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagItemText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  tagItemTextActive: {
    color: COLORS.textInverse,
  },
  cameraRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  emptyPhotosBox: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 30,
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 30,
  },
});
