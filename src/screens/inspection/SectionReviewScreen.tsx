import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { CheckCircle } from 'lucide-react-native';

import { colors, typography, spacing, layout, severityConfig, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import {
  SeverityBadge,
  BottomActionBar,
  Button,
  Card,
  LoadingSkeleton,
} from '@/components/ui';
import type { ChecklistProgressItem, Finding, Severity } from '@/types';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'SectionReview'>;

const SEVERITY_ORDER: Severity[] = ['critical', 'major', 'minor', 'informational'];

// ─── Finding Row ──────────────────────────────────────────────────────────────

function ReviewFindingRow({
  finding,
  onPress,
}: {
  finding: Finding;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={rowStyles.row}>
        <SeverityBadge severity={finding.severity} />
        <View style={rowStyles.content}>
          <Text style={rowStyles.component}>{finding.component}</Text>
          <Text style={rowStyles.narrative} numberOfLines={2}>
            {finding.narrative}
          </Text>
        </View>
        {finding.photos.length > 0 && (
          <Text style={rowStyles.photoCount}>{finding.photos.length} photo{finding.photos.length !== 1 ? 's' : ''}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
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
  photoCount: {
    ...typography.caption,
    color: colors.slate[400],
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});

// ─── Severity section ─────────────────────────────────────────────────────────

function SeverityGroup({
  severity,
  findings,
  onPressFinding,
}: {
  severity: Severity;
  findings: Finding[];
  onPressFinding: (f: Finding) => void;
}) {
  if (findings.length === 0) return null;
  const cfg = severityConfig[severity];
  return (
    <View style={groupStyles.wrapper}>
      <View style={[groupStyles.header, { backgroundColor: cfg.bg }]}>
        <Text style={[groupStyles.headerText, { color: cfg.color }]}>
          {cfg.label} · {findings.length}
        </Text>
      </View>
      {findings.map((f) => (
        <ReviewFindingRow key={f.id} finding={f} onPress={() => onPressFinding(f)} />
      ))}
    </View>
  );
}

const groupStyles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.borderRadius,
    marginBottom: spacing.xs,
  },
  headerText: {
    ...typography.captionMedium,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function SectionReviewScreen({ route, navigation }: Props) {
  const { inspectionId, sectionId } = route.params;

  const [progressItems, setProgressItems] = useState<ChecklistProgressItem[]>([]);
  const [findings,      setFindings]      = useState<Finding[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [confirming,    setConfirming]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ── Load section progress items ────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
      .where('sectionId', '==', sectionId)
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChecklistProgressItem));
          setProgressItems(docs);
          setLoading(false);
        },
        (err) => {
          console.error('SectionReview progress error:', err);
          setError('Failed to load section data.');
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId, sectionId]);

  // ── Load all findings for this section ────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.FINDINGS(inspectionId))
      .where('sectionId', '==', sectionId)
      .orderBy('order', 'asc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finding));
          setFindings(docs);
        },
        (err) => console.error('SectionReview findings error:', err)
      );
    return unsub;
  }, [inspectionId, sectionId]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const inspectedCount      = progressItems.filter((i) => i.status === 'inspected').length;
  const skippedCount        = progressItems.filter((i) => i.status === 'skipped').length;
  const notApplicableCount  = progressItems.filter((i) => i.status === 'not_applicable').length;

  const findingsBySeverity = useMemo(() => {
    const map: Record<Severity, Finding[]> = {
      critical:      [],
      major:         [],
      minor:         [],
      informational: [],
    };
    for (const f of findings) {
      map[f.severity].push(f);
    }
    return map;
  }, [findings]);

  const totalFindings = findings.length;

  // ── "Confirm Section" just navigates back to the checklist view ───────────
  //    In a full implementation, this would write a section-confirmed flag to
  //    Firestore to suppress the mini-review on subsequent visits.
  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      // Navigate back to ChecklistView
      navigation.navigate('ChecklistView', { inspectionId });
    } catch (err) {
      console.error('Confirm section error:', err);
      setError('Something went wrong. Try again.');
      setConfirming(false);
    }
  };

  const handleKeepEditing = () => {
    const firstItem = progressItems[0];
    if (firstItem) {
      navigation.navigate('ItemDetail', {
        inspectionId,
        sectionId,
        itemId: firstItem.id,
      });
    } else {
      navigation.goBack();
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={{ padding: spacing.base, gap: spacing.base }}>
          <LoadingSkeleton height={80} />
          <LoadingSkeleton height={120} />
          <LoadingSkeleton height={100} />
        </View>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Section complete indicator ───────────────────────────────── */}
        <View style={styles.completeHeader}>
          <CheckCircle size={32} color={colors.teal[600]} />
          <Text style={styles.completeTitle}>Section Complete</Text>
          <Text style={styles.completeSectionName}>{sectionId}</Text>
        </View>

        {/* ── Summary card ────────────────────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <SummaryCell label="Inspected"    count={inspectedCount}     color={colors.teal[600]} />
            <SummaryCell label="Skipped"      count={skippedCount}       color={colors.severity.major} />
            <SummaryCell label="N/A"          count={notApplicableCount} color={colors.slate[400]} />
            <SummaryCell label="Findings"     count={totalFindings}      color={colors.severity.critical} />
          </View>
        </Card>

        {/* ── Findings by severity ─────────────────────────────────────── */}
        {totalFindings > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Findings ({totalFindings})</Text>
            {SEVERITY_ORDER.map((sev) => (
              <SeverityGroup
                key={sev}
                severity={sev}
                findings={findingsBySeverity[sev]}
                onPressFinding={(f) =>
                  navigation.navigate('FindingEntry', {
                    inspectionId,
                    findingId: f.id,
                    sectionId,
                  })
                }
              />
            ))}
          </Card>
        )}

        {totalFindings === 0 && (
          <View style={styles.noFindingsContainer}>
            <Text style={styles.noFindingsText}>No findings recorded for this section.</Text>
          </View>
        )}

        <View style={{ height: touchTargets.bottomActionBar + spacing.xl }} />
      </ScrollView>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <BottomActionBar>
        <Button
          title="Keep Editing"
          variant="secondary"
          onPress={handleKeepEditing}
          style={styles.secondaryButton}
        />
        <Button
          title={confirming ? 'Confirming…' : 'Confirm Section'}
          onPress={handleConfirm}
          loading={confirming}
          style={styles.primaryButton}
        />
      </BottomActionBar>
    </SafeAreaView>
  );
}

// ─── Summary Cell ─────────────────────────────────────────────────────────────

function SummaryCell({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={summaryStyles.cell}>
      <Text style={[summaryStyles.count, { color }]}>{count}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  count: {
    ...typography.headingLg,
  },
  label: {
    ...typography.caption,
    color: colors.slate[500],
  },
});

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

  completeHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  completeTitle: {
    ...typography.headingLg,
    color: colors.teal[700],
  },
  completeSectionName: {
    ...typography.body,
    color: colors.slate[500],
  },

  cardTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  noFindingsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noFindingsText: {
    ...typography.body,
    color: colors.slate[400],
  },

  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
  },
});
