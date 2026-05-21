import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { Settings, Users, MapPin, Calendar } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, SeverityBadge, EmptyState, ListSkeleton, BottomActionBar, Button } from '@/components/ui';
import type { Report, Firm } from '@/types';
import type { FirmStackParamList } from '@/navigation/FirmNavigator';

type Props = NativeStackScreenProps<FirmStackParamList, 'FirmDashboard'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '';
  const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Activity Row (Admin) ─────────────────────────────────────────────────────

function ActivityRow({ item }: { item: Report }) {
  const { property, inspectorName, findingCounts, publishedAt } = item;

  const hasCritical = findingCounts.critical > 0;
  const hasMajor    = findingCounts.major > 0;
  const hasMinor    = findingCounts.minor > 0;
  const hasInfo     = findingCounts.informational > 0;

  return (
    <Card style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityAddressBlock}>
          <View style={styles.activityAddressRow}>
            <MapPin size={13} color={colors.slate[400]} />
            <Text style={styles.activityAddress} numberOfLines={1}>
              {property.address}
            </Text>
          </View>
          <Text style={styles.activityCity}>
            {property.city}, {property.state}
          </Text>
        </View>
      </View>

      <View style={styles.activityMeta}>
        <Text style={styles.activityInspector}>{inspectorName}</Text>
        <View style={styles.activityDateRow}>
          <Calendar size={12} color={colors.slate[400]} />
          <Text style={styles.activityDate}>{formatDate(publishedAt)}</Text>
        </View>
      </View>

      <View style={styles.badgesRow}>
        {hasCritical && (
          <View style={styles.badgeWithCount}>
            <SeverityBadge severity="critical" />
            <Text style={[styles.badgeCount, { color: colors.severity.critical }]}>
              {findingCounts.critical}
            </Text>
          </View>
        )}
        {hasMajor && (
          <View style={styles.badgeWithCount}>
            <SeverityBadge severity="major" />
            <Text style={[styles.badgeCount, { color: colors.severity.major }]}>
              {findingCounts.major}
            </Text>
          </View>
        )}
        {hasMinor && (
          <View style={styles.badgeWithCount}>
            <SeverityBadge severity="minor" />
            <Text style={[styles.badgeCount, { color: colors.severity.minor }]}>
              {findingCounts.minor}
            </Text>
          </View>
        )}
        {hasInfo && (
          <View style={styles.badgeWithCount}>
            <SeverityBadge severity="informational" />
            <Text style={[styles.badgeCount, { color: colors.severity.info }]}>
              {findingCounts.informational}
            </Text>
          </View>
        )}
        {!hasCritical && !hasMajor && !hasMinor && !hasInfo && (
          <Text style={styles.noFindings}>No findings</Text>
        )}
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FirmDashboardScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [firm, setFirm]             = useState<Firm | null>(null);
  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isAdmin = user?.role === 'firm_admin';

  // ── Load firm doc ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.firmId) return;

    const unsub = firestore()
      .collection(COLLECTIONS.FIRMS)
      .doc(user.firmId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setFirm({ id: snap.id, ...snap.data() } as Firm);
          }
        },
        (err) => {
          console.error('FirmDashboard firm snapshot error:', err);
        }
      );

    return unsub;
  }, [user?.firmId]);

  // ── Load activity feed (admin) or own reports (non-admin) ──────────────────
  useEffect(() => {
    if (!user?.firmId) return;

    let query = firestore()
      .collection(COLLECTIONS.REPORTS)
      .where('status', '==', 'active')
      .orderBy('publishedAt', 'desc')
      .limit(20);

    if (isAdmin) {
      query = query.where('firmId', '==', user.firmId) as typeof query;
    } else {
      query = query
        .where('firmId', '==', user.firmId)
        .where('inspectorId', '==', user.id) as typeof query;
    }

    const unsub = query.onSnapshot(
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
        setReports(docs);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err) => {
        console.error('FirmDashboard reports snapshot error:', err);
        setError('Failed to load activity. Pull down to retry.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsub;
  }, [user?.firmId, user?.id, isAdmin]);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    setTimeout(() => setRefreshing(false), 3000);
  }, []);

  // ── Leave firm (non-admin) ──────────────────────────────────────────────────
  const handleLeaveFirm = useCallback(() => {
    if (!user?.firmId || !user?.id) return;

    Alert.alert(
      'Leave Firm',
      'Are you sure you want to leave this firm? You will lose access to firm features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await callable('removeFirmMember')({
                  firmId: user.firmId,
                  memberId: user.id,
                });
            } catch (err) {
              console.error('Leave firm error:', err);
              Alert.alert('Error', 'Failed to leave firm. Please try again.');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  }, [user]);

  // ── Header right (admin): settings gear ────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('FirmSettings')}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Settings size={22} color={colors.slate[700]} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isAdmin]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const firmName    = firm?.name ?? 'Your Firm';
  const memberCount = firm?.memberCount ?? 0;

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Firm header card */}
      <Card style={styles.firmHeaderCard}>
        <Text style={styles.firmName}>{firmName}</Text>
        {isAdmin && (
          <View style={styles.memberCountRow}>
            <Users size={14} color={colors.slate[500]} />
            <Text style={styles.memberCountText}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        )}
      </Card>

      {/* Admin: "View All Members" row */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.membersRow}
          onPress={() => navigation.navigate('FirmMemberList')}
          activeOpacity={0.7}
        >
          <View style={styles.membersRowLeft}>
            <Users size={18} color={colors.teal[600]} />
            <Text style={styles.membersRowText}>View All Members</Text>
          </View>
          <Text style={styles.membersRowChevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Section label */}
      <Text style={styles.sectionLabel}>
        {isAdmin ? 'Recent Activity' : 'My Reports'}
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          {ListHeader}
          <ListSkeleton rows={4} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={
            reports.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.teal[600]}
            />
          }
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => <ActivityRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              title="No published reports yet"
              description={
                isAdmin
                  ? 'Published reports from your firm will appear here.'
                  : 'Your published reports will appear here.'
              }
            />
          }
        />
      )}

      {/* Non-admin: Leave Firm */}
      {!isAdmin && (
        <BottomActionBar>
          <Button
            title={leaving ? 'Leaving...' : 'Leave Firm'}
            variant="destructive"
            onPress={handleLeaveFirm}
            disabled={leaving}
            fullWidth
          />
        </BottomActionBar>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
  },

  // Header
  headerButton: {
    padding: spacing.xs,
  },

  // List layout
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: spacing.base,
  },
  listHeader: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },

  // Firm header card
  firmHeaderCard: {
    gap: spacing.xs,
  },
  firmName: {
    ...typography.headingLg,
    color: colors.slate[900],
  },
  memberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberCountText: {
    ...typography.body,
    color: colors.slate[500],
  },

  // Members row
  membersRow: {
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
  membersRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  membersRowText: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  membersRowChevron: {
    fontSize: 20,
    color: colors.slate[400],
    lineHeight: 24,
  },

  // Section label
  sectionLabel: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  // Error
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },

  // Activity card
  activityCard: {
    gap: spacing.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityAddressBlock: {
    flex: 1,
    gap: 2,
  },
  activityAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityAddress: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    flex: 1,
  },
  activityCity: {
    ...typography.caption,
    color: colors.slate[500],
    paddingLeft: 17,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityInspector: {
    ...typography.caption,
    color: colors.slate[500],
  },
  activityDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityDate: {
    ...typography.caption,
    color: colors.slate[500],
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  badgeWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeCount: {
    ...typography.captionMedium,
  },
  noFindings: {
    ...typography.caption,
    color: colors.slate[400],
  },
});
