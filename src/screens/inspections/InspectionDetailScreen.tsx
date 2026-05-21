import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { MapPin, User, Calendar, Home } from 'lucide-react-native';

import { colors, typography, spacing, layout, severityConfig } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { Card, SeverityBadge, BottomActionBar, Button, LoadingSkeleton } from '@/components/ui';
import type { Inspection } from '@/types';
import type { InspectionsStackParamList } from '@/navigation/InspectionsNavigator';

type Props = NativeStackScreenProps<InspectionsStackParamList, 'InspectionDetail'>;

// ─── Property Type labels ─────────────────────────────────────────────────────

const PROPERTY_TYPE_LABELS: Record<Inspection['property']['propertyType'], string> = {
  single_family: 'Single Family',
  condo:         'Condo',
  townhouse:     'Townhouse',
  multi_family:  'Multi-Family',
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${Math.round(pct * 100)}%` }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate[200],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.teal[600],
    borderRadius: 3,
  },
});

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.icon}>{icon}</View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    width: 20,
    alignItems: 'center',
    marginTop: 1,
  },
  content: { flex: 1 },
  label: { ...typography.caption, color: colors.slate[500] },
  value: { ...typography.bodyMedium, color: colors.slate[900], marginTop: 1 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
      <LoadingSkeleton height={120} />
      <LoadingSkeleton height={80} />
      <LoadingSkeleton height={100} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function InspectionDetailScreen({ route, navigation }: Props) {
  const { inspectionId } = route.params;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setInspection({ id: snap.id, ...snap.data() } as Inspection);
          } else {
            setError('Inspection not found.');
          }
          setLoading(false);
        },
        (err) => {
          console.error('InspectionDetail snapshot error:', err);
          setError('Failed to load inspection details.');
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId]);

  if (loading) return <DetailSkeleton />;

  if (error || !inspection) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error ?? 'Unknown error.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { property, clientName, clientEmail, agentName, agentEmail,
          checklistProgress, findingCounts, status, startedAt, publishedAt } = inspection;

  const progressFraction =
    checklistProgress.total > 0
      ? (checklistProgress.completed + checklistProgress.skipped) / checklistProgress.total
      : 0;

  const progressPct = Math.round(progressFraction * 100);

  const totalFindings =
    findingCounts.critical + findingCounts.major +
    findingCounts.minor + findingCounts.informational;

  const startedDate = startedAt
    ? startedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const publishedDate = publishedAt
    ? publishedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Property Info Card ──────────────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>Property</Text>

          <InfoRow
            icon={<MapPin size={16} color={colors.slate[400]} />}
            label="Address"
            value={`${property.address}\n${property.city}, ${property.state} ${property.zip}`}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Home size={16} color={colors.slate[400]} />}
            label="Type"
            value={[
              PROPERTY_TYPE_LABELS[property.propertyType],
              property.yearBuilt ? `Built ${property.yearBuilt}` : null,
              property.squareFootage ? `${property.squareFootage.toLocaleString()} sq ft` : null,
            ].filter(Boolean).join(' · ')}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Calendar size={16} color={colors.slate[400]} />}
            label={status === 'published' ? 'Published' : 'Started'}
            value={publishedDate ?? startedDate}
          />
        </Card>

        {/* ── Client / Agent Card ─────────────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>Contacts</Text>
          <InfoRow
            icon={<User size={16} color={colors.slate[400]} />}
            label="Client"
            value={[clientName, clientEmail].filter(Boolean).join('\n')}
          />
          {(agentName || agentEmail) && (
            <>
              <View style={styles.divider} />
              <InfoRow
                icon={<User size={16} color={colors.slate[400]} />}
                label="Agent"
                value={[agentName, agentEmail].filter(Boolean).join('\n') as string}
              />
            </>
          )}
        </Card>

        {/* ── Progress Card ───────────────────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>Checklist Progress</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {checklistProgress.completed + checklistProgress.skipped} / {checklistProgress.total} items
            </Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <ProgressBar progress={progressFraction} />
          <View style={styles.progressDetail}>
            <Text style={styles.progressDetailText}>
              {checklistProgress.completed} inspected · {checklistProgress.skipped} skipped
            </Text>
          </View>
        </Card>

        {/* ── Findings Summary Card ────────────────────────────────────── */}
        {totalFindings > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Findings ({totalFindings})</Text>
            <View style={styles.findingsGrid}>
              {(
                [
                  ['critical',      findingCounts.critical],
                  ['major',         findingCounts.major],
                  ['minor',         findingCounts.minor],
                  ['informational', findingCounts.informational],
                ] as const
              )
                .filter(([, count]) => count > 0)
                .map(([sev, count]) => (
                  <View key={sev} style={styles.findingCell}>
                    <SeverityBadge severity={sev} />
                    <Text style={styles.findingCount}>{count}</Text>
                  </View>
                ))}
            </View>
          </Card>
        )}

        {/* Spacer for action bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <BottomActionBar>
        {status === 'in_progress' || status === 'draft' ? (
          <Button
            title="Resume Inspection"
            onPress={() => navigation.navigate('ActiveInspection', { inspectionId })}
            fullWidth
          />
        ) : (
          <Button
            title="View Report"
            onPress={() => {
              // Navigate to Reports tab — report navigation handled externally
              // For now, pop back (the Reports tab will handle deep-linking in a later milestone)
              navigation.goBack();
            }}
            fullWidth
          />
        )}
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

  // Error
  errorBanner: {
    margin: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.errorBg,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.severity.critical + '33',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },

  // Card internals
  cardTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate[100],
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
  progressPct: {
    ...typography.headingMd,
    color: colors.teal[600],
  },
  progressDetail: {
    marginTop: spacing.sm,
  },
  progressDetailText: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Findings
  findingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  findingCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  findingCount: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
});
