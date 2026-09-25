import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface BeforeAfterViewProps {
  beforeUri: string;
  afterUri?: string;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({ beforeUri, afterUri }) => {
  return (
    <View style={styles.container}>
      <View style={styles.imageCol}>
        <Text style={styles.label}>BEFORE PHOTO</Text>
        <Image source={{ uri: beforeUri }} style={styles.image} resizeMode="cover" />
      </View>
      <View style={styles.imageCol}>
        <Text style={styles.label}>AFTER PHOTO</Text>
        {afterUri ? (
          <Image source={{ uri: afterUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>Pending Capture</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  imageCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#0D1518',
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
});
