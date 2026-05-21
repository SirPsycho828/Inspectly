// Executive Summary — AI-generated inspection summary with editable text
// Based on docs/planning/12_Report_Preview_Publish.md

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { RefreshCw } from 'lucide-react-native';
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { Button, BottomActionBar, SeverityBadge, Card, LoadingSkeleton } from '@/components/ui';
import { COLLECTIONS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';
import type { FindingCounts, Inspection } from '@/types';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'ExecutiveSummary'>;

export function ExecutiveSummaryScreen({ route, navigation }: Props) {
  const { inspectionId } = route.params;

  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [edited, setEdited] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [findingCounts, setFindingCounts] = useState<FindingCounts>({
    critical: 0,
    major: 0,
    minor: 0,
    informational: 0,
  });

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialLoadDone = useRef(false);

  // Monitor connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isInternetReachable);
    });
    return unsubscribe;
  }, []);

  // Load inspection doc for findingCounts and existing executiveSummary
  useEffect(() => {
    const unsubscribe = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() as Inspection & { executiveSummary?: string };
        setFindingCounts(data.findingCounts || { critical: 0, major: 0, minor: 0, informational: 0 });

        // Only populate summary on first load to avoid clobbering edits
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          if (data.executiveSummary) {
            setSummary(data.executiveSummary);
          }
        }
      });
    return unsubscribe;
  }, [inspectionId]);

  // Auto-generate on mount if no existing summary and online
  useEffect(() => {
    // Wait for initial load to complete before deciding to generate
    const timer = setTimeout(() => {
      if (!initialLoadDone.current) return;
      if (summary || isOffline) return;
      generateSummary();
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  // Auto-save with 500ms debounce
  const autoSave = useCallback(
    (text: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        try {
          await firestore()
            .collection(COLLECTIONS.INSPECTIONS)
            .doc(inspectionId)
            .update({
              executiveSummary: text,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        } catch {
          // Offline — Firestore will sync when reconnected
        }
      }, 500);
    },
    [inspectionId]
  );

  const callGenerateFunction = async () => {
    const fn = callable('generateExecutiveSummary');
    const result = await fn({ inspectionId });
    const data = result.data as { summary: string };
    return data.summary;
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const text = await callGenerateFunction();
      setSummary(text);
      setEdited(false);
      autoSave(text);
    } catch {
      Alert.alert('Generation Failed', 'Could not generate the summary. You can write one manually.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (edited && summary.trim().length > 0) {
      Alert.alert(
        'Replace current summary?',
        'Your edits will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: generateSummary,
          },
        ]
      );
    } else {
      generateSummary();
    }
  };

  const handleSummaryChange = (text: string) => {
    setSummary(text);
    setEdited(true);
    autoSave(text);
  };

  const handleContinue = () => {
    // Flush any pending auto-save immediately before navigating
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      firestore()
        .collection(COLLECTIONS.INSPECTIONS)
        .doc(inspectionId)
        .update({
          executiveSummary: summary,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {
          // Offline — will sync later
        });
    }
    navigation.navigate('PublishConfirm', { inspectionId });
  };

  const severityEntries: Array<{ key: keyof FindingCounts; label: string }> = [
    { key: 'critical', label: 'Critical' },
    { key: 'major', label: 'Major' },
    { key: 'minor', label: 'Minor' },
    { key: 'informational', label: 'Info' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.heading}>Executive Summary</Text>
          <Text style={styles.subheading}>
            This summary appears at the top of your report and gives clients a quick overview.
          </Text>

          {/* Offline notice */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                Summary will be generated when connected. You can write one now.
              </Text>
            </View>
          )}

          {/* Summary text area */}
          <View style={styles.section}>
            {generating ? (
              <View style={styles.skeletonContainer}>
                <LoadingSkeleton width="100%" height={16} style={styles.skeletonRow} />
                <LoadingSkeleton width="92%" height={16} style={styles.skeletonRow} />
                <LoadingSkeleton width="96%" height={16} style={styles.skeletonRow} />
                <LoadingSkeleton width="85%" height={16} style={styles.skeletonRow} />
                <LoadingSkeleton width="90%" height={16} style={styles.skeletonRow} />
                <LoadingSkeleton width="60%" height={16} style={styles.skeletonRow} />
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={summary}
                onChangeText={handleSummaryChange}
                placeholder="Write an executive summary or tap Regenerate to generate one with AI..."
                placeholderTextColor={colors.slate[400]}
                multiline
                textAlignVertical="top"
              />
            )}

            {/* Regenerate button */}
            <View style={styles.regenerateRow}>
              <Button
                title="Regenerate"
                variant="secondary"
                onPress={handleRegenerate}
                disabled={generating || isOffline}
                loading={generating}
                style={styles.regenerateButton}
              />
              <RefreshCw
                size={16}
                color={generating || isOffline ? colors.slate[300] : colors.slate[500]}
                style={styles.regenerateIcon}
              />
            </View>
          </View>

          {/* Severity breakdown */}
          <Card style={styles.severityCard}>
            <Text style={styles.severityTitle}>Finding Summary</Text>
            <View style={styles.severityRow}>
              {severityEntries.map(({ key }) => (
                <View key={key} style={styles.severityItem}>
                  <SeverityBadge severity={key === 'informational' ? 'informational' : key} />
                  <Text style={styles.severityCount}>{findingCounts[key]}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Optional note */}
          <Text style={styles.optionalNote}>
            A summary is optional. You can publish your report without one.
          </Text>
        </ScrollView>

        <BottomActionBar>
          <Button
            title="Continue to Publish"
            onPress={handleContinue}
            fullWidth
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Header
  heading: {
    ...typography.headingLg,
    color: colors.slate[900],
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.body,
    color: colors.slate[500],
    marginBottom: spacing.xl,
  },

  // Offline banner
  offlineBanner: {
    backgroundColor: colors.severity.minorBg,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  offlineText: {
    ...typography.body,
    color: colors.severity.minor,
  },

  // Summary section
  section: {
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    padding: spacing.base,
    ...typography.body,
    color: colors.slate[900],
    minHeight: 200,
    textAlignVertical: 'top',
  },

  // Skeleton loading
  skeletonContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    padding: spacing.base,
    minHeight: 200,
  },
  skeletonRow: {
    marginBottom: spacing.sm,
  },

  // Regenerate
  regenerateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  regenerateButton: {
    flex: 0,
    height: touchTargets.minimum,
    paddingHorizontal: spacing.base,
  },
  regenerateIcon: {
    // Icon sits visually beside the button as a decorative hint
  },

  // Severity breakdown card
  severityCard: {
    marginBottom: spacing.base,
  },
  severityTitle: {
    ...typography.captionMedium,
    color: colors.slate[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  severityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  severityCount: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },

  // Optional note
  optionalNote: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
