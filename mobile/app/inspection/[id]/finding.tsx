import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../../src/components/BigButton';
import { colors } from '../../../src/theme/colors';

const CATEGORIES = [
  { key: 'roof', label: 'Roof/Side Fall', icon: 'shield' },
  { key: 'haul', label: 'Haul Road', icon: 'truck' },
  { key: 'conveyor', label: 'Conveyor', icon: 'repeat' },
  { key: 'electrical', label: 'Electrical', icon: 'zap' },
  { key: 'fire', label: 'Fire Hazard', icon: 'flame' },
  { key: 'water', label: 'Water/Drainage', icon: 'droplet' },
  { key: 'dust', label: 'Coal Dust', icon: 'wind' },
  { key: 'ppe', label: 'PPE Compliance', icon: 'user-check' },
];

const SEVERITIES = [
  { key: 'critical', label: 'Critical: Immediate danger', color: colors.danger },
  { key: 'high', label: 'High: Serious risk', color: colors.warning },
  { key: 'medium', label: 'Medium: Moderate hazard', color: colors.safetyAmberDark },
  { key: 'low', label: 'Low: Minor observation', color: colors.success },
];

export default function AddFindingScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState('roof');
  const [selectedSev, setSelectedSev] = useState('high');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleSaveFinding = () => {
    if (!description && !photoUri) {
      Alert.alert('Required Info', 'Please provide a finding description or photo proof.');
      return;
    }
    Alert.alert('Finding Saved', 'Hazard finding added to inspection draft!');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Hazard Finding</Text>
      <Text style={styles.subTitle}>Captures Satya Proof photo & GPS coordinates.</Text>

      {/* Category Grid */}
      <View style={styles.card}>
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catTile, selectedCat === cat.key && styles.catTileActive]}
              onPress={() => setSelectedCat(cat.key)}
            >
              <Feather
                name={cat.icon as any}
                size={22}
                color={selectedCat === cat.key ? colors.emerald : colors.textSecondary}
              />
              <Text style={[styles.catTileText, selectedCat === cat.key && styles.catTileTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Severity Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Severity Level</Text>
        {SEVERITIES.map((sev) => (
          <TouchableOpacity
            key={sev.key}
            style={[
              styles.sevOption,
              selectedSev === sev.key && { backgroundColor: sev.color, borderColor: sev.color },
            ]}
            onPress={() => setSelectedSev(sev.key)}
          >
            <Text style={[styles.sevText, selectedSev === sev.key && { color: '#FFF' }]}>{sev.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo Capture */}
      <View style={styles.card}>
        <Text style={styles.label}>Proof Photo (In-App Camera)</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
        ) : (
          <TouchableOpacity
            style={styles.camBox}
            onPress={() => {
              setPhotoUri('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600');
              router.push('/camera' as any);
            }}
          >
            <Feather name="camera" size={32} color={colors.emerald} />
            <Text style={styles.camText}>Take Satya Proof Photo</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Description / Speech Dictation</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          placeholder="Describe hazard location and risk details..."
          placeholderTextColor="#64748B"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <BigButton title="Save Finding to Inspection" onPress={handleSaveFinding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catTile: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#131F24',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  catTileActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  catTileText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  catTileTextActive: {
    color: colors.emerald,
  },
  sevOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#131F24',
    marginBottom: 8,
  },
  sevText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  camBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  camText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.emerald,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: '#131F24',
    color: colors.textPrimary,
  },
});
