import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getSecureItem, setSecureItem } from '@/utils/security-storage';
import {
  authenticateUser,
  getBiometricCapabilities,
  type BiometricCapabilities,
} from '@/utils/auth-service';

export type AuthState = 'INITIALIZING' | 'LOCKED' | 'AUTHENTICATING' | 'UNLOCKED';

interface SecurityContextValue {
  authState: AuthState;
  appLockEnabled: boolean;
  biometricInfo: BiometricCapabilities;
  privacyShieldActive: boolean;
  autoLockTimeout: number;
  unlock: () => Promise<boolean>;
  setAppLockEnabled: (enabled: boolean) => Promise<boolean>;
  setAutoLockTimeout: (seconds: number) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

const KEY_APP_LOCK_ENABLED = 'lumina_app_lock_enabled';
const KEY_AUTO_LOCK_TIMEOUT = 'lumina_auto_lock_timeout';

export function SecurityProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(0); // 0 = immediate
  const [privacyShieldActive, setPrivacyShieldActive] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<BiometricCapabilities>({
    isAvailable: false,
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
    biometricTypeLabel: 'Passcode',
  });

  const backgroundTimestampRef = useRef<number | null>(null);
  const isAuthenticatingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize security capabilities and user settings from secure storage
  useEffect(() => {
    let isMounted = true;

    async function initSecurity() {
      const caps = await getBiometricCapabilities();
      if (!isMounted) return;
      setBiometricInfo(caps);

      const storedLockEnabled = await getSecureItem(KEY_APP_LOCK_ENABLED);
      const isEnabled = storedLockEnabled === 'true';
      if (!isMounted) return;
      setAppLockEnabledState(isEnabled);

      const storedTimeout = await getSecureItem(KEY_AUTO_LOCK_TIMEOUT);
      if (storedTimeout && !isNaN(Number(storedTimeout))) {
        setAutoLockTimeoutState(Number(storedTimeout));
      }

      if (isEnabled) {
        setAuthState('LOCKED');
        setPrivacyShieldActive(true);
      } else {
        setAuthState('UNLOCKED');
        setPrivacyShieldActive(false);
      }
    }

    initSecurity();

    return () => {
      isMounted = false;
    };
  }, []);

  // Unlock action (triggers biometric / device passcode)
  const unlock = useCallback(async (): Promise<boolean> => {
    if (isAuthenticatingRef.current) return false;

    isAuthenticatingRef.current = true;
    setAuthState('AUTHENTICATING');

    try {
      const result = await authenticateUser('Unlock The Day App');
      if (result.success) {
        setAuthState('UNLOCKED');
        setPrivacyShieldActive(false);
        backgroundTimestampRef.current = null;
        isAuthenticatingRef.current = false;
        return true;
      } else {
        setAuthState('LOCKED');
        setPrivacyShieldActive(true);
        isAuthenticatingRef.current = false;
        return false;
      }
    } catch {
      setAuthState('LOCKED');
      setPrivacyShieldActive(true);
      isAuthenticatingRef.current = false;
      return false;
    }
  }, []);

  // Handle App Lifecycle (Background / Foreground / App Switcher Privacy)
  useEffect(() => {
    if (!appLockEnabled) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      // When app is transitioning away from active (background or inactive)
      if (nextState.match(/inactive|background/) && previousState === 'active') {
        // Do not lock if the inactive state was caused by the OS biometric prompt itself
        if (!isAuthenticatingRef.current) {
          setPrivacyShieldActive(true);
          backgroundTimestampRef.current = Date.now();
        }
      }

      // When app returns to active (foreground)
      if (nextState === 'active' && previousState.match(/inactive|background/)) {
        if (!isAuthenticatingRef.current && backgroundTimestampRef.current !== null) {
          const elapsedSec = (Date.now() - backgroundTimestampRef.current) / 1000;
          if (elapsedSec >= autoLockTimeout) {
            setAuthState('LOCKED');
            setPrivacyShieldActive(true);
            // Prompt for authentication automatically on return
            unlock();
          } else {
            // Within grace period
            setPrivacyShieldActive(false);
          }
          backgroundTimestampRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled, autoLockTimeout, unlock]);

  // Toggle App Lock setting with mandatory biometric identity verification
  const setAppLockEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      // Require biometric / device passcode verification to turn App Lock ON or OFF
      const auth = await authenticateUser(
        enabled ? 'Authenticate to enable App Lock' : 'Authenticate to disable App Lock'
      );
      if (!auth.success) {
        return false;
      }

      await setSecureItem(KEY_APP_LOCK_ENABLED, enabled ? 'true' : 'false');
      setAppLockEnabledState(enabled);

      if (!enabled) {
        setAuthState('UNLOCKED');
        setPrivacyShieldActive(false);
      }
      return true;
    },
    []
  );

  const setAutoLockTimeout = useCallback(async (seconds: number) => {
    await setSecureItem(KEY_AUTO_LOCK_TIMEOUT, String(seconds));
    setAutoLockTimeoutState(seconds);
  }, []);

  const value = useMemo(
    () => ({
      authState,
      appLockEnabled,
      biometricInfo,
      privacyShieldActive,
      autoLockTimeout,
      unlock,
      setAppLockEnabled,
      setAutoLockTimeout,
    }),
    [
      authState,
      appLockEnabled,
      biometricInfo,
      privacyShieldActive,
      autoLockTimeout,
      unlock,
      setAppLockEnabled,
      setAutoLockTimeout,
    ]
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
