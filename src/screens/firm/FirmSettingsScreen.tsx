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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { Building2, ChevronRight, Trash2 } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, Button, BottomActionBar, LoadingSkeleton } from '@/components/ui';
import type { Firm, FirmInvite } from '@/types';
import type { FirmStackParamList } from '@/navigation/FirmNavigator';

type Props = NativeStackScreenProps<FirmStackParamList, 'FirmSettings'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(ts: any): string {
  if (!ts) return '';
  const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
  return 'Expires ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.slate[400]}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FirmSettingsScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [invites, setInvites]     = useState<FirmInvite[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [firmName, setFirmName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [website, setWebsite]         = useState('');

  // ── Load firm ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.firmId) return;

    const unsub = firestore()
      .collection(COLLECTIONS.FIRMS)
      .doc(user.firmId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            const firm = { id: snap.id, ...snap.data() } as Firm;
            setFirmName(firm.name ?? '');
            setPhone(firm.branding?.companyPhone ?? '');
            setEmail(firm.branding?.companyEmail ?? '');
            setWebsite(firm.branding?.companyWebsite ?? '');
          }
          setLoading(false);
        },
        (err) => {
          console.error('FirmSettings firm snapshot error:', err);
          setError('Failed to load firm settings.');
          setLoading(false);
        }
      );

    return unsub;
  }, [user?.firmId]);

  // ── Load active invites ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.firmId) return;

    const now = firestore.Timestamp.now();

    const unsub = firestore()
      .collection(COLLECTIONS.FIRM_INVITES(user.firmId))
      .where('usedBy', '==', null)
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'asc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirmInvite));
          setInvites(docs);
        },
        (err) => {
          console.error('FirmSettings invites snapshot error:', err);
        }
      );

    return unsub;
  }, [user?.firmId]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?.firmId) return;
    if (!firmName.trim()) {
      Alert.alert('Validation', 'Firm name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await firestore()
        .collection(COLLECTIONS.FIRMS)
        .doc(user.firmId)
        .update({
          name: firmName.trim(),
          'branding.companyPhone': phone.trim(),
          'branding.companyEmail': email.trim(),
          'branding.companyWebsite': website.trim() || null,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error('FirmSettings save error:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.firmId, firmName, phone, email, website]);

  // ── Delete invite ────────────────────────────────────────────────────────────
  const handleDeleteInvite = useCallback(
    (invite: FirmInvite) => {
      if (!user?.firmId) return;

      Alert.alert('Delete Invite', `Delete invite code ${invite.code}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(invite.id);
            try {
              await firestore()
                .collection(COLLECTIONS.FIRM_INVITES(user.firmId!))
                .doc(invite.id)
                .delete();
            } catch (err) {
              console.error('Delete invite error:', err);
              Alert.alert('Error', 'Failed to delete invite.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    [user?.firmId]
  );

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.section}>
            <LoadingSkeleton width="40%" height={14} />
            <LoadingSkeleton width="100%" height={44} style={{ marginTop: spacing.sm }} />
            <LoadingSkeleton width="100%" height={44} style={{ marginTop: spacing.sm }} />
            <LoadingSkeleton width="100%" height={44} style={{ marginTop: spacing.sm }} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

          {/* Firm details */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Firm Details</Text>
            <FieldRow
              label="Firm Name"
              value={firmName}
              onChangeText={setFirmName}
              placeholder="Enter firm name"
              autoCapitalize="words"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              label="Company Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              label="Company Email"
              value={email}
              onChangeText={setEmail}
              placeholder="info@firm.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.fieldDivider} />
            <FieldRow
              label="Website"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://www.firm.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </Card>

          {/* Branding row */}
          <TouchableOpacity
            style={styles.brandingRow}
            onPress={() => navigation.navigate('FirmBranding')}
            activeOpacity={0.7}
          >
            <View style={styles.brandingRowLeft}>
              <Building2 size={18} color={colors.teal[600]} />
              <View>
                <Text style={styles.brandingRowTitle}>Branding</Text>
                <Text style={styles.brandingRowSub}>Logo, colors, report footer</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.slate[400]} />
          </TouchableOpacity>

          {/* Active invites */}
          {invites.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Active Invites</Text>
              {invites.map((invite, index) => (
                <View key={invite.id}>
                  {index > 0 && <View style={styles.fieldDivider} />}
                  <View style={styles.inviteRow}>
                    <View style={styles.inviteInfo}>
                      <Text style={styles.inviteCode}>{invite.code}</Text>
                      <Text style={styles.inviteExpiry}>{formatExpiry(invite.expiresAt)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteInvite(invite)}
                      disabled={deletingId === invite.id}
                      style={styles.deleteInviteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {deletingId === invite.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Trash2 size={16} color={colors.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <BottomActionBar>
          <Button
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={saving}
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
  sectionTitle: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },

  // Field row
  fieldRow: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.captionMedium,
    color: colors.slate[700],
  },
  fieldInput: {
    ...typography.body,
    color: colors.slate[900],
    height: 44,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.sm,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginVertical: spacing.xs,
  },

  // Branding row
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    minHeight: touchTargets.listItem,
  },
  brandingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandingRowTitle: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  brandingRowSub: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Invite rows
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  inviteInfo: {
    gap: 2,
  },
  inviteCode: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  inviteExpiry: {
    ...typography.caption,
    color: colors.slate[500],
  },
  deleteInviteButton: {
    padding: spacing.xs,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
