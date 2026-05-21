import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import {
  MapPin,
  Calendar,
  User,
  Shield,
  FileText,
  Lock,
  AlertTriangle,
} from 'lucide-react-native';

import { colors, typography, spacing, layout, severityConfig } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { Card, SeverityBadge, BottomActionBar, Button } from '@/components/ui';
import type { Report } from '@/types';
import type { ReportsStackParamList } from '@/navigation/ReportsNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ReportDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return 'Unknown';
  const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Section components ───────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ReportDetailScreen({ navigation, route }: Props) {
  const { reportId } = route.params;

  const [report, setReport]       = useState<Report | null>(null);
  const [loading, setLoading]     = useState(true);
  const [revoking, setRevoking]   = useState(false);

  // ── Firestore real-time subscription ───────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.REPORTS)
      .doc(reportId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            setReport({ id: snap.id, ...snap.data() } as Report);
          } else {
            setReport(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('ReportDetail snapshot error:', err);
          setLoading(false);
        }
      );

    return unsub;
  }, [reportId]);

  // ── Revoke report ──────────────────────────────────────────────────────────
  const handleRevoke = () => {
    Alert.alert(
      'Revoke Report',
      'This will immediately invalidate all access codes and prevent recipients from viewing this report. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Report',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              const revokeReport = callable('revokeReport');
              await revokeReport({ reportId });
              Alert.alert(
                'Report Revoked',
                'The report and all associated access codes have been revoked.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (err: any) {
              console.error('revokeReport error:', err);
              Alert.alert('Error', err?.message ?? 'Failed to revoke the report. Please try again.');
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.teal[600]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <AlertTriangle size={40} color={colors.slate[300]} />
          <Text style={styles.notFoundText}>Report not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { property, findingCounts, sections, executiveSummary, pdfUrl, status } = report;

  const totalFindings =
    findingCounts.critical + findingCounts.major + findingCounts.minor + findingCounts.informational;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>

      {/* Status banners */}
      {status === 'revoked' && (
        <View style={styles.bannerRevoked}>
          <AlertTriangle size={16} color={colors.error} />
          <Text style={styles.bannerRevokedText}>This report has been revoked</Text>
        </View>
      )}
      {status === 'superseded' && (
        <View style={styles.bannerSuperseded}>
          <AlertTriangle size={16} color={colors.severity.major} />
          <Text style={styles.bannerSupersededText}>
            This report has been superseded by a newer version
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Property info card */}
        <Card>
          <Text style={styles.cardTitle}>Property</Text>
          <SectionDivider />
          <InfoRow
            icon={<MapPin size={16} color={colors.teal[600]} />}
            label="Address"
            value={`${property.address}\n${property.city}, ${property.state} ${property.zip}`}
          />
          <InfoRow
            icon={<Calendar size={16} color={colors.teal[600]} />}
            label="Inspection Date"
            value={formatDate(report.publishedAt)}
          />
          <InfoRow
            icon={<User size={16} color={colors.teal[600]} />}
            label="Inspector"
            value={report.inspectorName}
          />
          {report.branding?.companyPhone ? (
            <InfoRow
              icon={<Shield size={16} color={colors.teal[600]} />}
              label="License"
              value={report.branding.companyPhone}
            />
          ) : null}
        </Card>

        {/* Executive summary */}
        {!!executiveSummary && (
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Executive Summary</Text>
            <SectionDivider />
            <Text style={styles.summaryText}>{executiveSummary}</Text>
          </Card>
        )}

        {/* Severity breakdown */}
        {totalFindings > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Finding Summary</Text>
            <SectionDivider />
            <View style={styles.severityRow}>
              {(
                [
                  ['critical', findingCounts.critical],
                  ['major',    findingCounts.major],
                  ['minor',    findingCounts.minor],
                  ['informational', findingCounts.informational],
                ] as const
              ).map(([severity, count]) =>
                count > 0 ? (
                  <View key={severity} style={styles.severityItem}>
                    <SeverityBadge severity={severity} />
                    <Text style={[styles.severityCount, { color: severityConfig[severity].color }]}>
                      {count}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          </Card>
        )}

        {/* Sections list */}
        {sections.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Sections</Text>
            <SectionDivider />
            <View style={styles.sectionsList}>
              {sections.map((section, idx) => (
                <View key={section.sectionId}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle} numberOfLines={1}>
                      {section.title}
                    </Text>
                    <View style={styles.sectionCountBadge}>
                      <Text style={styles.sectionCountText}>{section.findings.length}</Text>
                    </View>
                  </View>
                  {idx < sections.length - 1 && <View style={styles.sectionRowDivider} />}
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* PDF status */}
        <Card>
          <View style={styles.pdfRow}>
            <FileText size={20} color={pdfUrl ? colors.teal[600] : colors.slate[400]} />
            <View style={styles.pdfTextBlock}>
              <Text style={styles.pdfTitle}>
                {pdfUrl ? 'PDF Available' : 'PDF Generating...'}
              </Text>
              <Text style={styles.pdfSubtitle}>
                {pdfUrl
                  ? 'The full report PDF is ready for download.'
                  : 'Your PDF will be ready shortly after publishing.'}
              </Text>
            </View>
            {!pdfUrl && (
              <ActivityIndicator size="small" color={colors.teal[600]} />
            )}
            {pdfUrl && (
              <View style={styles.pdfReadyDot} />
            )}
          </View>
        </Card>

        {/* Access & delivery card */}
        <Card>
          <Text style={styles.cardTitle}>Access & Delivery</Text>
          <SectionDivider />

          <TouchableOpacity
            style={styles.manageAccessRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ManageAccess', { reportId })}
          >
            <Lock size={16} color={colors.teal[600]} />
            <Text style={styles.manageAccessText}>Manage Access Codes</Text>
            <Text style={styles.manageAccessChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.deliveryRow}>
            <Shield size={16} color={colors.success} />
            <Text style={styles.deliveryText}>Notifications sent to recipients</Text>
          </View>
        </Card>

        {/* Destructive action */}
        {status === 'active' && (
          <Button
            title={revoking ? 'Revoking...' : 'Revoke Report'}
            onPress={handleRevoke}
            variant="destructive"
            fullWidth
            loading={revoking}
            style={styles.revokeButton}
          />
        )}

        <View style={styles.bottomPad} />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    ...typography.body,
    color: colors.slate[500],
  },

  // Status banners
  bannerRevoked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.severity.critical + '33',
  },
  bannerRevokedText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  bannerSuperseded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.severity.majorBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.severity.major + '33',
  },
  bannerSupersededText: {
    ...typography.bodyMedium,
    color: colors.severity.major,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },

  // Card internals
  cardTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginBottom: spacing.md,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoIcon: {
    marginTop: 2,
    width: 20,
    alignItems: 'center',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.slate[500],
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },

  // Executive summary
  summaryCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.teal[600],
  },
  summaryText: {
    ...typography.body,
    color: colors.slate[700],
    lineHeight: 22,
  },

  // Severity
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  severityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  severityCount: {
    ...typography.headingMd,
  },

  // Sections list
  sectionsList: {
    gap: 0,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionRowDivider: {
    height: 1,
    backgroundColor: colors.slate[100],
  },
  sectionTitle: {
    ...typography.body,
    color: colors.slate[900],
    flex: 1,
  },
  sectionCountBadge: {
    backgroundColor: colors.slate[100],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionCountText: {
    ...typography.captionMedium,
    color: colors.slate[500],
  },

  // PDF
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pdfTextBlock: {
    flex: 1,
  },
  pdfTitle: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  pdfSubtitle: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },
  pdfReadyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },

  // Access & delivery
  manageAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  manageAccessText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
    flex: 1,
  },
  manageAccessChevron: {
    fontSize: 20,
    color: colors.slate[400],
    lineHeight: 24,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  deliveryText: {
    ...typography.body,
    color: colors.success,
  },

  // Revoke
  revokeButton: {
    marginTop: spacing.sm,
  },
  bottomPad: {
    height: spacing.xl,
  },
});
