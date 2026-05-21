// Report Preview — scrollable pre-publish report view
// Based on docs/planning/12_Report_Preview_Publish.md

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  MapPin,
  Calendar,
  User,
} from 'lucide-react-native';

import {
  colors,
  typography,
  spacing,
  layout,
  severityConfig,
  touchTargets,
} from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import {
  Button,
  BottomActionBar,
  SeverityBadge,
  Card,
  LoadingSkeleton,
} from '@/components/ui';
import type {
  Inspection,
  Finding,
  ChecklistProgressItem,
  Severity,
  FindingCounts,
} from '@/types';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'ReportPreview'>;

const SEVERITY_ORDER: Severity[] = ['critical', 'major', 'minor', 'informational'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '—';
  try {
    const d = timestamp.toDate();
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function propertyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    single_family: 'Single Family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    multi_family: 'Multi-Family',
  };
  return map[type] ?? type;
}

// ─── Severity Chart ───────────────────────────────────────────────────────────

function SeverityStackedBar({ counts }: { counts: FindingCounts }) {
  const total = counts.critical + counts.major + counts.minor + counts.informational;

  if (total === 0) {
    return (
      <View style={chartStyles.emptyBar}>
        <Text style={chartStyles.emptyLabel}>No findings recorded</Text>
      </View>
    );
  }

  const segments: { severity: Severity; count: number }[] = [
    { severity: 'critical' as Severity,      count: counts.critical },
    { severity: 'major' as Severity,         count: counts.major },
    { severity: 'minor' as Severity,         count: counts.minor },
    { severity: 'informational' as Severity, count: counts.informational },
  ].filter((s) => s.count > 0);

  return (
    <View>
      <View style={chartStyles.bar}>
        {segments.map(({ severity, count }) => {
          const flex = count / total;
          const cfg = severityConfig[severity];
          const pct = Math.round(flex * 100);
          return (
            <View
              key={severity}
              style={[chartStyles.segment, { flex, backgroundColor: cfg.color }]}
            >
              {pct >= 12 && (
                <Text style={chartStyles.segmentLabel}>{count}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={chartStyles.legend}>
        {SEVERITY_ORDER.map((severity) => {
          const count = counts[severity === 'informational' ? 'informational' : severity];
          if (count === 0) return null;
          const cfg = severityConfig[severity];
          return (
            <View key={severity} style={chartStyles.legendItem}>
              <View style={[chartStyles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={chartStyles.legendText}>
                {cfg.label} ({count})
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  segment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentLabel: {
    ...typography.captionMedium,
    color: colors.white,
  },
  emptyBar: {
    height: 28,
    backgroundColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyLabel: {
    ...typography.caption,
    color: colors.slate[400],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.slate[600],
  },
});

// ─── Section Summary Table ─────────────────────────────────────────────────────

interface SectionSummaryRow {
  sectionId: string;
  title: string;
  counts: FindingCounts;
  total: number;
}

function SectionSummaryTable({ rows }: { rows: SectionSummaryRow[] }) {
  if (rows.length === 0) return null;

  return (
    <View style={tableStyles.table}>
      {/* Header */}
      <View style={[tableStyles.row, tableStyles.headerRow]}>
        <Text style={[tableStyles.cell, tableStyles.sectionCell, tableStyles.headerText]}>
          Section
        </Text>
        {SEVERITY_ORDER.map((sev) => (
          <View
            key={sev}
            style={[tableStyles.countCell, { backgroundColor: severityConfig[sev].bg }]}
          >
            <Text style={[tableStyles.headerText, { color: severityConfig[sev].color }]}>
              {severityConfig[sev].label.charAt(0)}
            </Text>
          </View>
        ))}
        <Text style={[tableStyles.countCell, tableStyles.headerText, tableStyles.totalHeader]}>
          Total
        </Text>
      </View>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <View
          key={row.sectionId}
          style={[tableStyles.row, idx % 2 === 1 && tableStyles.altRow]}
        >
          <Text style={[tableStyles.cell, tableStyles.sectionCell]} numberOfLines={1}>
            {row.title}
          </Text>
          {SEVERITY_ORDER.map((sev) => {
            const count = row.counts[sev === 'informational' ? 'informational' : sev];
            return (
              <Text
                key={sev}
                style={[
                  tableStyles.countCell,
                  tableStyles.countText,
                  count > 0 && { color: severityConfig[sev].color, fontWeight: '600' },
                ]}
              >
                {count > 0 ? count : '—'}
              </Text>
            );
          })}
          <Text
            style={[
              tableStyles.countCell,
              tableStyles.countText,
              tableStyles.totalText,
              row.total > 0 && { color: colors.slate[900] },
            ]}
          >
            {row.total > 0 ? row.total : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  headerRow: {
    backgroundColor: colors.slate[100],
  },
  altRow: {
    backgroundColor: colors.slate[50],
  },
  cell: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionCell: {
    flex: 1,
    ...typography.caption,
    color: colors.slate[700],
  },
  countCell: {
    width: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xs,
    textAlign: 'center' as const,
  },
  headerText: {
    ...typography.captionMedium,
    color: colors.slate[700],
    textAlign: 'center' as const,
  },
  totalHeader: {
    color: colors.slate[900],
  },
  countText: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'center' as const,
  },
  totalText: {
    fontWeight: '500' as const,
    color: colors.slate[400],
  },
});

// ─── Photo Thumbnails ─────────────────────────────────────────────────────────

function PhotoThumbnailRow({ photos }: { photos: Finding['photos'] }) {
  if (photos.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={thumbStyles.row}
    >
      {photos.map((photo, idx) => (
        <View key={idx} style={thumbStyles.thumb}>
          <Image
            source={{ uri: photo.thumbnailUrl || photo.storageUrl }}
            style={thumbStyles.image}
            resizeMode="cover"
          />
          {photo.caption ? (
            <Text style={thumbStyles.caption} numberOfLines={1}>
              {photo.caption}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const thumbStyles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  thumb: {
    width: 80,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: layout.borderRadius,
    backgroundColor: colors.slate[200],
  },
  caption: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },
});

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  expanded,
  onToggle,
  onEdit,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={findingStyles.wrapper}>
      {/* Collapsed / header row — always visible */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={findingStyles.headerRow}
        accessibilityRole="button"
        accessibilityLabel={`${finding.component} finding, ${severityConfig[finding.severity].label}`}
      >
        <SeverityBadge severity={finding.severity} />
        <View style={findingStyles.headerContent}>
          <Text style={findingStyles.component}>{finding.component}</Text>
          {!expanded && (
            <Text style={findingStyles.narrativePreview} numberOfLines={2}>
              {finding.narrative}
            </Text>
          )}
        </View>
        {finding.photos.length > 0 && !expanded && (
          <Text style={findingStyles.photoCount}>
            {finding.photos.length} photo{finding.photos.length !== 1 ? 's' : ''}
          </Text>
        )}
        {expanded
          ? <ChevronUp size={18} color={colors.slate[400]} />
          : <ChevronDown size={18} color={colors.slate[400]} />
        }
      </TouchableOpacity>

      {/* Expanded detail */}
      {expanded && (
        <View style={findingStyles.detail}>
          <Text style={findingStyles.label}>Narrative</Text>
          <Text style={findingStyles.bodyText}>{finding.narrative}</Text>

          {finding.recommendation ? (
            <>
              <Text style={[findingStyles.label, { marginTop: spacing.md }]}>
                Recommendation
              </Text>
              <Text style={findingStyles.bodyText}>{finding.recommendation}</Text>
            </>
          ) : null}

          <PhotoThumbnailRow photos={finding.photos} />

          <TouchableOpacity
            style={findingStyles.editButton}
            onPress={onEdit}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit finding"
          >
            <Edit2 size={14} color={colors.teal[600]} />
            <Text style={findingStyles.editLabel}>Edit Finding</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const findingStyles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: touchTargets.minimum,
  },
  headerContent: {
    flex: 1,
  },
  component: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    marginBottom: 2,
  },
  narrativePreview: {
    ...typography.caption,
    color: colors.slate[500],
  },
  photoCount: {
    ...typography.caption,
    color: colors.slate[400],
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  detail: {
    paddingBottom: spacing.md,
  },
  label: {
    ...typography.captionMedium,
    color: colors.slate[500],
    marginBottom: spacing.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  bodyText: {
    ...typography.body,
    color: colors.slate[700],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    minHeight: touchTargets.minimum,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  editLabel: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
});

// ─── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({
  sectionId,
  title,
  findings,
  showEmpty,
  expandedFindingId,
  onToggleFinding,
  onEditFinding,
}: {
  sectionId: string;
  title: string;
  findings: Finding[];
  showEmpty: boolean;
  expandedFindingId: string | null;
  onToggleFinding: (id: string) => void;
  onEditFinding: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (findings.length === 0 && !showEmpty) return null;

  return (
    <Card style={sectionStyles.card}>
      {/* Section header — collapsible */}
      <TouchableOpacity
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.7}
        style={sectionStyles.header}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${collapsed ? 'expand' : 'collapse'}`}
      >
        <Text style={sectionStyles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={sectionStyles.headerRight}>
          {findings.length > 0 && (
            <View style={sectionStyles.countBadge}>
              <Text style={sectionStyles.countText}>{findings.length}</Text>
            </View>
          )}
          {collapsed
            ? <ChevronDown size={18} color={colors.slate[400]} />
            : <ChevronUp size={18} color={colors.slate[400]} />
          }
        </View>
      </TouchableOpacity>

      {/* Findings list */}
      {!collapsed && (
        <>
          {findings.length === 0 ? (
            <View style={sectionStyles.noFindings}>
              <Text style={sectionStyles.noFindingsText}>No findings in this section</Text>
            </View>
          ) : (
            findings.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                expanded={expandedFindingId === f.id}
                onToggle={() => onToggleFinding(f.id)}
                onEdit={() => onEditFinding(f.id)}
              />
            ))
          )}
        </>
      )}
    </Card>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
    minHeight: touchTargets.minimum,
    backgroundColor: colors.white,
  },
  title: {
    ...typography.headingMd,
    color: colors.slate[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.teal[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...typography.captionMedium,
    color: colors.white,
  },
  noFindings: {
    paddingHorizontal: layout.cardPadding,
    paddingBottom: spacing.md,
  },
  noFindingsText: {
    ...typography.body,
    color: colors.slate[400],
  },
  findingPadding: {
    paddingHorizontal: layout.cardPadding,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function ReportPreviewScreen({ route, navigation }: Props) {
  const { inspectionId } = route.params;

  const [inspection,       setInspection]       = useState<Inspection | null>(null);
  const [findings,         setFindings]         = useState<Finding[]>([]);
  const [progressItems,    setProgressItems]    = useState<ChecklistProgressItem[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showEmpty,        setShowEmpty]        = useState(false);
  const [expandedFinding,  setExpandedFinding]  = useState<string | null>(null);

  // ── Subscribe: inspection doc ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setInspection({ id: snap.id, ...snap.data() } as Inspection);
          }
          setLoading(false);
        },
        (err) => {
          console.error('ReportPreview inspection error:', err);
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId]);

  // ── Subscribe: findings ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.FINDINGS(inspectionId))
      .orderBy('order', 'asc')
      .onSnapshot(
        (snap) => {
          setFindings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finding)));
        },
        (err) => console.error('ReportPreview findings error:', err)
      );
    return unsub;
  }, [inspectionId]);

  // ── Subscribe: checklist progress ─────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionId))
      .onSnapshot(
        (snap) => {
          setProgressItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChecklistProgressItem)));
        },
        (err) => console.error('ReportPreview progress error:', err)
      );
    return unsub;
  }, [inspectionId]);

  // ── Derive unique sections from progress items ─────────────────────────────
  const sections = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of progressItems) {
      if (!seen.has(item.sectionId)) {
        // Use sectionId as title fallback if no label field is available
        seen.set(item.sectionId, item.sectionId);
      }
    }
    // Also include any sectionIds referenced by findings but not in progress
    for (const f of findings) {
      if (f.sectionId && !seen.has(f.sectionId)) {
        seen.set(f.sectionId, f.sectionId);
      }
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [progressItems, findings]);

  // ── Group findings by sectionId ────────────────────────────────────────────
  const findingsBySection = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings) {
      const key = f.sectionId ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [findings]);

  // ── Per-section counts for summary table ──────────────────────────────────
  const summaryRows = useMemo((): SectionSummaryRow[] => {
    return sections.map(({ id, title }) => {
      const sectionFindings = findingsBySection.get(id) ?? [];
      const counts: FindingCounts = {
        critical:      sectionFindings.filter((f) => f.severity === 'critical').length,
        major:         sectionFindings.filter((f) => f.severity === 'major').length,
        minor:         sectionFindings.filter((f) => f.severity === 'minor').length,
        informational: sectionFindings.filter((f) => f.severity === 'informational').length,
      };
      return { sectionId: id, title, counts, total: sectionFindings.length };
    });
  }, [sections, findingsBySection]);

  // ── Finding expand/collapse toggle ────────────────────────────────────────
  const handleToggleFinding = (id: string) => {
    setExpandedFinding((prev) => (prev === id ? null : id));
  };

  const handleEditFinding = (findingId: string) => {
    navigation.navigate('FindingEntry', { inspectionId, findingId });
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton height={100} />
          <LoadingSkeleton height={60} />
          <LoadingSkeleton height={120} />
          <LoadingSkeleton height={80} />
          <LoadingSkeleton height={80} />
        </View>
      </SafeAreaView>
    );
  }

  const property   = inspection?.property;
  const counts     = inspection?.findingCounts ?? { critical: 0, major: 0, minor: 0, informational: 0 };
  const totalCount = counts.critical + counts.major + counts.minor + counts.informational;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Cover Page ──────────────────────────────────────────────── */}
        <Card style={styles.coverCard}>
          <Text style={styles.coverHeading}>Inspection Report</Text>

          {property && (
            <View style={styles.coverRow}>
              <MapPin size={16} color={colors.teal[600]} />
              <View style={styles.coverRowContent}>
                <Text style={styles.coverAddress}>{property.address}</Text>
                <Text style={styles.coverSubAddress}>
                  {property.city}, {property.state} {property.zip}
                </Text>
                <Text style={styles.coverMeta}>
                  {propertyTypeLabel(property.propertyType)}
                  {property.yearBuilt ? ` · Built ${property.yearBuilt}` : ''}
                  {property.squareFootage ? ` · ${property.squareFootage.toLocaleString()} sq ft` : ''}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.coverDivider} />

          <View style={styles.coverRow}>
            <Calendar size={16} color={colors.slate[400]} />
            <Text style={styles.coverDetailText}>
              {formatDate(inspection?.startedAt)}
            </Text>
          </View>

          {inspection?.clientName ? (
            <View style={[styles.coverRow, { marginTop: spacing.sm }]}>
              <User size={16} color={colors.slate[400]} />
              <Text style={styles.coverDetailText}>
                {inspection.clientName}
                {inspection.clientEmail ? `  ·  ${inspection.clientEmail}` : ''}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* ── Severity Summary Chart ───────────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>
            Finding Summary · {totalCount} total
          </Text>
          <SeverityStackedBar counts={counts} />
        </Card>

        {/* ── Section-by-Section Table ─────────────────────────────────── */}
        {summaryRows.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Sections at a Glance</Text>
            <SectionSummaryTable rows={summaryRows} />
          </Card>
        )}

        {/* ── Show empty sections toggle ───────────────────────────────── */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show sections with no findings</Text>
          <Switch
            value={showEmpty}
            onValueChange={setShowEmpty}
            trackColor={{ false: colors.slate[300], true: colors.teal[600] }}
            thumbColor={colors.white}
          />
        </View>

        {/* ── Per-Section Finding Blocks ───────────────────────────────── */}
        {sections.map(({ id, title }) => (
          <SectionBlock
            key={id}
            sectionId={id}
            title={title}
            findings={findingsBySection.get(id) ?? []}
            showEmpty={showEmpty}
            expandedFindingId={expandedFinding}
            onToggleFinding={handleToggleFinding}
            onEditFinding={handleEditFinding}
          />
        ))}

        {/* Findings with no sectionId */}
        {(findingsBySection.get('__none__') ?? []).length > 0 && (
          <SectionBlock
            sectionId="__none__"
            title="Uncategorized"
            findings={findingsBySection.get('__none__') ?? []}
            showEmpty={showEmpty}
            expandedFindingId={expandedFinding}
            onToggleFinding={handleToggleFinding}
            onEditFinding={handleEditFinding}
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Bottom Action Bar ────────────────────────────────────────────── */}
      <BottomActionBar>
        <Button
          title="Continue to Summary"
          onPress={() => navigation.navigate('ExecutiveSummary', { inspectionId })}
          style={styles.primaryButton}
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

  skeletonContainer: {
    padding: spacing.base,
    gap: spacing.base,
  },

  scrollContent: {
    padding: layout.screenPaddingH,
    gap: spacing.base,
  },

  // Cover card
  coverCard: {
    gap: spacing.sm,
  },
  coverHeading: {
    ...typography.headingLg,
    color: colors.slate[900],
    marginBottom: spacing.xs,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  coverRowContent: {
    flex: 1,
  },
  coverAddress: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  coverSubAddress: {
    ...typography.body,
    color: colors.slate[700],
    marginTop: 1,
  },
  coverMeta: {
    ...typography.caption,
    color: colors.slate[400],
    marginTop: 2,
  },
  coverDivider: {
    height: 1,
    backgroundColor: colors.slate[200],
    marginVertical: spacing.xs,
  },
  coverDetailText: {
    ...typography.body,
    color: colors.slate[600],
    flex: 1,
  },

  // Common card title
  cardTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
    marginBottom: spacing.md,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    minHeight: touchTargets.minimum,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.slate[700],
    flex: 1,
    marginRight: spacing.sm,
  },

  // Action bar
  primaryButton: {
    flex: 1,
  },

  bottomSpacer: {
    height: touchTargets.bottomActionBar,
  },
});
