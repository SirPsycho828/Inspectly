import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { CheckCircle } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { BottomActionBar, Button, ListSkeleton } from '@/components/ui';
import type { ChecklistProgressItem, Inspection } from '@/types';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'ChecklistView'>;

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function SectionProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.round(pct * 100)}%` }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate[200],
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.teal[600],
    borderRadius: 2,
  },
});

// ─── Section structure derived from progress items ────────────────────────────

interface SectionSummary {
  sectionId: string;
  total: number;
  completed: number;      // inspected + skipped + not_applicable
  findingCount: number;   // sum of findingCount across items
  allDone: boolean;
}

// ─── Section Row ──────────────────────────────────────────────────────────────

function SectionRow({
  sectionId,
  summary,
  onPress,
}: {
  sectionId: string;
  summary: SectionSummary;
  onPress: () => void;
}) {
  const progress = summary.total > 0 ? summary.completed / summary.total : 0;
  const hasBadge = summary.findingCount > 0;

  return (
    <TouchableOpacity
      style={rowStyles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={rowStyles.left}>
        {summary.allDone ? (
          <CheckCircle size={20} color={colors.teal[600]} />
        ) : (
          <View style={rowStyles.emptyCircle} />
        )}
      </View>

      <View style={rowStyles.content}>
        <View style={rowStyles.titleRow}>
          <Text style={rowStyles.sectionName} numberOfLines={1}>
            {sectionId}
          </Text>
          {hasBadge && (
            <View style={rowStyles.findingBadge}>
              <Text style={rowStyles.findingBadgeText}>{summary.findingCount}</Text>
            </View>
          )}
        </View>

        <SectionProgressBar progress={progress} />

        <Text style={rowStyles.progressText}>
          {summary.completed} of {summary.total} inspected
        </Text>
      </View>

      {/* Chevron */}
      <Text style={rowStyles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: touchTargets.listItem,
  },
  left: {
    width: 24,
    alignItems: 'center',
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate[300],
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    flex: 1,
  },
  findingBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.severity.criticalBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  findingBadgeText: {
    ...typography.captionMedium,
    color: colors.severity.critical,
  },
  progressText: {
    ...typography.caption,
    color: colors.slate[400],
    marginTop: spacing.xs,
  },
  chevron: {
    fontSize: 20,
    color: colors.slate[400],
    lineHeight: 24,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ChecklistViewScreen({ route, navigation }: Props) {
  const { inspectionId } = route.params;

  const [progressItems,    setProgressItems]    = useState<ChecklistProgressItem[]>([]);
  const [inspection,       setInspection]       = useState<Inspection | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);

  // ── Listen to checklist progress subcollection ─────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChecklistProgressItem));
          setProgressItems(docs);
          setLoading(false);
        },
        (err) => {
          console.error('ChecklistView progress error:', err);
          setError('Failed to load checklist.');
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId]);

  // ── Listen to parent inspection doc (for overall status & header) ──────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) setInspection({ id: snap.id, ...snap.data() } as Inspection);
        },
        (err) => console.error('ChecklistView inspection error:', err)
      );
    return unsub;
  }, [inspectionId]);

  // ── Derive per-section summaries ───────────────────────────────────────────
  const sectionMap = useMemo<Map<string, SectionSummary>>(() => {
    const map = new Map<string, SectionSummary>();
    for (const item of progressItems) {
      const existing = map.get(item.sectionId) ?? {
        sectionId: item.sectionId,
        total: 0,
        completed: 0,
        findingCount: 0,
        allDone: false,
      };
      existing.total++;
      if (item.status !== 'pending') existing.completed++;
      existing.findingCount += item.findingCount;
      map.set(item.sectionId, existing);
    }
    // Mark all-done
    for (const [key, val] of map.entries()) {
      map.set(key, { ...val, allDone: val.total > 0 && val.completed === val.total });
    }
    return map;
  }, [progressItems]);

  // ── Derive ordered section list (preserve original insert order) ───────────
  const orderedSectionIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const item of progressItems) {
      if (!seen.has(item.sectionId)) {
        seen.add(item.sectionId);
        ids.push(item.sectionId);
      }
    }
    return ids;
  }, [progressItems]);

  // ── Overall progress ───────────────────────────────────────────────────────
  const totalItems     = progressItems.length;
  const completedItems = progressItems.filter((i) => i.status !== 'pending').length;
  const allComplete    = totalItems > 0 && completedItems === totalItems;

  // ── Item count for first item in a section (for navigation) ───────────────
  const firstItemInSection = (sectionId: string): string | undefined => {
    return progressItems.find((i) => i.sectionId === sectionId)?.id;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ListSkeleton rows={8} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={orderedSectionIds}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: sectionId }) => {
          const summary = sectionMap.get(sectionId);
          if (!summary) return null;

          return (
            <SectionRow
              sectionId={sectionId}
              summary={summary}
              onPress={() => {
                const firstItem = firstItemInSection(sectionId);
                if (firstItem) {
                  navigation.navigate('ItemDetail', {
                    inspectionId,
                    sectionId,
                    itemId: firstItem,
                  });
                }
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No checklist items found.</Text>
          </View>
        }
      />

      {/* ── Bottom status bar ──────────────────────────────────────────── */}
      <BottomActionBar style={styles.bottomBar}>
        <View style={styles.bottomContent}>
          <View style={styles.bottomLeft}>
            <Text style={styles.bottomCount}>
              {completedItems} / {totalItems} items
            </Text>
            <Text style={styles.bottomSub}>
              {allComplete ? 'All sections complete' : `${totalItems - completedItems} remaining`}
            </Text>
          </View>
          {allComplete && (
            <Button
              title="Review & Publish"
              onPress={() => navigation.navigate('ReportPreview', { inspectionId })}
              style={styles.publishButton}
            />
          )}
        </View>
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

  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
    paddingBottom: touchTargets.bottomActionBar + spacing.xl,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
  },
  emptyText: {
    ...typography.body,
    color: colors.slate[400],
  },

  // Bottom bar
  bottomBar: {
    paddingTop: spacing.sm,
  },
  bottomContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bottomLeft: {
    flex: 1,
  },
  bottomCount: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  bottomSub: {
    ...typography.caption,
    color: colors.slate[400],
    marginTop: 2,
  },
  publishButton: {
    flexShrink: 0,
  },
});
