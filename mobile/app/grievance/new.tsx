import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { submitGrievanceApi } from '../../src/api/endpoints';
import { colors } from '../../src/theme/colors';

const CATEGORIES = [
  'Wages / Payment',
  'Safety & PPE',
  'Harassment',
  'Facilities (Water/Toilet/Canteen)',
  'Leave & Shifts',
  'Other Issue',
];

export default function NewGrievanceScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text) {
      Alert.alert('Required', 'Please enter your grievance details.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitGrievanceApi(selectedCat, text, anonymous);
      setTokenResult(res.token);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Raise Worker Grievance</Text>
      <Text style={styles.subTitle}>Submit confidentially to Khanan Netra governance panel.</Text>

      {/* Category Select */}
      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, selectedCat === cat && styles.catBtnActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.catText, selectedCat === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Details & Anonymous Switch */}
      <View style={styles.card}>
        <Text style={styles.label}>Grievance Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="Describe issue, dates, or details..."
          value={text}
          onChangeText={setText}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Hide My Name 🔒 (Anonymous)</Text>
            <Text style={styles.switchSub}>Your identity will NOT be shared with contractor or officers.</Text>
          </View>
          <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.safetyAmber }} />
        </View>
      </View>

      {!tokenResult ? (
        <BigButton title="Submit Confidential Grievance" onPress={handleSubmit} loading={loading} />
      ) : (
        <View style={styles.tokenCard}>
          <Feather name="shield" size={32} color={colors.success} />
          <Text style={styles.tokenTitle}>Grievance Registered ✓</Text>
          <Text style={styles.tokenSub}>Save this tracking token to check status anytime:</Text>

          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>{tokenResult}</Text>
          </View>

          <BigButton
            title="Track Status Now →"
            onPress={() => router.push({ pathname: '/grievance/track' as any, params: { token: tokenResult } })}
            style={{ width: '100%', marginTop: 16 }}
          />
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  catBtnActive: {
    backgroundColor: colors.coalBlue,
  },
  catText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coalBlue,
    textAlign: 'center',
  },
  catTextActive: {
    color: colors.safetyAmber,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  switchSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tokenCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  tokenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.coalBlue,
    marginTop: 8,
  },
  tokenSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  tokenBadge: {
    backgroundColor: colors.coalBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  tokenText: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.safetyAmber,
    letterSpacing: 2,
  },
});
