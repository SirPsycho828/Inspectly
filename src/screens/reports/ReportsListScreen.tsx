import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { FileText, Search, MapPin } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, SeverityBadge, EmptyState, ListSkeleton } from '@/components/ui';
import type { Report } from '@/types';
import type { ReportsStackParamList } from '@/navigation/ReportsNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ReportsList'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '';
  const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Report Row ───────────────────────────────────────────────────────────────

function ReportRow({ item, onPress }: { item: Report; onPress: () => void }) {
  const { property, findingCounts, publishedAt, version } = item;

  const hasCritical = findingCounts.critical > 0;
  const hasMajor    = findingCounts.major > 0;
  const hasMinor    = findingCounts.minor > 0;
  const hasInfo     = findingCounts.informational > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View style={styles.rowAddressBlock}>
            <View style={styles.rowAddressRow}>
              <MapPin size={14} color={colors.slate[400]} />
              <Text style={styles.rowAddress} numberOfLines={1}>
                {property.address}
              </Text>
            </View>
            <Text style={styles.rowCity}>
              {property.city}, {property.state} {property.zip}
            </Text>
          </View>
          {version > 1 && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{version}</Text>
            </View>
          )}
        </View>

        <View style={styles.rowMeta}>
          <FileText size={13} color={colors.slate[400]} />
          <Text style={styles.rowDate}>Published {formatDate(publishedAt)}</Text>
        </View>

        <View style={styles.rowBadges}>
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
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ReportsListScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  // ── Firestore real-time subscription ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = firestore()
      .collection(COLLECTIONS.REPORTS)
      .where('inspectorId', '==', user.id)
      .where('status', '==', 'active')
      .orderBy('publishedAt', 'desc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
          setReports(docs);
          setLoading(false);
          setRefreshing(false);
          setError(null);
        },
        (err) => {
          console.error('ReportsList snapshot error:', err);
          setError('Failed to load reports. Pull down to retry.');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return unsub;
  }, [user]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    setTimeout(() => setRefreshing(false), 3000);
  }, []);

  // ── Client-side address filter ─────────────────────────────────────────────
  const filtered = search.trim()
    ? reports.filter((r) =>
        r.property.address.toLowerCase().includes(search.toLowerCase()) ||
        `${r.property.city} ${r.property.state}`.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color={colors.slate[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address"
          placeholderTextColor={colors.slate[400]}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={
            filtered.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.teal[600]}
            />
          }
          renderItem={({ item }) => (
            <ReportRow
              item={item}
              onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No published reports yet"
              description="Published inspection reports will appear here."
              icon={<FileText size={48} color={colors.slate[300]} />}
            />
          }
        />
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate[900],
    height: 36,
    padding: 0,
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

  // List
  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.base,
  },

  // Row card
  rowCard: {
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowAddressBlock: {
    flex: 1,
    gap: 2,
  },
  rowAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowAddress: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    flex: 1,
  },
  rowCity: {
    ...typography.caption,
    color: colors.slate[500],
    paddingLeft: 18, // align under address text (icon width + gap)
  },
  versionBadge: {
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  versionText: {
    ...typography.captionMedium,
    color: colors.teal[700],
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowDate: {
    ...typography.caption,
    color: colors.slate[500],
  },
  rowBadges: {
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
