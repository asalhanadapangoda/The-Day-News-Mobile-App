import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Checks if hardware-backed secure storage (Keychain / Keystore) is available on the current platform.
 */
export async function isSecureStorageAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Saves a security-sensitive value in platform-secure storage.
 * - iOS: Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
 * - Android: EncryptedSharedPreferences / Android Keystore
 * - Web: Session storage fallback with in-memory isolation
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(`lumina_sec_${key}`, value);
      }
    } catch {
      // Storage restriction tolerated
    }
    return;
  }

  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Retrieves a security-sensitive value from platform-secure storage.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(`lumina_sec_${key}`);
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    return await SecureStore.getItemAsync(key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a security-sensitive value from platform-secure storage.
 */
export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(`lumina_sec_${key}`);
      }
    } catch {
      // Cleanup failure tolerated
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Tolerated if key does not exist
  }
}
