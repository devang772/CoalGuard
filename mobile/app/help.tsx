import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';

const TUTORIALS = [
  {
    title: '1. Satya Proof Verification',
    desc: 'Every photo is taken inside Netra Mobile. Photos from device gallery are blocked. Satya proof tags time, GPS, and device ID to compute a Trust Score (0-100).',
    icon: 'shield-check',
  },
  {
    title: '2. Speak-to-Report Hazard',
    desc: 'Tap the big mic icon on the Report tab. Speak in Hindi, Bengali, Odia or English. AI automatically parses transcript, hazard type, and location.',
    icon: 'mic',
  },
  {
    title: '3. Closing a CAPA (Before/After)',
    desc: 'Navigate to the overdue CAPA. The app shows live distance to the before-photo spot. Use the ghost overlay camera view to align your photo.',
    icon: 'camera',
  },
  {
    title: '4. Offline First Engine',
    desc: 'All forms and submissions save to your phone outbox first. When network reconnects, items automatically sync to Khanan Netra server.',
    icon: 'wifi-off',
  },
];

export default function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Khanan Netra User Guide</Text>
      <Text style={styles.subTitle}>Field User & Worker Guide for Mobile App</Text>

      {TUTORIALS.map((t, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Feather name={t.icon as any} size={22} color={colors.emerald} />
            </View>
            <Text style={styles.cardTitle}>{t.title}</Text>
          </View>
          <Text style={styles.cardDesc}>{t.desc}</Text>
        </View>
      ))}
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
