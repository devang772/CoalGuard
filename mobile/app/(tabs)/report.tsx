import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

export default function ReportHubScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Report Safety Hazard</Text>
      <Text style={styles.subTitle}>Select your preferred reporting method below.</Text>

      {/* Recommended Choice 1: Speak to Report */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, styles.voiceCard]}
        onPress={() => router.push('/report/voice' as any)}
      >
        <View style={styles.recBadge}>
          <Text style={styles.recText}>⭐ RECOMMENDED · VOICE FIRST</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.voiceIconCircle}>
            <Feather name="mic" size={32} color={colors.emerald} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.voiceTitle}>🎤 Speak to Report</Text>
            <Text style={styles.voiceSub}>
              Press & speak in Hindi, Bengali, Odia or English. AI automatically extracts hazard type & location.
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Choice 2: Fill a Form */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => router.push('/report/form' as any)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Feather name="file-text" size={26} color={colors.emerald} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.cardTitle}>📝 Fill a Structured Form</Text>
            <Text style={styles.cardSub}>
              Report Unsafe Act, Unsafe Condition, Near-miss, or Incident with photos & location tags.
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Choice 3: SOS Emergency */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, styles.sosCard]}
        onPress={() => router.push('/sos' as any)}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Feather name="alert-octagon" size={26} color={colors.danger} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.cardTitle, { color: colors.danger }]}>🆘 SOS Emergency Alert</Text>
            <Text style={styles.cardSub}>
              Instant high-priority distress alert sent to Mine Control with your live coordinates.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#05080A',
    minHeight: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subTitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#0D1518',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  voiceCard: {
    borderColor: colors.emerald,
    borderWidth: 2,
  },
  recBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  recText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#05080A',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  voiceIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  voiceSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  sosCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});
