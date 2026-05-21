// Publish Confirm — review recipients, summary, and confirm report delivery
// Based on docs/planning/13_Report_Publish_Delivery.md

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import {
  MapPin,
  Calendar,
  Mail,
  Phone,
  User,
  UserPlus,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { colors, typography, spacing, touchTargets, layout, severityConfig } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { Button, BottomActionBar, SeverityBadge, Card } from '@/components/ui';
import { COLLECTIONS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';
import type { Inspection, Recipient, FindingCounts } from '@/types';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'PublishConfirm'>;

// ─── Recipient toggle row ──────────────────────────────────────────────────────

interface RecipientRowProps {
  label: string;
  name: string;
  email: string;
  phone?: string | null;
  enabled: boolean;
  onToggle: (val: boolean) => void;
}

function RecipientRow({ label, name, email, phone, enabled, onToggle }: RecipientRowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconCol}>
        <User size={16} color={colors.slate[400]} />
      </View>
      <View style={rowStyles.info}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.label}>{label}</Text>
          <Text style={rowStyles.name}>{name}</Text>
        </View>
        <View style={rowStyles.detail}>
          <Mail size={12} color={colors.slate[400]} />
          <Text style={rowStyles.detailText}>{email}</Text>
        </View>
        {phone ? (
          <View style={rowStyles.detail}>
            <Phone size={12} color={colors.slate[400]} />
            <Text style={rowStyles.detailText}>{phone}</Text>
          </View>
        ) : null}
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.slate[200], true: colors.teal[600] }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    gap: spacing.sm,
  },
  iconCol: {
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.captionMedium,
    color: colors.teal[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...typography.caption,
    color: colors.slate[500],
  },
});

// ─── Additional recipient row ──────────────────────────────────────────────────

interface AdditionalRecipientState {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: 'agent' | 'attorney' | 'other';
  enabled: boolean;
}

// ─── Finding count row ────────────────────────────────────────────────────────

function FindingCountRow({
  severity,
  count,
}: {
  severity: keyof FindingCounts;
  count: number;
}) {
  const config = severityConfig[severity];
  return (
    <View style={countStyles.row}>
      <SeverityBadge severity={severity} />
      <Text style={[countStyles.count, { color: config.color }]}>{count}</Text>
    </View>
  );
}

const countStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  count: {
    ...typography.headingMd,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PublishConfirmScreen({ route, navigation }: Props) {
  const { inspectionId } = route.params;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);

  // Recipient toggles — client is always present; agent is optional
  const [clientEnabled, setClientEnabled] = useState(true);
  const [agentEnabled, setAgentEnabled] = useState(true);

  // Additional recipients (from inspection doc + locally added)
  const [additionalRecipients, setAdditionalRecipients] = useState<AdditionalRecipientState[]>([]);

  // Inline add-recipient form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Disclaimer
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);

  // Report settings (inspector name/license displayed on report)
  const [displayName, setDisplayName] = useState('');
  const [displayLicense, setDisplayLicense] = useState('');

  // Executive summary (loaded from inspection doc)
  const [executiveSummary, setExecutiveSummary] = useState('');

  // ── Subscribe to inspection doc ──────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.INSPECTIONS)
      .doc(inspectionId)
      .onSnapshot(
        (doc) => {
          if (!doc.exists) return;
          const data = { id: doc.id, ...doc.data() } as Inspection;
          setInspection(data);

          // Seed additional recipients from doc (one-time seed, preserve toggles)
          setAdditionalRecipients((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const fromDoc: AdditionalRecipientState[] = (data.additionalRecipients || [])
              .filter((r) => !existingIds.has(r.email))
              .map((r: Recipient) => ({
                id: r.email,
                name: r.name,
                email: r.email,
                phone: r.phone,
                type: r.type,
                enabled: true,
              }));
            return [...prev, ...fromDoc];
          });

          // Seed executive summary if available
          const docData = doc.data() as any;
          if (docData.executiveSummary) setExecutiveSummary(docData.executiveSummary);

          setLoading(false);
        },
        (err) => {
          console.error('PublishConfirm inspection error:', err);
          setLoading(false);
        }
      );
    return unsub;
  }, [inspectionId]);

  // ── Add inline recipient ─────────────────────────────────────────────────
  const handleAddRecipient = () => {
    const trimName = newName.trim();
    const trimEmail = newEmail.trim().toLowerCase();
    if (!trimName || !trimEmail || !trimEmail.includes('@')) {
      Alert.alert('Invalid Recipient', 'Please enter a valid name and email address.');
      return;
    }
    const newEntry: AdditionalRecipientState = {
      id: `local-${Date.now()}`,
      name: trimName,
      email: trimEmail,
      phone: null,
      type: 'other',
      enabled: true,
    };
    setAdditionalRecipients((prev) => [...prev, newEntry]);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleToggleAdditional = (id: string, val: boolean) => {
    setAdditionalRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: val } : r))
    );
  };

  // ── Publish ──────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!disclaimerChecked) return;
    setPublishing(true);
    try {
      const fn = callable('publishReport');
      const result = await fn({
        inspectionId,
        recipients: additionalRecipients.filter((r) => r.enabled),
        executiveSummary,
        reportSettings: { displayName, displayLicense },
      });
      const { reportId } = result.data as {
        reportId: string;
        accessCodes: Array<{
          recipientName: string;
          recipientEmail: string;
          recipientType: string;
          code: string;
        }>;
      };
      navigation.navigate('PublishSuccess', { inspectionId, reportId });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to publish report.');
      setPublishing(false);
    }
  };

  // ── Format date ──────────────────────────────────────────────────────────
  const formatDate = (ts: any): string => {
    if (!ts) return '';
    try {
      const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const property = inspection?.property;
  const addressLine = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : '';
  const findingCounts = inspection?.findingCounts ?? { critical: 0, major: 0, minor: 0, informational: 0 };
  const totalFindings =
    findingCounts.critical + findingCounts.major + findingCounts.minor + findingCounts.informational;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Property info ─────────────────────────────────────────────── */}
          <Card style={styles.propertyCard}>
            <View style={styles.propertyRow}>
              <MapPin size={18} color={colors.teal[600]} />
              <Text style={styles.propertyAddress} numberOfLines={2}>
                {addressLine || 'Loading address…'}
              </Text>
            </View>
            {inspection?.startedAt ? (
              <View style={styles.propertyRow}>
                <Calendar size={16} color={colors.slate[400]} />
                <Text style={styles.propertyDate}>{formatDate(inspection.startedAt)}</Text>
              </View>
            ) : null}
          </Card>

          {/* ── Recipients ───────────────────────────────────────────────── */}
          <Card>
            <Text style={styles.cardTitle}>Recipients</Text>

            {/* Client */}
            {inspection ? (
              <RecipientRow
                label="Client"
                name={inspection.clientName}
                email={inspection.clientEmail}
                phone={inspection.clientPhone}
                enabled={clientEnabled}
                onToggle={setClientEnabled}
              />
            ) : null}

            {/* Agent */}
            {inspection?.agentName && inspection?.agentEmail ? (
              <RecipientRow
                label="Agent"
                name={inspection.agentName}
                email={inspection.agentEmail}
                enabled={agentEnabled}
                onToggle={setAgentEnabled}
              />
            ) : null}

            {/* Additional recipients */}
            {additionalRecipients.map((r) => (
              <RecipientRow
                key={r.id}
                label={r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                name={r.name}
                email={r.email}
                phone={r.phone}
                enabled={r.enabled}
                onToggle={(val) => handleToggleAdditional(r.id, val)}
              />
            ))}

            {/* Add recipient */}
            {showAddForm ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Full name"
                  placeholderTextColor={colors.slate[400]}
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.addInput}
                  placeholder="Email address"
                  placeholderTextColor={colors.slate[400]}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.addFormButtons}>
                  <TouchableOpacity
                    style={styles.addFormCancel}
                    onPress={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addFormCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addFormConfirm}
                    onPress={handleAddRecipient}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addFormConfirmText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addRecipientButton}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.7}
              >
                <UserPlus size={16} color={colors.teal[600]} />
                <Text style={styles.addRecipientText}>Add Recipient</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* ── Report summary ───────────────────────────────────────────── */}
          <Card>
            <Text style={styles.cardTitle}>Report Summary</Text>

            {totalFindings > 0 ? (
              <>
                <FindingCountRow severity="critical" count={findingCounts.critical} />
                <FindingCountRow severity="major" count={findingCounts.major} />
                <FindingCountRow severity="minor" count={findingCounts.minor} />
                <FindingCountRow severity="informational" count={findingCounts.informational} />
              </>
            ) : (
              <View style={styles.noFindingsRow}>
                <Text style={styles.noFindingsText}>No findings recorded</Text>
              </View>
            )}

            <View style={styles.summaryMetaRow}>
              <View style={styles.summaryMetaCell}>
                <Text style={styles.summaryMetaCount}>{totalFindings}</Text>
                <Text style={styles.summaryMetaLabel}>Total Findings</Text>
              </View>
              <View style={styles.summaryMetaDivider} />
              <View style={styles.summaryMetaCell}>
                <Text style={styles.summaryMetaCount}>
                  {inspection?.checklistProgress?.total ?? 0}
                </Text>
                <Text style={styles.summaryMetaLabel}>Items Inspected</Text>
              </View>
            </View>
          </Card>

          {/* ── Disclaimer ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.disclaimer}
            onPress={() => setDisclaimerChecked((v) => !v)}
            activeOpacity={0.7}
          >
            {disclaimerChecked ? (
              <CheckSquare size={22} color={colors.teal[600]} />
            ) : (
              <Square size={22} color={colors.slate[400]} />
            )}
            <Text style={styles.disclaimerText}>
              I confirm this report is complete and ready for delivery
            </Text>
          </TouchableOpacity>

          {/* Spacer for bottom bar */}
          <View style={{ height: touchTargets.bottomActionBar + spacing.xl }} />
        </ScrollView>

        {/* ── Bottom action bar ────────────────────────────────────────────── */}
        <BottomActionBar>
          <Button
            title={publishing ? 'Publishing…' : 'Publish Report'}
            onPress={handlePublish}
            loading={publishing}
            disabled={!disclaimerChecked || loading}
            fullWidth
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    gap: spacing.base,
  },

  // Property card
  propertyCard: {
    gap: spacing.sm,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  propertyAddress: {
    ...typography.headingMd,
    color: colors.slate[900],
    flex: 1,
  },
  propertyDate: {
    ...typography.body,
    color: colors.slate[500],
  },

  // Card title
  cardTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
    marginBottom: spacing.xs,
  },

  // Add recipient
  addRecipientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    marginTop: spacing.xs,
  },
  addRecipientText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },

  // Add recipient inline form
  addForm: {
    marginTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: spacing.md,
  },
  addInput: {
    height: touchTargets.minimum,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.white,
    ...typography.body,
    color: colors.slate[900],
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  addFormCancel: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  addFormCancelText: {
    ...typography.bodyMedium,
    color: colors.slate[500],
  },
  addFormConfirm: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.teal[600],
    borderRadius: layout.borderRadius,
  },
  addFormConfirmText: {
    ...typography.bodyMedium,
    color: colors.white,
  },

  // Finding counts
  noFindingsRow: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  noFindingsText: {
    ...typography.body,
    color: colors.slate[400],
  },

  // Summary meta
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  summaryMetaCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryMetaDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.slate[200],
  },
  summaryMetaCount: {
    ...typography.headingLg,
    color: colors.slate[900],
  },
  summaryMetaLabel: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    padding: layout.cardPadding,
  },
  disclaimerText: {
    ...typography.body,
    color: colors.slate[700],
    flex: 1,
    lineHeight: 22,
  },
});
