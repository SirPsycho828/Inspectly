import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { User, UserPlus, ChevronRight, Copy, Shield } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, EmptyState, ListSkeleton, BottomActionBar, Button } from '@/components/ui';
import type { User as AppUser, Firm } from '@/types';
import type { FirmStackParamList } from '@/navigation/FirmNavigator';

type Props = NativeStackScreenProps<FirmStackParamList, 'FirmMemberList'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isAdmin,
  onPress,
}: {
  member: AppUser;
  isAdmin: boolean;
  onPress: () => void;
}) {
  const initials = getInitials(member.displayName);
  const isSuspended = member.status === 'suspended';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.memberCard}>
        <View style={styles.memberRow}>
          {/* Initials avatar */}
          <View style={[styles.avatar, isSuspended && styles.avatarSuspended]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Name / email */}
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {member.displayName}
              </Text>
              {member.role === 'firm_admin' && (
                <View style={styles.adminBadge}>
                  <Shield size={10} color={colors.teal[600]} />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberEmail} numberOfLines={1}>
              {member.email}
            </Text>
          </View>

          {/* Status + chevron */}
          <View style={styles.memberTrailing}>
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
            <ChevronRight size={16} color={colors.slate[400]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Invite Code Card ─────────────────────────────────────────────────────────

function InviteCodeCard({
  code,
  onDismiss,
}: {
  code: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <Card style={styles.inviteCard}>
      <Text style={styles.inviteLabel}>Invite Code</Text>
      <Text style={styles.inviteSubLabel}>
        Share this code with the inspector. It expires in 24 hours.
      </Text>
      <View style={styles.inviteCodeRow}>
        <Text style={styles.inviteCode}>{code}</Text>
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.copyButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Copy size={16} color={copied ? colors.success : colors.teal[600]} />
          <Text style={[styles.copyText, copied && styles.copyTextSuccess]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissLink}>
        <Text style={styles.dismissText}>Done</Text>
      </TouchableOpacity>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FirmMemberListScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [members, setMembers]         = useState<AppUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [inviting, setInviting]       = useState(false);
  const [inviteCode, setInviteCode]   = useState<string | null>(null);

  // ── Load members ────────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!user?.firmId) return;

    try {
      const firmSnap = await firestore()
        .collection(COLLECTIONS.FIRMS)
        .doc(user.firmId)
        .get();

      if (!firmSnap.exists) {
        setError('Firm not found.');
        setLoading(false);
        return;
      }

      const firm = firmSnap.data() as Firm;
      const memberIds = firm.memberIds ?? [];

      if (memberIds.length === 0) {
        setMembers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Firestore 'in' supports up to 30 elements; chunk if needed
      const chunks: string[][] = [];
      for (let i = 0; i < memberIds.length; i += 30) {
        chunks.push(memberIds.slice(i, i + 30));
      }

      const results: AppUser[] = [];
      for (const chunk of chunks) {
        const snap = await firestore()
          .collection(COLLECTIONS.USERS)
          .where(firestore.FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as AppUser));
      }

      // Sort: admin first, then by name
      results.sort((a, b) => {
        if (a.role === 'firm_admin' && b.role !== 'firm_admin') return -1;
        if (b.role === 'firm_admin' && a.role !== 'firm_admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setMembers(results);
      setError(null);
    } catch (err) {
      console.error('FirmMemberList load error:', err);
      setError('Failed to load members. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    loadMembers();
  }, [loadMembers]);

  // ── Generate invite ─────────────────────────────────────────────────────────
  const handleInvite = useCallback(async () => {
    if (!user?.firmId) return;

    setInviting(true);
    setInviteCode(null);

    try {
      const fn = callable('createFirmInvite');
      const result = await fn({ firmId: user.firmId });
      const code = (result.data as { code: string }).code;
      setInviteCode(code);
    } catch (err) {
      console.error('Create invite error:', err);
      Alert.alert('Error', 'Failed to generate invite code. Please try again.');
    } finally {
      setInviting(false);
    }
  }, [user?.firmId]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Invite code panel */}
      {inviteCode && (
        <View style={styles.inviteCardWrapper}>
          <InviteCodeCard
            code={inviteCode}
            onDismiss={() => setInviteCode(null)}
          />
        </View>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={
            members.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.teal[600]}
            />
          }
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              isAdmin={user?.role === 'firm_admin'}
              onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No members yet"
              description="Invite inspectors to join your firm using the button below."
              icon={<User size={48} color={colors.slate[300]} />}
            />
          }
        />
      )}

      {/* Invite button */}
      <BottomActionBar>
        <Button
          title={inviting ? 'Generating...' : 'Invite Inspector'}
          onPress={handleInvite}
          disabled={inviting}
          fullWidth
        />
      </BottomActionBar>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },

  // Error
  errorBanner: {
    backgroundColor: colors.errorBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.severity.critical + '33',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },

  // Invite code panel
  inviteCardWrapper: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  inviteCard: {
    gap: spacing.sm,
    backgroundColor: colors.teal[50],
    borderColor: colors.teal[600] + '40',
  },
  inviteLabel: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  inviteSubLabel: {
    ...typography.caption,
    color: colors.slate[500],
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  inviteCode: {
    ...typography.headingMd,
    color: colors.teal[700],
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  copyText: {
    ...typography.captionMedium,
    color: colors.teal[600],
  },
  copyTextSuccess: {
    color: colors.success,
  },
  dismissLink: {
    alignSelf: 'flex-end',
  },
  dismissText: {
    ...typography.captionMedium,
    color: colors.slate[500],
  },

  // List
  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  emptyContainer: {
    flexGrow: 1,
    padding: spacing.base,
  },

  // Member card
  memberCard: {
    padding: 0,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    minHeight: touchTargets.listItem,
    gap: spacing.sm,
  },

  // Avatar
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal[600],
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarSuspended: {
    backgroundColor: colors.slate[300],
  },
  avatarText: {
    ...typography.bodyMedium,
    color: colors.white,
  },

  // Member info
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  memberName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  memberEmail: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Admin badge
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  adminBadgeText: {
    ...typography.captionMedium,
    color: colors.teal[600],
    fontSize: 10,
  },

  // Trailing
  memberTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },

  // Status badge
  statusBadge: {
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusActive: {
    backgroundColor: colors.successBg,
  },
  statusSuspended: {
    backgroundColor: colors.errorBg,
  },
  statusText: {
    ...typography.captionMedium,
    fontSize: 11,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextSuspended: {
    color: colors.error,
  },
});
