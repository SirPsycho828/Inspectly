import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Upload, Check, Palette } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { Button, BottomActionBar } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/constants/collections';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'BrandingSetup'>;

// Brand color palette for solo inspectors
const BRAND_COLORS = [
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Forest', hex: '#166534' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Burgundy', hex: '#881337' },
  { name: 'Crimson', hex: '#B91C1C' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Bronze', hex: '#92400E' },
  { name: 'Steel Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#059669' },
];

const CUSTOM_SENTINEL = '__custom__';
const MAX_FOOTER_LENGTH = 200;

export function BrandingSetupScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  // Branding state
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(BRAND_COLORS[3].hex); // Teal default
  const [customHex, setCustomHex] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [footerText, setFooterText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load existing branding from user doc
  useEffect(() => {
    if (!user) return;
    const branding = (user as any).branding;
    if (!branding) return;

    setExistingLogoUrl(branding.logoUrl ?? null);
    if (branding.primaryColor) {
      const preset = BRAND_COLORS.find((c) => c.hex === branding.primaryColor);
      if (preset) {
        setSelectedColor(branding.primaryColor);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        setCustomHex(branding.primaryColor.replace('#', ''));
      }
    }
    setPhone(branding.companyPhone ?? '');
    setEmail(branding.companyEmail ?? '');
    setWebsite(branding.companyWebsite ?? '');
    setFooterText(branding.reportFooterText ?? '');
  }, [user]);

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoUri || !user) return existingLogoUrl;

    setUploadingLogo(true);
    try {
      const ref = storage().ref(`branding/${user.id}/logo.jpg`);
      await ref.putFile(logoUri);
      return await ref.getDownloadURL();
    } finally {
      setUploadingLogo(false);
    }
  };

  const resolvedColor = isCustom
    ? `#${customHex.replace('#', '')}`
    : selectedColor;

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const logoUrl = await uploadLogo();

      const branding = {
        logoUrl,
        primaryColor: resolvedColor,
        companyPhone: phone.trim(),
        companyEmail: email.trim(),
        companyWebsite: website.trim() || null,
        reportFooterText: footerText.trim(),
      };

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(user.id)
        .update({
          branding,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save branding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayLogoUri = logoUri ?? existingLogoUrl ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Upload size={18} color={colors.teal[600]} />
              <Text style={styles.sectionTitle}>Logo</Text>
            </View>

            <View style={styles.logoRow}>
              {displayLogoUri ? (
                <Image source={{ uri: displayLogoUri }} style={styles.logoPreview} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Upload size={28} color={colors.slate[400]} />
                  <Text style={styles.logoPlaceholderText}>No logo</Text>
                </View>
              )}
              <Button
                title={uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                onPress={handlePickLogo}
                variant="secondary"
                disabled={uploadingLogo}
              />
            </View>
            <Text style={styles.helperText}>Recommended: 600×200 px, PNG or JPG. Used on report headers.</Text>
          </View>

          {/* ── Brand Color ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Palette size={18} color={colors.teal[600]} />
              <Text style={styles.sectionTitle}>Brand Color</Text>
            </View>

            <View style={styles.colorGrid}>
              {BRAND_COLORS.map((c) => {
                const active = !isCustom && selectedColor === c.hex;
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[styles.colorSwatch, { backgroundColor: c.hex }, active && styles.colorSwatchActive]}
                    onPress={() => {
                      setSelectedColor(c.hex);
                      setIsCustom(false);
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel={c.name}
                  >
                    {active && <Check size={20} color={colors.white} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}

              {/* Custom option */}
              <TouchableOpacity
                style={[
                  styles.colorSwatch,
                  styles.customSwatch,
                  isCustom && styles.colorSwatchActive,
                ]}
                onPress={() => setIsCustom(true)}
                activeOpacity={0.8}
                accessibilityLabel="Custom color"
              >
                {isCustom ? (
                  <Check size={20} color={colors.slate[700]} strokeWidth={3} />
                ) : (
                  <Text style={styles.customSwatchLabel}>HEX</Text>
                )}
              </TouchableOpacity>
            </View>

            {isCustom && (
              <View style={styles.customHexRow}>
                <Text style={styles.hashSymbol}>#</Text>
                <TextInput
                  style={styles.hexInput}
                  value={customHex}
                  onChangeText={(v) => setCustomHex(v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
                  placeholder="0D9488"
                  placeholderTextColor={colors.slate[400]}
                  autoCapitalize="characters"
                  maxLength={6}
                  returnKeyType="done"
                />
                {customHex.length === 6 && (
                  <View style={[styles.hexPreview, { backgroundColor: `#${customHex}` }]} />
                )}
              </View>
            )}

            <View style={[styles.colorPreviewBar, { backgroundColor: resolvedColor }]} />
            <Text style={styles.helperText}>Used for report accents and headers.</Text>
          </View>

          {/* ── Contact Info ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.label}>Company Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Company Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="hello@mycompany.com"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://mycompany.com"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>

          {/* ── Report Footer ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Report Footer</Text>
            <TextInput
              style={styles.footerInput}
              value={footerText}
              onChangeText={(v) => setFooterText(v.slice(0, MAX_FOOTER_LENGTH))}
              placeholder="e.g. This report is for the exclusive use of the client named above…"
              placeholderTextColor={colors.slate[400]}
              multiline
              maxLength={MAX_FOOTER_LENGTH}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>
              {footerText.length}/{MAX_FOOTER_LENGTH}
            </Text>
          </View>
        </ScrollView>

        <BottomActionBar>
          <Button
            title="Save Branding"
            onPress={handleSave}
            loading={saving || uploadingLogo}
            fullWidth
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: layout.screenPaddingH,
    gap: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Section cards
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    padding: spacing.base,
    gap: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  logoPreview: {
    width: 120,
    height: 48,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[50],
  },
  logoPlaceholder: {
    width: 120,
    height: 48,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  logoPlaceholderText: {
    ...typography.caption,
    color: colors.slate[400],
  },

  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  customSwatch: {
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[300],
  },
  customSwatchLabel: {
    ...typography.captionMedium,
    color: colors.slate[500],
    fontSize: 10,
  },

  // Custom hex
  customHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  hashSymbol: {
    ...typography.bodyMedium,
    color: colors.slate[500],
  },
  hexInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.slate[900],
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  hexPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  colorPreviewBar: {
    height: 8,
    borderRadius: 4,
  },

  // Contact fields
  fieldGroup: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.slate[900],
  },

  // Footer
  footerInput: {
    height: 96,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    padding: spacing.md,
    ...typography.body,
    color: colors.slate[900],
  },
  charCounter: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'right',
  },
  helperText: {
    ...typography.caption,
    color: colors.slate[500],
  },
});
