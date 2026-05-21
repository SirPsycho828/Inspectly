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
import { ClipboardList, Plus, Search } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Card,
  SeverityBadge,
  EmptyState,
  ListSkeleton,
} from '@/components/ui';
import type { Inspection } from '@/types';
import type { InspectionsStackParamList } from '@/navigation/InspectionsNavigator';

type Props = NativeStackScreenProps<InspectionsStackParamList, 'InspectionsList'>;

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Inspection['status'] }) {
  const config: Record<Inspection['status'], { label: string; color: string; bg: string }> = {
    draft:       { label: 'Draft',       color: colors.slate[500], bg: colors.slate[100] },
    in_progress: { label: 'In Progress', color: colors.teal[700],  bg: colors.teal[50]   },
    review:      { label: 'Review',      color: colors.severity.major, bg: colors.severity.majorBg },
    published:   { label: 'Published',   color: colors.success,    bg: colors.successBg  },
  };
  const c = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

// ─── Inspection Row ───────────────────────────────────────────────────────────

function InspectionRow({
  item,
  onPress,
}: {
  item: Inspection;
  onPress: () => void;
}) {
  const { property, findingCounts, status } = item;
  const hasCritical = findingCounts.critical > 0;
  const hasMajor    = findingCounts.major > 0;
  const hasMinor    = findingCounts.minor > 0;
  const hasInfo     = findingCounts.informational > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View style={styles.rowAddressBlock}>
            <Text style={styles.rowAddress} numberOfLines={1}>
              {property.address}
            </Text>
            <Text style={styles.rowCity}>
              {property.city}, {property.state} {property.zip}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>

        {(hasCritical || hasMajor || hasMinor || hasInfo) ? (
          <View style={styles.rowBadges}>
            {hasCritical && <SeverityBadge severity="critical" />}
            {hasMajor    && <SeverityBadge severity="major" />}
            {hasMinor    && <SeverityBadge severity="minor" />}
            {hasInfo     && <SeverityBadge severity="informational" />}
          </View>
        ) : (
          <Text style={styles.rowNoFindings}>No findings recorded</Text>
        )}

        <View style={styles.rowProgress}>
          <Text style={styles.rowProgressText}>
            {item.checklistProgress.completed} / {item.checklistProgress.total} items completed
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Text style={styles.sectionHeaderCount}>{count}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ListEntry =
  | { type: 'section-header'; id: string; title: string; count: number }
  | { type: 'inspection'; id: string; item: Inspection };

export function InspectionsListScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');

  // ── Firestore subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .where('inspectorId', '==', user.id)
      .orderBy('updatedAt', 'desc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inspection));
          setInspections(docs);
          setLoading(false);
          setRefreshing(false);
          setError(null);
        },
        (err) => {
          console.error('InspectionsList snapshot error:', err);
          setError('Failed to load inspections. Pull down to retry.');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return unsub;
  }, [user]);

  // ── Pull-to-refresh (re-mount the listener by toggling a key is not needed
  //    since Firestore streams are live; we just clear the error visually) ────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    // The listener is already live; refreshing flag clears on next snapshot
    // If there's no internet, clear after 3 s to avoid hanging spinner
    setTimeout(() => setRefreshing(false), 3000);
  }, []);

  // ── Filter by search query ─────────────────────────────────────────────────
  const filtered = search.trim()
    ? inspections.filter(
        (i) =>
          i.property.address.toLowerCase().includes(search.toLowerCase()) ||
          i.clientName.toLowerCase().includes(search.toLowerCase())
      )
    : inspections;

  const active  = filtered.filter((i) => i.status === 'in_progress' || i.status === 'draft');
  const recent  = filtered.filter((i) => i.status === 'published' || i.status === 'review');

  // ── Build flat list data with section headers ──────────────────────────────
  const listData: ListEntry[] = [];

  if (active.length > 0) {
    listData.push({ type: 'section-header', id: 'header-active', title: 'Active', count: active.length });
    active.forEach((i) => listData.push({ type: 'inspection', id: i.id, item: i }));
  }
  if (recent.length > 0) {
    listData.push({ type: 'section-header', id: 'header-recent', title: 'Recent', count: recent.length });
    recent.forEach((i) => listData.push({ type: 'inspection', id: i.id, item: i }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color={colors.slate[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address or client"
          placeholderTextColor={colors.slate[400]}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Inline error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <ListSkeleton rows={6} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={
            listData.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.teal[600]}
            />
          }
          renderItem={({ item: entry }) => {
            if (entry.type === 'section-header') {
              return <SectionHeader title={entry.title} count={entry.count} />;
            }
            const inspection = entry.item;
            return (
              <InspectionRow
                item={inspection}
                onPress={() => {
                  if (inspection.status === 'in_progress' || inspection.status === 'draft') {
                    navigation.navigate('ActiveInspection', { inspectionId: inspection.id });
                  } else {
                    navigation.navigate('InspectionDetail', { inspectionId: inspection.id });
                  }
                }}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No inspections yet"
              description="Tap the + button to start your first inspection."
              icon={<ClipboardList size={48} color={colors.slate[300]} />}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('InspectionSetup')}
        activeOpacity={0.85}
      >
        <Plus size={28} color={colors.white} />
      </TouchableOpacity>
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
  searchIcon: {
    flexShrink: 0,
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
    paddingBottom: spacing['4xl'] + spacing['2xl'], // space for FAB
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.base,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  sectionHeaderTitle: {
    ...typography.headingMd,
    color: colors.slate[700],
  },
  sectionHeaderCount: {
    ...typography.captionMedium,
    color: colors.slate[400],
    backgroundColor: colors.slate[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
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
  },
  rowAddress: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  rowCity: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },
  rowBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rowNoFindings: {
    ...typography.caption,
    color: colors.slate[400],
  },
  rowProgress: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: spacing.sm,
  },
  rowProgressText: {
    ...typography.caption,
    color: colors.slate[400],
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: layout.pillRadius,
    flexShrink: 0,
  },
  statusBadgeText: {
    ...typography.captionMedium,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: touchTargets.primaryButton,
    height: touchTargets.primaryButton,
    borderRadius: touchTargets.primaryButton / 2,
    backgroundColor: colors.teal[600],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
