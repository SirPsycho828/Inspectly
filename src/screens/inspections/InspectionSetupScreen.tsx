import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Plus, X } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import { useAuthContext } from '@/contexts/AuthContext';
import { BottomActionBar, Button } from '@/components/ui';
import type {
  ChecklistTemplate,
  Inspection,
  PropertyType,
  Recipient,
  TemplateItem,
} from '@/types';
import type { InspectionsStackParamList } from '@/navigation/InspectionsNavigator';

type Props = NativeStackScreenProps<InspectionsStackParamList, 'InspectionSetup'>;

// ─── US States ────────────────────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo',         label: 'Condo'         },
  { value: 'townhouse',     label: 'Townhouse'      },
  { value: 'multi_family',  label: 'Multi-Family'   },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionToggle({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrapper}>
      <TouchableOpacity
        style={sectionStyles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={sectionStyles.title}>{title}</Text>
        {expanded
          ? <ChevronUp size={20} color={colors.slate[500]} />
          : <ChevronDown size={20} color={colors.slate[500]} />
        }
      </TouchableOpacity>
      {expanded && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    padding: spacing.base,
    gap: spacing.md,
  },
});

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.required}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { ...typography.captionMedium, color: colors.slate[700] },
  required: { color: colors.error },
  error: { ...typography.caption, color: colors.error, marginTop: 2 },
});

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoComplete,
  hasError,
  onBlur,
  maxLength,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  hasError?: boolean;
  onBlur?: () => void;
  maxLength?: number;
}) {
  return (
    <TextInput
      style={[inputStyles.input, hasError && inputStyles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.slate[400]}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      onBlur={onBlur}
      maxLength={maxLength}
    />
  );
}

const inputStyles = StyleSheet.create({
  input: {
    height: touchTargets.minimum,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
});

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidZip(v: string) {
  return /^\d{5}$/.test(v.trim());
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function InspectionSetupScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  // ── Section expanded state ─────────────────────────────────────────────────
  const [sec1Open, setSec1Open] = useState(true);
  const [sec2Open, setSec2Open] = useState(true);
  const [sec3Open, setSec3Open] = useState(true);

  // ── Property Details ───────────────────────────────────────────────────────
  const [address,      setAddress]      = useState('');
  const [city,         setCity]         = useState('');
  const [state,        setState]        = useState('');
  const [zip,          setZip]          = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('single_family');
  const [yearBuilt,    setYearBuilt]    = useState('');
  const [sqft,         setSqft]         = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);

  // ── Client & Agent ─────────────────────────────────────────────────────────
  const [clientName,  setClientName]  = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [agentName,   setAgentName]   = useState('');
  const [agentEmail,  setAgentEmail]  = useState('');
  const [agentPhone,  setAgentPhone]  = useState('');
  const [recipients,  setRecipients]  = useState<Recipient[]>([]);

  // ── Template selection ─────────────────────────────────────────────────────
  const [templates,           setTemplates]           = useState<ChecklistTemplate[]>([]);
  const [templatesLoading,    setTemplatesLoading]    = useState(true);
  const [selectedTemplateId,  setSelectedTemplateId]  = useState<string | null>(null);

  // ── Validation errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Submission ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load templates ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.CHECKLIST_TEMPLATES)
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChecklistTemplate));
          // Sort: default first, then system, then firm/custom
          docs.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });
          setTemplates(docs);
          setTemplatesLoading(false);
          // Pre-select default
          const def = docs.find((t) => t.isDefault) ?? docs[0];
          if (def && !selectedTemplateId) setSelectedTemplateId(def.id);
        },
        (err) => {
          console.error('Templates load error:', err);
          setTemplatesLoading(false);
        }
      );
    return unsub;
  }, []);

  // ── Additional recipients ──────────────────────────────────────────────────
  const addRecipient = useCallback(() => {
    if (recipients.length >= 5) return;
    setRecipients((prev) => [
      ...prev,
      { name: '', email: '', phone: null, type: 'other' },
    ]);
  }, [recipients.length]);

  const removeRecipient = useCallback((idx: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateRecipient = useCallback(
    (idx: number, field: keyof Recipient, value: string) => {
      setRecipients((prev) =>
        prev.map((r, i) =>
          i === idx ? { ...r, [field]: value || null } : r
        )
      );
    },
    []
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.trim())  newErrors.address  = 'Address is required';
    if (!city.trim())     newErrors.city     = 'City is required';
    if (!state.trim())    newErrors.state    = 'State is required';
    if (!zip.trim())      newErrors.zip      = 'ZIP is required';
    else if (!isValidZip(zip)) newErrors.zip = 'ZIP must be 5 digits';

    if (!clientName.trim())  newErrors.clientName  = 'Client name is required';
    if (!clientEmail.trim()) newErrors.clientEmail = 'Client email is required';
    else if (!isValidEmail(clientEmail))
      newErrors.clientEmail = 'Enter a valid email address';

    if (agentEmail && !isValidEmail(agentEmail))
      newErrors.agentEmail = 'Enter a valid email address';

    if (yearBuilt) {
      const yr = parseInt(yearBuilt, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yr) || yr < 1800 || yr > currentYear)
        newErrors.yearBuilt = `Enter a year between 1800 and ${currentYear}`;
    }
    if (sqft) {
      const n = parseInt(sqft, 10);
      if (isNaN(n) || n <= 0) newErrors.sqft = 'Enter a positive number';
    }
    if (!selectedTemplateId) newErrors.template = 'Select a checklist template';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleStartInspection = async () => {
    if (!validate()) return;
    if (!user || !selectedTemplateId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (!template) throw new Error('Selected template not found');

      const now = firestore.Timestamp.now();

      // 1. Create inspection document
      const inspectionRef = firestore().collection(COLLECTIONS.INSPECTIONS).doc();

      // Count total items across all sections
      const totalItems = template.sections.reduce(
        (sum, s) => sum + s.items.length,
        0
      );

      const inspectionData: Omit<Inspection, 'id'> = {
        inspectorId: user.id,
        firmId: user.firmId,
        status: 'in_progress',
        property: {
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          propertyType,
          yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : null,
          squareFootage: sqft ? parseInt(sqft, 10) : null,
        },
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || null,
        agentName: agentName.trim() || null,
        agentEmail: agentEmail.trim() || null,
        additionalRecipients: recipients.filter((r) => r.name || r.email),
        templateId: selectedTemplateId,
        checklistProgress: {
          total: totalItems,
          completed: 0,
          skipped: 0,
        },
        findingCounts: {
          critical: 0,
          major: 0,
          minor: 0,
          informational: 0,
        },
        startedAt: now,
        completedAt: null,
        publishedAt: null,
        reportId: null,
        createdAt: now,
        updatedAt: now,
      };

      await inspectionRef.set(inspectionData);

      // 2. Copy checklist items into checklistProgress subcollection (batch writes)
      const BATCH_LIMIT = 499;
      let batch = firestore().batch();
      let opCount = 0;

      for (const section of template.sections) {
        for (const item of section.items as TemplateItem[]) {
          const progressRef = firestore()
            .collection(COLLECTIONS.CHECKLIST_PROGRESS(inspectionRef.id))
            .doc(item.id);

          batch.set(progressRef, {
            id: item.id,
            sectionId: section.id,
            itemLabel: item.label,
            status: 'pending',
            findingCount: 0,
            inspectedAt: null,
            createdAt: now,
            updatedAt: now,
          });

          opCount++;
          if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = firestore().batch();
            opCount = 0;
          }
        }
      }

      if (opCount > 0) await batch.commit();

      // 3. Navigate to active inspection
      navigation.replace('ActiveInspection', { inspectionId: inspectionRef.id });
    } catch (err) {
      console.error('Start inspection error:', err);
      setSubmitError('Failed to start inspection. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Form completeness check (enables button) ───────────────────────────────
  const canSubmit =
    address.trim() &&
    city.trim() &&
    state.trim() &&
    zip.trim() &&
    clientName.trim() &&
    clientEmail.trim() &&
    !!selectedTemplateId;

  // ── Render template source badge text ─────────────────────────────────────
  const templateSourceLabel = (t: ChecklistTemplate): string => {
    if (t.ownerId === 'system') return 'System';
    if (t.firmId)               return 'Firm';
    return 'Custom';
  };

  const templateItemCount = (t: ChecklistTemplate): number =>
    t.sections.reduce((sum, s) => sum + s.items.length, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Section 1: Property Details ─────────────────────────────── */}
          <SectionToggle
            title="Property Details"
            expanded={sec1Open}
            onToggle={() => setSec1Open((v) => !v)}
          >
            <FormField label="Street Address" required error={errors.address}>
              <StyledInput
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St"
                autoCapitalize="words"
                hasError={!!errors.address}
                onBlur={() => {
                  if (!address.trim()) setErrors((e) => ({ ...e, address: 'Address is required' }));
                  else setErrors((e) => { const n = { ...e }; delete n.address; return n; });
                }}
              />
            </FormField>

            <View style={styles.row}>
              <View style={styles.flex}>
                <FormField label="City" required error={errors.city}>
                  <StyledInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Springfield"
                    autoCapitalize="words"
                    hasError={!!errors.city}
                  />
                </FormField>
              </View>
              <View style={styles.stateField}>
                <FormField label="State" required error={errors.state}>
                  <TouchableOpacity
                    style={[
                      inputStyles.input,
                      styles.stateButton,
                      errors.state ? inputStyles.inputError : null,
                    ]}
                    onPress={() => setShowStatePicker((v) => !v)}
                  >
                    <Text style={[typography.body, { color: state ? colors.slate[900] : colors.slate[400] }]}>
                      {state || 'ST'}
                    </Text>
                    <ChevronDown size={14} color={colors.slate[400]} />
                  </TouchableOpacity>
                </FormField>
              </View>
              <View style={styles.zipField}>
                <FormField label="ZIP" required error={errors.zip}>
                  <StyledInput
                    value={zip}
                    onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))}
                    placeholder="62701"
                    keyboardType="numeric"
                    hasError={!!errors.zip}
                    maxLength={5}
                  />
                </FormField>
              </View>
            </View>

            {/* Inline state picker */}
            {showStatePicker && (
              <View style={styles.statePicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.stateGrid}>
                    {US_STATES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.stateOption,
                          state === s && styles.stateOptionSelected,
                        ]}
                        onPress={() => {
                          setState(s);
                          setShowStatePicker(false);
                          setErrors((e) => { const n = { ...e }; delete n.state; return n; });
                        }}
                      >
                        <Text style={[
                          styles.stateOptionText,
                          state === s && styles.stateOptionTextSelected,
                        ]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Property Type segmented control */}
            <FormField label="Property Type" required>
              <View style={styles.segmentedControl}>
                {PROPERTY_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.segment,
                      propertyType === pt.value && styles.segmentActive,
                    ]}
                    onPress={() => setPropertyType(pt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.segmentText,
                      propertyType === pt.value && styles.segmentTextActive,
                    ]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormField>

            <View style={styles.row}>
              <View style={styles.flex}>
                <FormField label="Year Built" error={errors.yearBuilt}>
                  <StyledInput
                    value={yearBuilt}
                    onChangeText={(v) => setYearBuilt(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1985"
                    keyboardType="numeric"
                    hasError={!!errors.yearBuilt}
                    maxLength={4}
                  />
                </FormField>
              </View>
              <View style={styles.flex}>
                <FormField label="Sq Ft" error={errors.sqft}>
                  <StyledInput
                    value={sqft}
                    onChangeText={(v) => setSqft(v.replace(/\D/g, ''))}
                    placeholder="2100"
                    keyboardType="numeric"
                    hasError={!!errors.sqft}
                  />
                </FormField>
              </View>
            </View>
          </SectionToggle>

          {/* ── Section 2: Client & Agent ────────────────────────────────── */}
          <SectionToggle
            title="Client & Agent"
            expanded={sec2Open}
            onToggle={() => setSec2Open((v) => !v)}
          >
            <Text style={styles.subheading}>Client</Text>

            <FormField label="Client Name" required error={errors.clientName}>
              <StyledInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="Jane Smith"
                autoCapitalize="words"
                hasError={!!errors.clientName}
              />
            </FormField>

            <FormField label="Client Email" required error={errors.clientEmail}>
              <StyledInput
                value={clientEmail}
                onChangeText={setClientEmail}
                placeholder="jane@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                hasError={!!errors.clientEmail}
              />
            </FormField>

            <FormField label="Client Phone">
              <StyledInput
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="(555) 000-0000"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </FormField>

            <View style={styles.divider} />
            <Text style={styles.subheading}>Agent</Text>

            <FormField label="Agent Name">
              <StyledInput
                value={agentName}
                onChangeText={setAgentName}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </FormField>

            <FormField label="Agent Email" error={errors.agentEmail}>
              <StyledInput
                value={agentEmail}
                onChangeText={setAgentEmail}
                placeholder="agent@realty.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                hasError={!!errors.agentEmail}
              />
            </FormField>

            <FormField label="Agent Phone">
              <StyledInput
                value={agentPhone}
                onChangeText={setAgentPhone}
                placeholder="(555) 000-0000"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </FormField>

            {/* Additional recipients */}
            {recipients.map((r, idx) => (
              <View key={idx} style={styles.recipientRow}>
                <View style={styles.recipientFields}>
                  <StyledInput
                    value={r.name}
                    onChangeText={(v) => updateRecipient(idx, 'name', v)}
                    placeholder="Recipient name"
                    autoCapitalize="words"
                  />
                  <StyledInput
                    value={r.email}
                    onChangeText={(v) => updateRecipient(idx, 'email', v)}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={() => removeRecipient(idx)} hitSlop={8}>
                  <X size={18} color={colors.slate[400]} />
                </TouchableOpacity>
              </View>
            ))}

            {recipients.length < 5 && (
              <TouchableOpacity style={styles.addRecipientLink} onPress={addRecipient}>
                <Plus size={14} color={colors.teal[600]} />
                <Text style={styles.addRecipientText}>Add recipient</Text>
              </TouchableOpacity>
            )}
          </SectionToggle>

          {/* ── Section 3: Checklist Template ───────────────────────────── */}
          <SectionToggle
            title="Checklist Template"
            expanded={sec3Open}
            onToggle={() => setSec3Open((v) => !v)}
          >
            {templatesLoading ? (
              <ActivityIndicator color={colors.teal[600]} />
            ) : templates.length === 0 ? (
              <Text style={styles.noTemplateText}>No templates available.</Text>
            ) : templates.length === 1 ? (
              <View style={styles.singleTemplate}>
                <Text style={styles.singleTemplateName}>{templates[0].name}</Text>
                <Text style={styles.singleTemplateMeta}>
                  {templateItemCount(templates[0])} items · {templates[0].sections.length} sections
                </Text>
              </View>
            ) : (
              templates.map((t) => {
                const selected = t.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateRow, selected && styles.templateRowSelected]}
                    onPress={() => {
                      setSelectedTemplateId(t.id);
                      setErrors((e) => { const n = { ...e }; delete n.template; return n; });
                    }}
                    activeOpacity={0.7}
                  >
                    {selected
                      ? <CheckCircle size={20} color={colors.teal[600]} />
                      : <Circle size={20} color={colors.slate[300]} />
                    }
                    <View style={styles.flex}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templateMeta}>
                        {templateItemCount(t)} items · {t.sections.length} sections
                      </Text>
                    </View>
                    <View style={[
                      styles.sourceTag,
                      t.ownerId === 'system' && styles.sourceTagSystem,
                      t.firmId   && styles.sourceTagFirm,
                    ]}>
                      <Text style={styles.sourceTagText}>{templateSourceLabel(t)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            {errors.template && (
              <Text style={fieldStyles.error}>{errors.template}</Text>
            )}
          </SectionToggle>

          {/* Bottom spacer for action bar */}
          <View style={{ height: touchTargets.bottomActionBar + spacing.base }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <BottomActionBar>
        {submitError && (
          <Text style={styles.submitError}>{submitError}</Text>
        )}
        <Button
          title={submitting ? 'Starting…' : 'Start Inspection'}
          onPress={handleStartInspection}
          disabled={!canSubmit || submitting}
          loading={submitting}
          fullWidth
        />
      </BottomActionBar>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.slate[50] },
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.base,
    paddingTop: spacing.md,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  stateField: { width: 56 },
  zipField:   { width: 80 },
  stateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },

  // State picker
  statePicker: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    maxHeight: 120,
    overflow: 'hidden',
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  stateOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.slate[100],
  },
  stateOptionSelected: {
    backgroundColor: colors.teal[600],
  },
  stateOptionText: {
    ...typography.captionMedium,
    color: colors.slate[700],
  },
  stateOptionTextSelected: {
    color: colors.white,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.teal[600],
  },
  segmentText: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.white,
  },

  // Contact section
  subheading: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginVertical: spacing.xs,
  },

  // Recipients
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: spacing.sm,
  },
  recipientFields: {
    flex: 1,
    gap: spacing.xs,
  },
  addRecipientLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  addRecipientText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },

  // Template list
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
  },
  templateRowSelected: {
    borderColor: colors.teal[600],
    backgroundColor: colors.teal[50],
  },
  templateName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  templateMeta: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },
  sourceTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
  },
  sourceTagSystem: {
    backgroundColor: colors.severity.infoBg,
  },
  sourceTagFirm: {
    backgroundColor: colors.successBg,
  },
  sourceTagText: {
    ...typography.captionMedium,
    color: colors.slate[500],
  },

  singleTemplate: {
    paddingVertical: spacing.sm,
  },
  singleTemplateName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  singleTemplateMeta: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 2,
  },

  noTemplateText: {
    ...typography.body,
    color: colors.slate[500],
  },

  // Submit error
  submitError: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
