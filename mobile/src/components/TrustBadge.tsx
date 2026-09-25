import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface TrustBadgeProps {
  score?: number;
  flags?: string[];
  showDetails?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ score = 88, flags = [], showDetails = true }) => {
  const [modalVisible, setModalVisible] = useState(false);

  let bg = 'rgba(0, 230, 153, 0.12)';
  let fg = colors.emerald;
  let label = `Verified ${score} ✓`;
  let iconName: keyof typeof Feather.glyphMap = 'check-circle';

  if (score < 60) {
    bg = 'rgba(239, 68, 68, 0.15)';
    fg = colors.danger;
    label = `Suspicious ${score} ⚠`;
    iconName = 'alert-triangle';
  } else if (score < 80) {
    bg = 'rgba(245, 158, 11, 0.15)';
    fg = colors.warning;
    label = `Needs Review ${score}`;
    iconName = 'help-circle';
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!showDetails}
        onPress={() => setModalVisible(true)}
        style={[styles.badge, { backgroundColor: bg, borderColor: fg }]}
      >
        <Feather name={iconName} size={14} color={fg} />
        <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="shield" size={26} color={fg} />
              <Text style={styles.modalTitle}>Satya Proof Verification</Text>
            </View>

            <Text style={styles.scoreText}>
              Trust Score: <Text style={{ color: fg, fontWeight: '900' }}>{score} / 100</Text>
            </Text>

            <Text style={styles.sectionHeader}>Verification Checks:</Text>
            <View style={styles.checkRow}>
              <Feather name="check" size={16} color={colors.emerald} />
              <Text style={styles.checkText}>Captured in-app (Gallery upload blocked)</Text>
            </View>
            <View style={styles.checkRow}>
              <Feather name="check" size={16} color={colors.emerald} />
              <Text style={styles.checkText}>Hardware device timestamp match</Text>
            </View>

            {flags.length > 0 ? (
              <>
                <Text style={[styles.sectionHeader, { color: colors.danger, marginTop: 12 }]}>Flagged Warnings:</Text>
                {flags.map((flag, idx) => (
                  <View key={idx} style={styles.flagRow}>
                    <Feather name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.flagText}>{flag.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.flagRow}>
                <Feather name="check-circle" size={16} color={colors.emerald} />
                <Text style={styles.checkText}>No suspicious mock or GPS manipulation detected</Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0D1518',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scoreText: {
    fontSize: 18,
    color: '#94A3B8',
    marginVertical: 8,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  checkText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  flagText: {
    fontSize: 14,
    color: colors.danger,
    textTransform: 'capitalize',
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: colors.emerald,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#05080A',
    fontSize: 16,
    fontWeight: '800',
  },
});
