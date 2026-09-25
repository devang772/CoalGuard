import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी', greeting: 'नमस्ते', sub: 'खदान सुरक्षा रिपोर्टिंग के लिए' },
  { code: 'en', label: 'English', greeting: 'Welcome', sub: 'For Safety Officers & Managers' },
  { code: 'bn', label: 'বাংলা', greeting: 'স্বাগতম', sub: 'মাইনিং রিপোর্টিং এর জন্য' },
  { code: 'or', label: 'ଓଡ଼ିଆ', greeting: 'ସ୍ୱାଗତ', sub: 'ଖଣି ସୁରକ୍ଷା ପାଇଁ' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { setSelectedLanguage } = useAuthStore();

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setSelectedLanguage(code);
    router.push('/(auth)/permissions' as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.appTitle}>NETRA MOBILE</Text>
      <Text style={styles.tagline}>Khanan Netra · Eye of the Mine</Text>
      <Text style={styles.sectionTitle}>Select Your Language / भाषा चुनें</Text>

      {LANGUAGES.map((item) => (
        <TouchableOpacity
          key={item.code}
          activeOpacity={0.8}
          style={styles.card}
          onPress={() => handleSelect(item.code)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.greeting}>{item.greeting}</Text>
            <Text style={styles.langLabel}>{item.label}</Text>
          </View>
          <Text style={styles.subText}>{item.sub}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#05080A',
    minHeight: '100%',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.emerald,
    textAlign: 'center',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0D1518',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  langLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.emerald,
  },
  subText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
