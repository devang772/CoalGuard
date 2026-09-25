import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

const REPORT_TYPES = [
  { key: 'unsafe_act', label: 'Unsafe Act' },
  { key: 'unsafe_condition', label: 'Unsafe Condition' },
  { key: 'near_miss', label: 'Near-Miss' },
  { key: 'incident', label: 'Incident' },
];

export default function FormReportScreen() {
  const router = useRouter();
  const [reportType, setReportType] = useState('unsafe_condition');
  const [description, setDescription] = useState('');
  const [exactSpot, setExactSpot] = useState('Seam 3, Level 2 Junction');
  const [anonymous, setAnonymous] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleSubmit = () => {
    router.push({
      pathname: '/report/success' as any,
      params: { refId: 'REP-' + Math.floor(10000 + Math.random() * 90000) },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fill Hazard Form</Text>
      <Text style={styles.subTitle}>Select hazard type & capture location details.</Text>

      {/* Report Type Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Report Category Type</Text>
        <View style={styles.typeGrid}>
          {REPORT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, reportType === t.key && styles.typeBtnActive]}
              onPress={() => setReportType(t.key)}
            >
              <Text style={[styles.typeBtnText, reportType === t.key && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Exact Spot / Location Name</Text>
        <TextInput
          style={styles.input}
          value={exactSpot}
          onChangeText={setExactSpot}
          placeholder="e.g. Haul road km 4, Substation 2"
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Description Details</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter observation details..."
        />
      </View>

      {/* Photo Attachment */}
      <View style={styles.card}>
        <Text style={styles.label}>Photo Attachment (Satya Proof Camera)</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
        ) : (
          <TouchableOpacity
            style={styles.photoBox}
            onPress={() => {
              setPhotoUri('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600');
              router.push('/camera' as any);
            }}
          >
            <Feather name="camera" size={32} color={colors.safetyAmberDark} />
            <Text style={styles.photoText}>Take Proof Photo</Text>
          </TouchableOpacity>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Report Anonymously 🔒</Text>
          <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.safetyAmber }} />
        </View>
      </View>

      <BigButton title="Submit Hazard Report →" onPress={handleSubmit} />
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: colors.coalBlue,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  typeBtnTextActive: {
    color: colors.safetyAmber,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  photoBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.safetyAmber,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.coalBlue,
  },
});
