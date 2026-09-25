import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface AppDeviceInfo {
  deviceId: string;
  brand: string | null;
  modelName: string | null;
  osName: string;
  osVersion: string | null;
  appVersion: string | null;
}

export async function getAppDeviceInfo(): Promise<AppDeviceInfo> {
  let deviceId = 'unknown-device';

  if (Platform.OS === 'android') {
    try {
      deviceId = Application.getAndroidId() || Device.modelName || 'android-device-001';
    } catch {
      deviceId = Device.modelName || 'android-device-001';
    }
  } else if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync();
    deviceId = iosId || Device.modelName || 'ios-device-001';
  } else {
    deviceId = 'web-demo-device-888';
  }

  return {
    deviceId,
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion,
    appVersion: Application.nativeApplicationVersion || '1.0.0',
  };
}
