import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import {
  SeverityBadge,
  BottomActionBar,
  Button,
  Card,
  LoadingSkeleton,
} from '@/components/ui';
import type { ChecklistItemStatus, ChecklistProgressItem, Finding } from '@/types';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'ItemDetail'>;

// ─── Status selector options ──────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: ChecklistItemStatus;
  label: string;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    value: 'inspected',
    label: 'Inspected',
    activeColor: colors.teal[700],
    activeBg: colors.teal[50],
  },
  {
    value: 'skipped',
    label: 'Skipped',
    activeColor: colors.severity.major,
    activeBg: colors.severity.majorBg,
  },
  {
    value: 'not_applicable',
    label: 'N/A',
    activeColor: colors.slate[500],
    activeBg: colors.slate[100],
  },
  {
    value: 'pending',
    label: 'Reset',
    activeColor: colors.slate[400],
    activeBg: colors.slate[50],
  },
];

// ─── Finding Row ──────────────────────────────────────────────────────────────

function FindingRow({
  finding,
  onPress,
}: {
  finding: Finding;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={findingStyles.row}>
        <View style={findingStyles.left}>
          <SeverityBadge severity={finding.severity} />
        </View>
        <View style={findingStyles.content}>
          <Text style={findingStyles.component}>{finding.component}</Text>
          <Text style={findingStyles.narrative} numberOfLines={2}>
            {finding.narrative}
          </Text>
        </View>
        {finding.photos.length > 0 && (
          <View style={findingStyles.photoChip}>
            <Camera size={12} color={colors.slate[500]} />
            <Text style={findingStyles.photoCount}>{finding.photos.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const findingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  left: {
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  component: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    marginBottom: 2,
  },
  narrative: {
    ...typography.caption,
    color: colors.slate[500],
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.slate[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  photoCount: {
    ...typography.captionMedium,
    color: colors.slate[500],
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ItemDetailScreen({ route, navigation }: Props) {
  const { inspectionId, sectionId, itemId } = route.params;

  const [progressItem,   setProgressItem]   = useState<ChecklistProgressItem | null>(null);
  const [allSectionItems, setAllSectionItems] = useState<ChecklistProgressItem[]>([]);
  const [findings,       setFindings]       = useState<Finding[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [savingStatus,   setSavingStatus]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // ── Load current item ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
      .doc(itemId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setProgressItem({ id: snap.id, ...snap.data() } as ChecklistProgressItem);
          }
          setLoading(false);
        },
        (err) => {
          console.error('ItemDetail progress error:', err);
          setError('Failed to load item.');
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId, itemId]);

  // ── Load all items in this section (for prev/next navigation) ─────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
      .where('sectionId', '==', sectionId)
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChecklistProgressItem));
          setAllSectionItems(docs);
        },
        (err) => console.error('ItemDetail section items error:', err)
      );
    return unsub;
  }, [inspectionId, sectionId]);

  // ── Load findings for this item ────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.FINDINGS(inspectionId))
      .where('checklistItemId', '==', itemId)
      .orderBy('order', 'asc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finding));
          setFindings(docs);
        },
        (err) => console.error('ItemDetail findings error:', err)
      );
    return unsub;
  }, [inspectionId, itemId]);

  // ── Update header with prev/next arrows ───────────────────────────────────
  const currentIndex = useMemo(
    () => allSectionItems.findIndex((i) => i.id === itemId),
    [allSectionItems, itemId]
  );
  const prevItem = currentIndex > 0 ? allSectionItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allSectionItems.length - 1 ? allSectionItems[currentIndex + 1] : null;

  useEffect(() => {
    navigation.setOptions({
      headerLeft: prevItem
        ? () => (
            <TouchableOpacity
              onPress={() =>
                navigation.replace('ItemDetail', {
                  inspectionId,
                  sectionId,
                  itemId: prevItem.id,
                })
              }
              hitSlop={12}
              style={{ marginRight: spacing.sm }}
            >
              <ChevronLeft size={24} color={colors.slate[700]} />
            </TouchableOpacity>
          )
        : undefined,
      headerRight: nextItem
        ? () => (
            <TouchableOpacity
              onPress={() =>
                navigation.replace('ItemDetail', {
                  inspectionId,
                  sectionId,
                  itemId: nextItem.id,
                })
              }
              hitSlop={12}
              style={{ marginLeft: spacing.sm }}
            >
              <ChevronRight size={24} color={colors.slate[700]} />
            </TouchableOpacity>
          )
        : undefined,
      title: progressItem?.itemLabel ?? 'Item Detail',
    });
  }, [prevItem, nextItem, progressItem, inspectionId, sectionId, navigation]);

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (newStatus: ChecklistItemStatus) => {
      if (!progressItem || savingStatus) return;
      setSavingStatus(true);
      setError(null);
      try {
        await firestore()
          .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
          .doc(itemId)
          .update({
            status: newStatus,
            inspectedAt: newStatus !== 'pending' ? firestore.Timestamp.now() : null,
            updatedAt: firestore.Timestamp.now(),
          });

        // If all items in this section are now complete, trigger section review
        // (check after a brief tick to let the snapshot update)
        if (newStatus !== 'pending') {
          setTimeout(() => {
            const updated = allSectionItems.map((i) =>
              i.id === itemId ? { ...i, status: newStatus } : i
            );
            const sectionComplete = updated.every((i) => i.status !== 'pending');
            if (sectionComplete) {
              navigation.navigate('SectionReview', { inspectionId, sectionId });
            }
          }, 150);
        }
      } catch (err) {
        console.error('Status update error:', err);
        setError('Failed to save status. Tap to retry.');
      } finally {
        setSavingStatus(false);
      }
    },
    [progressItem, savingStatus, inspectionId, itemId, allSectionItems, sectionId, navigation]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={{ padding: spacing.base, gap: spacing.base }}>
          <LoadingSkeleton height={60} />
          <LoadingSkeleton height={100} />
          <LoadingSkeleton height={80} />
        </View>
      </SafeAreaView>
    );
  }

  if (!progressItem) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Item not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = progressItem.status;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Item label ──────────────────────────────────────────────── */}
        <View style={styles.itemHeader}>
          <Text style={styles.itemLabel}>{progressItem.itemLabel}</Text>
          <Text style={styles.itemSection}>{sectionId}</Text>
        </View>

        {/* ── Status selector ─────────────────────────────────────────── */}
        <Card>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = currentStatus === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusOption,
                    isActive && {
                      backgroundColor: opt.activeBg,
                      borderColor: opt.activeColor,
                    },
                  ]}
                  onPress={() => handleStatusChange(opt.value)}
                  disabled={savingStatus}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      isActive && { color: opt.activeColor, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── Findings list ────────────────────────────────────────────── */}
        <Card>
          <View style={styles.findingsHeader}>
            <Text style={styles.sectionTitle}>
              Findings {findings.length > 0 ? `(${findings.length})` : ''}
            </Text>
          </View>

          {findings.length === 0 ? (
            <Text style={styles.noFindings}>No findings for this item.</Text>
          ) : (
            findings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                onPress={() =>
                  navigation.navigate('FindingEntry', {
                    inspectionId,
                    findingId: f.id,
                    checklistItemId: itemId,
                    sectionId,
                  })
                }
              />
            ))
          )}
        </Card>

        {/* Navigation indicator */}
        <View style={styles.navIndicator}>
          <Text style={styles.navText}>
            Item {currentIndex + 1} of {allSectionItems.length}
          </Text>
        </View>

        <View style={{ height: touchTargets.bottomActionBar + spacing.base }} />
      </ScrollView>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <BottomActionBar>
        <Button
          title="Add Finding"
          onPress={() =>
            navigation.navigate('FindingEntry', {
              inspectionId,
              checklistItemId: itemId,
              sectionId,
            })
          }
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
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
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

  itemHeader: {
    paddingVertical: spacing.xs,
  },
  itemLabel: {
    ...typography.headingLg,
    color: colors.slate[900],
  },
  itemSection: {
    ...typography.caption,
    color: colors.slate[400],
    marginTop: 4,
  },

  sectionTitle: {
    ...typography.headingMd,
    color: colors.slate[700],
    marginBottom: spacing.md,
  },

  // Status grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    minWidth: '40%',
    height: touchTargets.minimum,
    borderRadius: layout.borderRadius,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  statusOptionText: {
    ...typography.bodyMedium,
    color: colors.slate[500],
  },

  // Findings
  findingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noFindings: {
    ...typography.body,
    color: colors.slate[400],
    paddingVertical: spacing.sm,
  },

  navIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  navText: {
    ...typography.caption,
    color: colors.slate[400],
  },
});
