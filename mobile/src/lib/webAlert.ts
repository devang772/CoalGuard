import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert does nothing; use the browser dialogs so messages and confirmations work on web.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const action = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  };
}
