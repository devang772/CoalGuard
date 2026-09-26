import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedGrievanceToken {
  token: string;
  category: string;
  date: string;
}

const STORAGE_KEY = 'coalguard_saved_grievances';

export async function saveGrievanceToken(token: string, category: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: SavedGrievanceToken[] = raw ? JSON.parse(raw) : [];
    if (!list.some((item) => item.token === token)) {
      list.unshift({ token, category, date: new Date().toISOString() });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
    }
  } catch (e) {
    console.warn('Failed to save grievance token locally', e);
  }
}

export async function getSavedGrievanceTokens(): Promise<SavedGrievanceToken[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
