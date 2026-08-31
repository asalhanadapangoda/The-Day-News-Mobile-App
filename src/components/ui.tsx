import { router, useFocusEffect } from 'expo-router';
import { PropsWithChildren, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const colors = {
  background: '#101726',
  surface: '#1E293B',
  surfaceLight: '#2D3A4F',
  text: '#E2E8F0',
  muted: '#94A3B8',
  primary: '#60A5FA',
  primaryDark: '#0F2A5C',
  brandBlue: '#1D4ED8',
  line: '#334155',
  income: '#34D399',
  expense: '#F87171',
  amber: '#FBBF24',
};

export const formatMoney = (value: number, currency: string = 'USD') => {
  const symbol = currency === 'USD' ? '$' : currency === 'LKR' ? 'රු ' : `${currency} `;
  return `${symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function Screen({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;
  
  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(15);
      const animation = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
      ]);
      animation.start();
      return () => animation.stop();
    }, [opacity, translateY])
  );
  
  return (
    <Animated.View style={[styles.screen, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function AnimatedPressable({ children, style, ...props }: PropsWithChildren<PressableProps & { style?: any }>) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 150, friction: 5 }).start();
    props.onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start();
    props.onPressOut?.(e);
  };

  return (
    <Pressable {...props} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Icon mapping for outline icons across categories
const outlineIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'restaurant': 'restaurant-outline',
  'restaurant-outline': 'restaurant-outline',
  'food': 'restaurant-outline',
  '🍴': 'restaurant-outline',
  'bus': 'bus-outline',
  'bus-outline': 'bus-outline',
  'transport': 'bus-outline',
  '🚌': 'bus-outline',
  'home': 'home-outline',
  'home-outline': 'home-outline',
  'rent': 'home-outline',
  '⌂': 'home-outline',
  '🏠': 'home-outline',
  'cart': 'cart-outline',
  'cart-outline': 'cart-outline',
  'shopping': 'cart-outline',
  '♧': 'cart-outline',
  'film': 'film-outline',
  'film-outline': 'film-outline',
  'entertainment': 'film-outline',
  '▣': 'film-outline',
  'cafe': 'cafe-outline',
  'cafe-outline': 'cafe-outline',
  '☕': 'cafe-outline',
  'fitness': 'fitness-outline',
  'fitness-outline': 'fitness-outline',
  'gift': 'gift-outline',
  'gift-outline': 'gift-outline',
  'briefcase': 'briefcase-outline',
  'briefcase-outline': 'briefcase-outline',
  'salary': 'trending-up-outline',
  'freelance': 'briefcase-outline',
  '↗': 'trending-up-outline',
  '✦': 'sparkles-outline',
  'subscriptions': 'repeat-outline',
  'cash': 'cash-outline',
  'card': 'card-outline',
  'swap': 'swap-horizontal-outline',
  '↔': 'swap-horizontal-outline',
  'medical': 'medkit-outline',
  'school': 'school-outline',
  'game': 'game-controller-outline',
};

export function CategoryIcon({
  icon,
  color = colors.text,
  size = 20,
}: {
  icon?: string | null;
  color?: string;
  size?: number;
}) {
  const iconName = (icon && outlineIconMap[icon]) ? outlineIconMap[icon] : 'pricetag-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
}

export interface AppHeaderProps {
  title: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export function AppHeader({
  title,
  leftElement,
  rightElement,
  onRightPress,
  style,
}: AppHeaderProps) {
  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.headerLeft}>
        {leftElement}
      </View>
      
      <View style={styles.headerMiddle}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      
      <View style={styles.headerRight}>
        {rightElement !== undefined ? (
          rightElement
        ) : (
          <Pressable
            onPress={onRightPress ?? (() => router.push('/welcome' as never))}
            style={styles.headerLogoBadge}
            hitSlop={10}
          >
            <Image
              source={require('../../assets/images/tdn-logo.png')}
              style={styles.headerLogoImg}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function PageTitle({ children, subtitle }: PropsWithChildren<{ subtitle?: string }>) {
  return (
    <View>
      <Text style={styles.pageTitle}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, color }: PropsWithChildren<{ color?: string }>) {
  return <Text style={[styles.sectionTitle, color ? { color } : null]}>{children}</Text>;
}

export function MonthPicker({ visible, onClose, currentMonth, onSelect }: { visible: boolean; onClose: () => void; currentMonth: string; onSelect: (month: string) => void }) {
  const [yearStr] = currentMonth.split('-');
  const [selectedYear, setSelectedYear] = useState(parseInt(yearStr, 10));
  
  useEffect(() => { if (visible) setSelectedYear(parseInt(currentMonth.split('-')[0], 10)); }, [currentMonth, visible]);
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalDialog} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Pressable hitSlop={15} onPress={() => setSelectedYear(y => y - 1)}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.primary} />
            </Pressable>
            <Text style={styles.modalYear}>{selectedYear}</Text>
            <Pressable hitSlop={15} onPress={() => setSelectedYear(y => y + 1)}>
              <Ionicons name="chevron-forward-outline" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.modalGrid}>
            {monthNames.map((m, i) => {
              const val = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
              const isActive = val === currentMonth;
              return (
                <Pressable key={m} onPress={() => { onSelect(val); onClose(); }} style={[styles.modalMonth, isActive && styles.modalMonthActive]}>
                  <Text style={[styles.modalMonthText, isActive && styles.modalMonthTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pageTitle: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  sectionTitle: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 12, letterSpacing: 0.8 },
  
  // AppHeader Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 52,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerMiddle: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalDialog: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, elevation: 10, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalYear: { color: colors.text, fontSize: 22, fontWeight: '800' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  modalMonth: { width: '30%', paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  modalMonthActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modalMonthText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  modalMonthTextActive: { color: '#0F172A', fontWeight: '800' }
});
