import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import type { CategoryInput } from '@/context/money-context';
import { colors, Screen, AppHeader, CategoryIcon } from '@/components/ui';

const palette = ['#8B6BE8', '#22C6A3', '#78A4F9', '#F27496', '#2CB7BD', '#E3B525'];
const selectableIcons = [
  'restaurant-outline',
  'bus-outline',
  'home-outline',
  'cart-outline',
  'film-outline',
  'cafe-outline',
  'fitness-outline',
  'gift-outline',
  'briefcase-outline',
  'medkit-outline',
  'school-outline',
  'game-controller-outline',
];

export default function CategoryForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories, saveCategory, deleteCategory } = useMoney();
  const current = categories.find((category) => category.id === id);
  const [name, setName] = useState(current?.name ?? '');
  const [type, setType] = useState<CategoryInput['type']>(current?.type ?? 'expense');
  const [icon, setIcon] = useState(current?.icon ?? 'restaurant-outline');
  const [color, setColor] = useState(current?.color ?? palette[0]);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Category name required', 'Give this category a clear name.');
      return;
    }
    await saveCategory({ name: name.trim(), type, icon, color }, id);
    router.back();
  }

  async function remove() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete category? Categories with transactions cannot be deleted.')) {
        if (id && await deleteCategory(id)) {
          router.back();
        } else {
          window.alert('Category in use. Reassign or delete its transactions first.');
        }
      }
      return;
    }
    Alert.alert('Delete category?', 'Categories with transactions cannot be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id && await deleteCategory(id)) router.back();
          else Alert.alert('Category in use', 'Reassign or delete its transactions first.');
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title={current ? 'Edit Category' : 'New Category'}
          leftElement={
            <Pressable onPress={() => router.back()} style={s.cancelBtn}>
              <Text style={s.cancel}>Cancel</Text>
            </Pressable>
          }
          rightElement={
            <Pressable onPress={save} style={s.saveBtn}>
              <Text style={s.save}>Save</Text>
            </Pressable>
          }
        />

        <Text style={s.label}>Category Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Health & Fitness"
          placeholderTextColor="#8190A8"
          style={s.input}
        />

        <Text style={s.label}>Category Type</Text>
        <View style={s.row}>
          {(['expense', 'income'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setType(item)}
              style={[s.chip, type === item && s.chipActive]}
            >
              <Text style={[s.chipText, type === item && s.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Category Outline Icon</Text>
        <View style={s.iconGrid}>
          {selectableIcons.map((item) => {
            const isSelected = icon === item;
            return (
              <Pressable
                key={item}
                onPress={() => setIcon(item)}
                style={[
                  s.symbol,
                  isSelected && { borderColor: color, backgroundColor: `${color}25` },
                ]}
              >
                <Ionicons
                  name={item as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={isSelected ? color : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={s.label}>Color Theme</Text>
        <View style={s.row}>
          {palette.map((item) => (
            <Pressable
              key={item}
              onPress={() => setColor(item)}
              style={[s.color, { backgroundColor: item }, color === item && s.colorActive]}
            />
          ))}
        </View>

        {current ? (
          <Pressable onPress={remove} style={s.delete}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} style={{ marginRight: 6 }} />
            <Text style={s.deleteText}>Delete category</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 50 },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  cancel: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: '#1B352E', borderColor: '#2E6955', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  save: { color: colors.income, fontWeight: '800', fontSize: 14 },
  label: { color: colors.muted, marginTop: 22, marginBottom: 9, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: '#374763' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { flex: 1, backgroundColor: colors.surface, padding: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4B5970' },
  chipActive: { borderColor: colors.primary, backgroundColor: '#34436A' },
  chipText: { color: colors.muted, fontWeight: '800', textTransform: 'uppercase' },
  chipTextActive: { color: colors.text },
  symbol: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  color: { width: 36, height: 36, borderRadius: 18 },
  colorActive: { borderWidth: 3, borderColor: colors.text },
  delete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, padding: 14 },
  deleteText: { color: colors.expense, fontWeight: '800', fontSize: 16 },
});
