import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Check, Palette } from 'lucide-react-native';

import { colors, typography, spacing, layout } from '@/constants/theme';
import { COLLECTIONS, STORAGE_PATHS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, Button, BottomActionBar, LoadingSkeleton } from '@/components/ui';
import type { Branding } from '@/types';
import type { FirmStackParamList } from '@/navigation/FirmNavigator';

type Props = NativeStackScreenProps<FirmStackParamList, 'FirmBranding'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_COLORS = [
  { name: 'Navy',       hex: '#1E3A5F' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Forest',     hex: '#166534' },
  { name: 'Teal',       hex: '#0D9488' },
  { name: 'Burgundy',   hex: '#881337' },
  { name: 'Crimson',    hex: '#B91C1C' },
  { name: 'Charcoal',   hex: '#374151' },
  { name: 'Slate',      hex: '#475569' },
  { name: 'Purple',     hex: '#7C3AED' },
  { name: 'Bronze',     hex: '#92400E' },
  { name: 'Steel Blue', hex: '#3B82F6' },
  { name: 'Emerald',    hex: '#059669' },
] as const;

const MAX_FOOTER_LENGTH = 200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{6})$/.test(hex);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FirmBrandingScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>(BRAND_COLORS[0].hex);
  const [customHex, setCustomHex]       = useState('');
  const [showCustom, setShowCustom]     = useState(false);
  const [footerText, setFooterText]     = useState('');

  // ── Load firm branding ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.firmId) return;

    const unsub = firestore()
      .collection(COLLECTIONS.FIRMS)
      .doc(user.firmId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            const branding = snap.data()?.branding as Branding | undefined;
            if (branding) {
              setLogoUrl(branding.logoUrl ?? null);
              setPrimaryColor(branding.primaryColor ?? BRAND_COLORS[0].hex);
              setFooterText(branding.reportFooterText ?? '');

              // If saved color is not in preset list, show custom
              const isPreset = BRAND_COLORS.some((c) => c.hex === branding.primaryColor);
              if (!isPreset && branding.primaryColor) {
                setShowCustom(true);
                setCustomHex(branding.primaryColor);
              }
            }
          }
          setLoading(false);
        },
        (err) => {
          console.error('FirmBranding snapshot error:', err);
          setError('Failed to load branding settings.');
          setLoading(false);
        }
      );

    return unsub;
  }, [user?.firmId]);

  // ── Upload logo ───────────────────────────────────────────────────────────────
  const handleUploadLogo = useCallback(async () => {
    if (!user?.firmId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingLogo(true);
    try {
      const uri = result.assets[0].uri;
      const storagePath = STORAGE_PATHS.FIRM_BRANDING_LOGO(user.firmId) + '.jpg';
      const ref = storage().ref(storagePath);

      await ref.putFile(uri);
      const downloadUrl = await ref.getDownloadURL();
      setLogoUrl(downloadUrl);
    } catch (err) {
      console.error('Logo upload error:', err);
      Alert.alert('Upload Failed', 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  }, [user?.firmId]);

  // ── Select preset color ───────────────────────────────────────────────────────
  const handleSelectPreset = useCallback((hex: string) => {
    setPrimaryColor(hex);
    setShowCustom(false);
    setCustomHex('');
  }, []);

  // ── Apply custom hex ──────────────────────────────────────────────────────────
  const handleApplyCustom = useCallback(() => {
    const normalized = customHex.startsWith('#') ? customHex : `#${customHex}`;
    if (!isValidHex(normalized)) {
      Alert.alert('Invalid Color', 'Please enter a valid hex color (e.g. #1A2B3C).');
      return;
    }
    setPrimaryColor(normalized);
  }, [customHex]);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?.firmId) return;

    setSaving(true);
    setError(null);

    try {
      await firestore()
        .collection(COLLECTIONS.FIRMS)
        .doc(user.firmId)
        .update({
          'branding.logoUrl': logoUrl,
          'branding.primaryColor': primaryColor,
          'branding.reportFooterText': footerText.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error('FirmBranding save error:', err);
      setError('Failed to save branding. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.firmId, logoUrl, primaryColor, footerText]);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.section}>
            <LoadingSkeleton width="30%" height={14} />
            <LoadingSkeleton width="100%" height={80} style={{ marginTop: spacing.sm }} borderRadius={layout.borderRadius} />
          </Card>
          <Card style={[styles.section, { marginTop: spacing.base }]}>
            <LoadingSkeleton width="30%" height={14} />
            <View style={styles.colorGridSkeleton}>
              {Array.from({ length: 12 }).map((_, i) => (
                <LoadingSkeleton key={i} width={44} height={44} borderRadius={22} />
              ))}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const footerRemaining = MAX_FOOTER_LENGTH - footerText.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Logo section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Upload size={16} color={colors.slate[500]} />
              <Text style={styles.sectionTitle}>Logo</Text>
            </View>

            {logoUrl ? (
              <View style={styles.logoPreviewContainer}>
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.logoPreview}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.logoPlaceholder}>
                <Upload size={24} color={colors.slate[400]} />
                <Text style={styles.logoPlaceholderText}>No logo uploaded</Text>
              </View>
            )}

            <Button
              title={uploadingLogo ? 'Uploading...' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
              variant="secondary"
              onPress={handleUploadLogo}
              disabled={uploadingLogo}
              fullWidth
            />
            {uploadingLogo && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={colors.teal[600]} />
                <Text style={styles.uploadingText}>Uploading logo...</Text>
              </View>
            )}
          </Card>

          {/* Color picker */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Palette size={16} color={colors.slate[500]} />
              <Text style={styles.sectionTitle}>Brand Color</Text>
            </View>

            <Text style={styles.colorPreviewLabel}>Selected</Text>
            <View style={styles.colorPreviewRow}>
              <View style={[styles.colorPreviewSwatch, { backgroundColor: primaryColor }]} />
              <Text style={styles.colorPreviewHex}>{primaryColor}</Text>
            </View>

            <View style={styles.colorGrid}>
              {BRAND_COLORS.map((c) => {
                const isSelected = primaryColor === c.hex && !showCustom;
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c.hex },
                      isSelected && styles.colorSwatchSelected,
                    ] as ViewStyle[]}
                    onPress={() => handleSelectPreset(c.hex)}
                    accessibilityLabel={c.name}
                  >
                    {isSelected && <Check size={16} color={colors.white} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}

              {/* Custom color toggle */}
              <TouchableOpacity
                style={[
                  styles.colorSwatch,
                  styles.colorSwatchCustom,
                  showCustom && styles.colorSwatchSelected,
                ] as ViewStyle[]}
                onPress={() => setShowCustom((v) => !v)}
                accessibilityLabel="Custom color"
              >
                <Text style={styles.customSwatchLabel}>#</Text>
              </TouchableOpacity>
            </View>

            {/* Custom hex input */}
            {showCustom && (
              <View style={styles.customHexRow}>
                <Text style={styles.customHexHash}>#</Text>
                <TextInput
                  style={styles.customHexInput}
                  value={customHex.replace(/^#/, '')}
                  onChangeText={(t) => setCustomHex(t.replace(/^#/, ''))}
                  placeholder="1A2B3C"
                  placeholderTextColor={colors.slate[400]}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleApplyCustom}
                />
                <TouchableOpacity
                  style={styles.customHexApply}
                  onPress={handleApplyCustom}
                >
                  <Text style={styles.customHexApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Report footer text */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Report Footer Text</Text>
            <Text style={styles.footerHint}>
              Appears at the bottom of every published report.
            </Text>
            <View style={styles.footerInputContainer}>
              <TextInput
                style={styles.footerInput}
                value={footerText}
                onChangeText={(t) => {
                  if (t.length <= MAX_FOOTER_LENGTH) setFooterText(t);
                }}
                placeholder="e.g. This report is for the sole use of the client..."
                placeholderTextColor={colors.slate[400]}
                multiline
                numberOfLines={4}
                maxLength={MAX_FOOTER_LENGTH}
                returnKeyType="default"
              />
            </View>
            <Text style={[styles.charCount, footerRemaining < 20 && styles.charCountWarning]}>
              {footerRemaining} characters remaining
            </Text>
          </Card>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <BottomActionBar>
          <Button
            title={saving ? 'Saving...' : 'Save Branding'}
            onPress={handleSave}
            disabled={saving || uploadingLogo}
            fullWidth
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing['4xl'],
  },

  // Error
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.severity.critical + '33',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },

  // Section card
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Logo
  logoPreviewContainer: {
    height: 80,
    backgroundColor: colors.slate[100],
    borderRadius: layout.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '90%',
    height: '90%',
  },
  logoPlaceholder: {
    height: 80,
    backgroundColor: colors.slate[100],
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoPlaceholderText: {
    ...typography.caption,
    color: colors.slate[400],
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  uploadingText: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Color picker
  colorPreviewLabel: {
    ...typography.caption,
    color: colors.slate[500],
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorPreviewSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  colorPreviewHex: {
    ...typography.bodyMedium,
    color: colors.slate[700],
    fontFamily: 'monospace',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  colorGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.slate[900],
  },
  colorSwatchCustom: {
    backgroundColor: colors.slate[200],
  },
  customSwatchLabel: {
    ...typography.headingMd,
    color: colors.slate[600],
  },

  // Custom hex input
  customHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  customHexHash: {
    ...typography.bodyMedium,
    color: colors.slate[500],
  },
  customHexInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate[900],
    fontFamily: 'monospace',
    letterSpacing: 1,
    height: 44,
    padding: 0,
  },
  customHexApply: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.teal[600],
    borderRadius: layout.borderRadius - 2,
  },
  customHexApplyText: {
    ...typography.captionMedium,
    color: colors.white,
  },

  // Footer text
  footerHint: {
    ...typography.caption,
    color: colors.slate[500],
  },
  footerInputContainer: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.slate[50],
  },
  footerInput: {
    ...typography.body,
    color: colors.slate[900],
    padding: spacing.sm,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'right',
  },
  charCountWarning: {
    color: colors.severity.major,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
