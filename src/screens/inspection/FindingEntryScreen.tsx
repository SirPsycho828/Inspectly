// Finding Entry — core data capture screen
// Based on docs/planning/08_Finding_Entry_Severity.md

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { Camera, Trash2 } from 'lucide-react-native';
import { colors, typography, spacing, touchTargets, layout, severityConfig } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { Button, BottomActionBar } from '@/components/ui';
import { COLLECTIONS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';
import type { Finding, Severity, FindingPhoto } from '@/types';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'FindingEntry'>;

const SEVERITIES: Severity[] = ['critical', 'major', 'minor', 'informational'];

export function FindingEntryScreen({ route, navigation }: Props) {
  const { inspectionId, findingId, checklistItemId, sectionId } = route.params;
  const isEditing = !!findingId;

  const [component, setComponent] = useState('');
  const [condition, setCondition] = useState('');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [narrative, setNarrative] = useState('');
  const [narrativeSource, setNarrativeSource] = useState<'ai' | 'manual' | 'ai_edited'>('manual');
  const [recommendation, setRecommendation] = useState('');
  const [photos, setPhotos] = useState<FindingPhoto[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const manualOverride = useRef(false);
  const findingDocId = useRef<string | null>(findingId || null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load existing finding if editing
  useEffect(() => {
    if (!findingId) return;
    const unsub = firestore()
      .collection(COLLECTIONS.FINDINGS(inspectionId))
      .doc(findingId)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() as Finding;
        setComponent(data.component || '');
        setCondition(data.condition || '');
        setSeverity(data.severity || null);
        setNarrative(data.narrative || '');
        setNarrativeSource(data.narrativeSource || 'manual');
        setRecommendation(data.recommendation || '');
        setPhotos(data.photos || []);
      });
    return unsub;
  }, [findingId, inspectionId]);

  // Auto-save with 500ms debounce
  const autoSave = useCallback(
    (data: Partial<Finding>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        const ref = findingDocId.current
          ? firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc(findingDocId.current)
          : firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc();

        if (!findingDocId.current) findingDocId.current = ref.id;

        await ref.set(
          {
            ...data,
            checklistItemId: checklistItemId || null,
            sectionId: sectionId || null,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            ...(!findingDocId.current ? { createdAt: firestore.FieldValue.serverTimestamp(), order: Date.now() } : {}),
          },
          { merge: true }
        );
      }, 500);
    },
    [inspectionId, checklistItemId, sectionId]
  );

  // Trigger AI narrative generation
  useEffect(() => {
    if (!component || !condition || !severity || manualOverride.current || generating) return;
    if (isEditing && narrative) return;

    const generateAI = async () => {
      setGenerating(true);
      try {
        const fn = callable('generateNarrative');
        const result = await fn({ component, condition, severity });
        const data = result.data as { narrative: string; recommendation: string };
        if (!manualOverride.current) {
          setNarrative(data.narrative);
          setRecommendation(data.recommendation);
          setNarrativeSource('ai');
          autoSave({ narrative: data.narrative, recommendation: data.recommendation, narrativeSource: 'ai' });
        }
      } catch {
        // AI unavailable — inspector writes manually
      } finally {
        setGenerating(false);
      }
    };
    generateAI();
  }, [component, condition, severity]);

  const handleSeveritySelect = (s: Severity) => {
    setSeverity(s);
    autoSave({ severity: s });
  };

  const handleNarrativeChange = (value: string) => {
    manualOverride.current = true;
    setNarrative(value);
    const source = narrativeSource === 'ai' ? 'ai_edited' : 'manual';
    setNarrativeSource(source);
    autoSave({ narrative: value, narrativeSource: source });
  };

  const handleAddPhoto = () => {
    navigation.navigate('PhotoCapture', {
      inspectionId,
      findingId: findingDocId.current || undefined,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = findingDocId.current
        ? firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc(findingDocId.current)
        : firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc();

      await ref.set(
        {
          component, condition, severity: severity || 'informational',
          narrative, narrativeSource, recommendation, photos,
          checklistItemId: checklistItemId || null,
          sectionId: sectionId || null,
          order: Date.now(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          ...(!isEditing ? { createdAt: firestore.FieldValue.serverTimestamp() } : {}),
        },
        { merge: true }
      );
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save finding.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!findingDocId.current) return;
    Alert.alert('Delete Finding', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc(findingDocId.current!).delete();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Component */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Component</Text>
            <TextInput style={styles.input} value={component}
              onChangeText={(v) => { setComponent(v); autoSave({ component: v }); }}
              placeholder="What are you looking at?" placeholderTextColor={colors.slate[500]} />
          </View>

          {/* Condition */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Condition</Text>
            <TextInput style={styles.input} value={condition}
              onChangeText={(v) => { setCondition(v); autoSave({ condition: v }); }}
              placeholder="What's wrong with it?" placeholderTextColor={colors.slate[500]} />
          </View>

          {/* Severity */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => {
                const config = severityConfig[s];
                const selected = severity === s;
                return (
                  <TouchableOpacity key={s}
                    style={[styles.severityPill, {
                      backgroundColor: selected ? config.bg : colors.white,
                      borderColor: selected ? config.color : colors.slate[300],
                    }]}
                    onPress={() => handleSeveritySelect(s)} activeOpacity={0.7}>
                    <Text style={[styles.severityText, { color: selected ? config.color : colors.slate[500] }]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Narrative */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Description</Text>
              {narrativeSource === 'ai' && <Text style={styles.aiTag}>AI Generated</Text>}
            </View>
            {generating ? (
              <View style={styles.generatingBox}>
                <Text style={styles.generatingText}>Generating description...</Text>
              </View>
            ) : (
              <TextInput style={[styles.input, styles.textArea]} value={narrative}
                onChangeText={handleNarrativeChange}
                placeholder="Finding description..." placeholderTextColor={colors.slate[500]}
                multiline numberOfLines={4} textAlignVertical="top" />
            )}
          </View>

          {/* Recommendation */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Recommendation</Text>
            <TextInput style={[styles.input, styles.textArea, { minHeight: 60 }]} value={recommendation}
              onChangeText={(v) => { setRecommendation(v); autoSave({ recommendation: v }); }}
              placeholder="Suggested action..." placeholderTextColor={colors.slate[500]}
              multiline numberOfLines={2} textAlignVertical="top" />
          </View>

          {/* Photos */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Photos ({photos.length}/10)</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <TouchableOpacity key={index} style={styles.photoThumb}
                  onPress={() => findingDocId.current && navigation.navigate('AnnotationEditor', {
                    inspectionId, findingId: findingDocId.current, photoIndex: index,
                  })}>
                  <Image source={{ uri: photo.thumbnailUrl || photo.storageUrl }} style={styles.photoImage} />
                  {photo.annotations.length > 0 && <View style={styles.annotationDot} />}
                </TouchableOpacity>
              ))}
              {photos.length < 10 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                  <Camera size={24} color={colors.teal[600]} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={18} color={colors.severity.critical} />
              <Text style={styles.deleteText}>Delete Finding</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <BottomActionBar>
          <Button title="Save" onPress={handleSave} loading={saving} fullWidth />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  fieldGroup: { marginBottom: spacing.xl },
  fieldLabel: { ...typography.captionMedium, color: colors.slate[700], marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  aiTag: { ...typography.caption, color: colors.teal[600], backgroundColor: colors.teal[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  input: { height: touchTargets.primaryButton, borderWidth: 1, borderColor: colors.slate[300], borderRadius: layout.borderRadius, paddingHorizontal: spacing.base, backgroundColor: colors.white, ...typography.body, color: colors.slate[900] },
  textArea: { height: 'auto' as any, minHeight: 100, paddingVertical: spacing.md },
  severityRow: { flexDirection: 'row', gap: spacing.sm },
  severityPill: { flex: 1, height: touchTargets.minimum, borderWidth: 1.5, borderRadius: layout.borderRadius, justifyContent: 'center', alignItems: 'center' },
  severityText: { ...typography.captionMedium },
  generatingBox: { height: 100, borderWidth: 1, borderColor: colors.slate[200], borderRadius: layout.borderRadius, backgroundColor: colors.slate[100], justifyContent: 'center', alignItems: 'center' },
  generatingText: { ...typography.body, color: colors.slate[500] },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoThumb: { width: '30%', aspectRatio: 1, borderRadius: layout.borderRadius, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  annotationDot: { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal[600] },
  addPhotoButton: { width: '30%', aspectRatio: 1, borderWidth: 1.5, borderColor: colors.teal[600], borderStyle: 'dashed', borderRadius: layout.borderRadius, justifyContent: 'center', alignItems: 'center' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, marginTop: spacing.base },
  deleteText: { ...typography.body, color: colors.severity.critical },
});
