import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function TrackGrievanceScreen() {
  const params = useLocalSearchParams();
  const [tokenInput, setTokenInput] = useState((params.token as string) || 'GRV-7F3K');
  const [searched, setSearched] = useState(true);

  const handleTrack = () => {
    setSearched(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Token Input Bar */}
      <View style={styles.card}>
        <Text style={styles.label}>Enter Tracking Token</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tokenInput}
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="e.g. GRV-7F3K"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleTrack}>
            <Feather name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {searched && (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.tokenLabel}>Token: {tokenInput}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>IN PROGRESS</Text>
            </View>
          </View>

          <Text style={styles.catText}>Category: Safety & PPE Compliance</Text>
          <Text style={styles.subText}>Submitted on: 24 Sep 2026 · Confidential</Text>

          {/* Status Stepper */}
          <Text style={styles.sectionTitle}>Resolution Stepper</Text>
          <View style={styles.stepperContainer}>
            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepDone]}>
                <Feather name="check" size={14} color="#FFF" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Grievance Registered</Text>
                <Text style={styles.stepTime}>24 Sep, 10:15 AM</Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Feather name="clock" size={14} color={colors.coalBlue} />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Assigned to Area Safety Officer</Text>
                <Text style={styles.stepTime}>25 Sep, 09:30 AM</Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={{ color: '#94A3B8', fontWeight: '800' }}>3</Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: '#94A3B8' }]}>Resolution & Action Taken</Text>
                <Text style={styles.stepTime}>Pending officer review</Text>
              </View>
            </View>
          </View>

          {/* Officer Response */}
          <View style={styles.responseBox}>
            <Feather name="message-circle" size={18} color={colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={styles.respTitle}>Officer Note:</Text>
              <Text style={styles.respBody}>
                Safety Officer inspecting Seam 3 ventilation equipment today. Corrective action report pending.
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tokenInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.coalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.coalBlue,
  },
  statusBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.warning,
  },
  catText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.coalBlue,
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
    marginTop: 18,
    marginBottom: 12,
  },
  stepperContainer: {
    paddingLeft: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDone: {
    backgroundColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.safetyAmber,
  },
  stepPending: {
    backgroundColor: '#E2E8F0',
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  stepTime: {
    fontSize: 12,
    color: '#64748B',
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 13,
    marginVertical: 2,
  },
  responseBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  respTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.info,
  },
  respBody: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },
});
