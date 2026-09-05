import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricTypeLabel: string;
}

/**
 * Inspects device hardware and enrollment state to determine available biometric authentication capabilities.
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricTypeLabel: 'Passcode',
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let label = 'Biometrics';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      label = 'Iris Scanner';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricTypeLabel: label,
    };
  } catch {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricTypeLabel: 'Passcode',
    };
  }
}

export interface AuthResult {
  success: boolean;
  error?: string;
  canceled?: boolean;
}

/**
 * Triggers platform authentication (Biometrics with automatic OS fallback to device passcode/PIN).
 * The OS performs all biometric verification; the application never sees or stores biometric templates.
 */
export async function authenticateUser(promptMessage: string = 'Unlock The Day App'): Promise<AuthResult> {
  if (Platform.OS === 'web') {
    // On Web where native biometrics are absent, pass-through or simulated user confirmation
    return { success: true };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Device Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Handle cancellation or failures
    if (result.error === 'user_cancel' || result.error === 'app_cancel' || result.error === 'system_cancel') {
      return { success: false, canceled: true, error: 'Authentication canceled.' };
    }

    if (result.error === 'lockout') {
      return { success: false, error: 'Too many failed attempts. Biometrics locked.' };
    }

    return { success: false, error: 'Authentication failed. Please try again.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication error occurred.' };
  }
}
