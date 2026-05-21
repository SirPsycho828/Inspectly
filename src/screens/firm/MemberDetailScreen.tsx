import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { User, Mail, Phone, Shield, AlertTriangle, Trash2, Crown } from 'lucide-react-native';

import { colors, typography, spacing, layout } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, Button, LoadingSkeleton } from '@/components/ui';
import type { User as AppUser, Report } from '@/types';
import type { FirmStackParamList } from '@/navigation/FirmNavigator';

type Props = NativeStackScreenProps<FirmStackParamList, 'MemberDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MemberDetailScreen({ route, navigation }: Props) {
  const { memberId } = route.params;
  const { user: currentUser } = useAuthContext();

  const [member, setMember]               = useState<AppUser | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [totalReports, setTotalReports]   = useState<number | null>(null);
  const [totalFindings, setTotalFindings] = useState<number | null>(null);
  const [suspending, setSuspending]       = useState(false);
  const [removing, setRemoving]           = useState(false);
  const [promoting, setPromoting]         = useState(false);

  const isViewingOwnProfile = currentUser?.id === memberId;

  // ── Load member doc ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(memberId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setMember({ id: snap.id, ...snap.data() } as AppUser);
          } else {
            setError('Member not found.');
          }
          setLoading(false);
        },
        (err) => {
          console.error('MemberDetail snapshot error:', err);
          setError('Failed to load member.');
          setLoading(false);
        }
      );
    return unsub;
  }, [memberId]);

  // ── Load stats ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.firmId) return;

    firestore()
      .collection(COLLECTIONS.REPORTS)
      .where('inspectorId', '==', memberId)
      .where('firmId', '==', currentUser.firmId)
      .where('status', '==', 'active')
      .get()
      .then((snap) => {
        setTotalReports(snap.size);
        let findings = 0;
        snap.docs.forEach((d) => {
          const r = d.data() as Report;
          const fc = r.findingCounts;
          findings += (fc.critical + fc.major + fc.minor + fc.informational);
        });
        setTotalFindings(findings);
      })
      .catch((err) => {
        console.error('MemberDetail stats error:', err);
      });
  }, [memberId, currentUser?.firmId]);

  // ── Update header title ──────────────────────────────────────────────────────
  useEffect(() => {
    if (member) {
      navigation.setOptions({ title: member.displayName });
    }
  }, [member, navigation]);

  // ── Suspend / Reinstate ─────────────────────────────────────────────────────
  const handleToggleSuspend = useCallback(() => {
    if (!member || !currentUser?.firmId) return;

    const isSuspended = member.status === 'suspended';
    const action = isSuspended ? 'Reinstate' : 'Suspend';
    const message = isSuspended
      ? `Reinstate ${member.displayName}? They will regain access to the firm.`
      : `Suspend ${member.displayName}? They will lose access to the firm until reinstated.`;

    Alert.alert(action, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: isSuspended ? 'default' : 'destructive',
        onPress: async () => {
          setSuspending(true);
          try {
            if (isSuspended) {
              // Reinstate: direct Firestore write (allowed by security rules for firm admin)
              await firestore()
                .collection(COLLECTIONS.USERS)
                .doc(memberId)
                .update({ status: 'active', updatedAt: firestore.FieldValue.serverTimestamp() });
            } else {
              // Suspend via Cloud Function
              await callable('suspendFirmMember')({
                  firmId: currentUser.firmId,
                  memberId,
                });
            }
          } catch (err) {
            console.error('Toggle suspend error:', err);
            Alert.alert('Error', `Failed to ${action.toLowerCase()} member. Please try again.`);
          } finally {
            setSuspending(false);
          }
        },
      },
    ]);
  }, [member, currentUser?.firmId, memberId]);

  // ── Remove from firm ─────────────────────────────────────────────────────────
  const handleRemove = useCallback(() => {
    if (!member || !currentUser?.firmId) return;

    Alert.alert(
      'Remove from Firm',
      `Remove ${member.displayName} from the firm? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await callable('removeFirmMember')({
                  firmId: currentUser.firmId,
                  memberId,
                });
              navigation.goBack();
            } catch (err) {
              console.error('Remove member error:', err);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
              setRemoving(false);
            }
          },
        },
      ]
    );
  }, [member, currentUser?.firmId, memberId, navigation]);

  // ── Transfer admin ───────────────────────────────────────────────────────────
  const handleMakeAdmin = useCallback(() => {
    if (!member || !currentUser?.firmId) return;

    Alert.alert(
      'Transfer Admin Role',
      `Transfer admin role to ${member.displayName}? You will become a regular inspector and lose admin access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            setPromoting(true);
            try {
              await callable('transferFirmAdmin')({
                  firmId: currentUser.firmId,
                  newAdminId: memberId,
                });
              navigation.goBack();
            } catch (err) {
              console.error('Transfer admin error:', err);
              Alert.alert('Error', 'Failed to transfer admin role. Please try again.');
              setPromoting(false);
            }
          },
        },
      ]
    );
  }, [member, currentUser?.firmId, memberId, navigation]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.skeletonCard}>
            <View style={styles.skeletonAvatar} />
            <LoadingSkeleton width="50%" height={18} style={{ marginTop: spacing.sm }} />
            <LoadingSkeleton width="70%" height={14} style={{ marginTop: spacing.xs }} />
          </Card>
          <Card style={[styles.section, { marginTop: spacing.base }]}>
            <LoadingSkeleton width="100%" height={14} />
            <LoadingSkeleton width="80%" height={14} style={{ marginTop: spacing.sm }} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error ?? 'Member not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuspended = member.status === 'suspended';
  const isMemberAdmin = member.role === 'firm_admin';
  const isCurrentUserAdmin = currentUser?.role === 'firm_admin';

  const initials = getInitials(member.displayName);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={[styles.profileAvatar, isSuspended && styles.profileAvatarSuspended] as ViewStyle[]}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileMeta}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{member.displayName}</Text>
              {isMemberAdmin && (
                <View style={styles.adminBadge}>
                  <Shield size={11} color={colors.teal[600]} />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                isSuspended ? styles.statusSuspended : styles.statusActive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isSuspended ? styles.statusTextSuspended : styles.statusTextActive,
                ]}
              >
                {isSuspended ? 'Suspended' : 'Active'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Contact info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow
            icon={<Mail size={15} color={colors.slate[400]} />}
            label="Email"
            value={member.email}
          />
          <InfoRow
            icon={<Phone size={15} color={colors.slate[400]} />}
            label="Phone"
            value={member.phone}
          />
          <InfoRow
            icon={<Shield size={15} color={colors.slate[400]} />}
            label="License Number"
            value={member.licenseNumber}
          />
        </Card>

        {/* Stats */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {totalReports === null ? '—' : totalReports}
              </Text>
              <Text style={styles.statLabel}>Inspections</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {totalFindings === null ? '—' : totalFindings}
              </Text>
              <Text style={styles.statLabel}>Total Findings</Text>
            </View>
          </View>
        </Card>

        {/* Admin actions (not on own profile, not on other admins) */}
        {isCurrentUserAdmin && !isViewingOwnProfile && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            {/* Suspend / Reinstate */}
            {!isMemberAdmin && (
              <Button
                title={
                  suspending
                    ? 'Updating...'
                    : isSuspended
                    ? 'Reinstate Member'
                    : 'Suspend Member'
                }
                variant={isSuspended ? 'secondary' : 'secondary'}
                onPress={handleToggleSuspend}
                disabled={suspending}
                fullWidth
                style={styles.actionButton}
              />
            )}

            {/* Make Admin */}
            {!isMemberAdmin && (
              <Button
                title={promoting ? 'Transferring...' : 'Make Admin'}
                variant="secondary"
                onPress={handleMakeAdmin}
                disabled={promoting}
                fullWidth
                style={styles.actionButton}
              />
            )}

            {/* Remove from firm */}
            <Button
              title={removing ? 'Removing...' : 'Remove from Firm'}
              variant="destructive"
              onPress={handleRemove}
              disabled={removing}
              fullWidth
              style={styles.actionButton}
            />
          </Card>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing['4xl'],
  },

  // Error / loading
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  skeletonCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.slate[200],
  },

  // Profile card
  profileCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarSuspended: {
    backgroundColor: colors.slate[300],
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.white,
  },
  profileMeta: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileName: {
    ...typography.headingLg,
    color: colors.slate[900],
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  adminBadgeText: {
    ...typography.captionMedium,
    color: colors.teal[600],
    fontSize: 11,
  },
  statusBadge: {
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: colors.successBg,
  },
  statusSuspended: {
    backgroundColor: colors.errorBg,
  },
  statusText: {
    ...typography.captionMedium,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextSuspended: {
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

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoIcon: {
    marginTop: 2,
    width: 20,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.slate[400],
  },
  infoValue: {
    ...typography.body,
    color: colors.slate[900],
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    ...typography.headingXl,
    color: colors.slate[900],
  },
  statLabel: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.slate[200],
  },

  // Action buttons
  actionButton: {
    marginTop: spacing.xs,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
