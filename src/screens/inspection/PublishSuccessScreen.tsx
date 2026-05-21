// Publish Success — celebration screen shown after report is delivered
// Based on docs/planning/13_Report_Publish_Delivery.md

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { CircleCheckBig, Copy, ArrowRight } from 'lucide-react-native';
import { colors, typography, spacing, touchTargets, layout } from '@/constants/theme';
import { Button, Card } from '@/components/ui';
import { COLLECTIONS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';
import type { Inspection, AccessCode } from '@/types';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'PublishSuccess'>;

// ─── Recipient type badge ──────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.captionMedium,
    color: colors.teal[700],
  },
});

// ─── Access code card ─────────────────────────────────────────────────────────

function AccessCodeCard({
  code,
  onCopy,
  justCopied,
}: {
  code: AccessCode;
  onCopy: (code: AccessCode) => void;
  justCopied: boolean;
}) {
  return (
    <Card style={codeStyles.card}>
      <View style={codeStyles.header}>
        <View style={codeStyles.nameBlock}>
          <Text style={codeStyles.name}>{code.recipientName}</Text>
          <Text style={codeStyles.email}>{code.recipientEmail}</Text>
        </View>
        <TypeBadge type={code.recipientType} />
      </View>

      <View style={codeStyles.codeRow}>
        <View style={codeStyles.codeBox}>
          <Text style={codeStyles.codeText}>{code.code}</Text>
        </View>
        <TouchableOpacity
          style={codeStyles.copyButton}
          onPress={() => onCopy(code)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Copy size={16} color={justCopied ? colors.success : colors.teal[600]} />
          <Text style={[codeStyles.copyText, justCopied && codeStyles.copiedText]}>
            {justCopied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const codeStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  email: {
    ...typography.caption,
    color: colors.slate[500],
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  codeBox: {
    flex: 1,
    backgroundColor: colors.slate[100],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 4,
    color: colors.slate[900],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  copyText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  copiedText: {
    color: colors.success,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PublishSuccessScreen({ route, navigation }: Props) {
  const { inspectionId, reportId } = route.params;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  // ── Load inspection for property address ─────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot(
        (doc) => {
          if (!doc.exists) return;
          setInspection({ id: doc.id, ...doc.data() } as Inspection);
        },
        (err) => console.error('PublishSuccess inspection error:', err)
      );
    return unsub;
  }, [inspectionId]);

  // ── Load access codes from reports/{reportId}/accessCodes ────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.ACCESS_CODES(reportId))
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessCode));
          setAccessCodes(docs);
        },
        (err) => console.error('PublishSuccess access codes error:', err)
      );
    return unsub;
  }, [reportId]);

  // ── Copy single code ──────────────────────────────────────────────────────
  const handleCopyCode = async (code: AccessCode) => {
    await Clipboard.setStringAsync(code.code);
    setCopiedId(code.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Share all codes ───────────────────────────────────────────────────────
  const handleShareAllCodes = async () => {
    const property = inspection?.property;
    const addressLine = property
      ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
      : 'Property';

    const lines = [
      'Inspection Report Access Codes',
      `Property: ${addressLine}`,
      '',
      ...accessCodes.map(
        (c) =>
          `${c.recipientType.charAt(0).toUpperCase() + c.recipientType.slice(1)} (${c.recipientName}): ${c.code}`
      ),
    ];

    await Clipboard.setStringAsync(lines.join('\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleDone = () => {
    navigation.getParent()?.goBack();
  };

  const handleViewReport = () => {
    // Navigate back to the main tab stack; the Reports tab will show the new report
    navigation.getParent()?.goBack();
  };

  const property = inspection?.property;
  const addressLine = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <CircleCheckBig size={80} color={colors.teal[600]} strokeWidth={1.5} />
          <Text style={styles.heroTitle}>Report Published</Text>
          {addressLine ? (
            <Text style={styles.heroAddress}>{addressLine}</Text>
          ) : null}
          <View style={styles.sendingBadge}>
            <Text style={styles.sendingText}>Notifications sending…</Text>
          </View>
        </View>

        {/* ── Access codes ─────────────────────────────────────────────────── */}
        {accessCodes.length > 0 ? (
          <View style={styles.codesSection}>
            <Text style={styles.sectionTitle}>Access Codes</Text>
            <Text style={styles.sectionSubtitle}>
              Share these codes with recipients to access the report
            </Text>

            {accessCodes.map((code) => (
              <AccessCodeCard
                key={code.id}
                code={code}
                onCopy={handleCopyCode}
                justCopied={copiedId === code.id}
              />
            ))}

            {accessCodes.length > 1 ? (
              <TouchableOpacity
                style={styles.shareAllButton}
                onPress={handleShareAllCodes}
                activeOpacity={0.7}
              >
                <Copy size={16} color={allCopied ? colors.success : colors.teal[600]} />
                <Text style={[styles.shareAllText, allCopied && styles.shareAllCopied]}>
                  {allCopied ? 'All Codes Copied!' : 'Copy All Codes'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button
            title="View Report"
            variant="secondary"
            onPress={handleViewReport}
            fullWidth
          />
          <Button
            title="Done"
            onPress={handleDone}
            fullWidth
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing['3xl'],
    gap: spacing.xl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  heroTitle: {
    ...typography.headingXl,
    color: colors.slate[900],
    textAlign: 'center',
  },
  heroAddress: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  sendingBadge: {
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  sendingText: {
    ...typography.captionMedium,
    color: colors.teal[700],
  },

  // Access codes section
  codesSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: -spacing.xs,
  },

  // Share all
  shareAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.slate[50],
  },
  shareAllText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  shareAllCopied: {
    color: colors.success,
  },

  // Actions
  actions: {
    gap: spacing.sm,
  },
});
