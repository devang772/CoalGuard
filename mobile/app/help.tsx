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
              <Feather name={t.icon as any} size={22} color={colors.safetyAmberDark} />
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
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.coalBlue,
  },
  subTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: colors.safetyAmberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  cardDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});
