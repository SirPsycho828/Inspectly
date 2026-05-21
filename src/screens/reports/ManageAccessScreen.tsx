import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { Copy, Mail, RefreshCw, UserPlus, ShieldX, Clock } from 'lucide-react-native';

import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { Card, EmptyState, ListSkeleton, BottomActionBar, Button } from '@/components/ui';
import type { AccessCode, RecipientType } from '@/types';
import type { ReportsStackParamList } from '@/navigation/ReportsNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ManageAccess'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCodeStatus(code: AccessCode): 'revoked' | 'expired' | 'active' {
  if (code.revokedAt) return 'revoked';
  const now = Date.now();
  const expiry = code.expiresAt?.toDate?.().getTime() ?? 0;
  if (expiry < now) return 'expired';
  return 'active';
}

const statusConfig: Record<
  'active' | 'expired' | 'revoked',
  { label: string; color: string; bg: string }
> = {
  active:  { label: 'Active',   color: colors.success,        bg: colors.successBg        },
  expired: { label: 'Expired',  color: colors.severity.major, bg: colors.severity.majorBg },
  revoked: { label: 'Revoked',  color: colors.error,          bg: colors.errorBg          },
};

const recipientTypeConfig: Record<RecipientType, { label: string; color: string; bg: string }> = {
  client: { label: 'Client', color: colors.teal[700],        bg: colors.teal[50]              },
  agent:  { label: 'Agent',  color: colors.severity.info,    bg: colors.severity.infoBg        },
  other:  { label: 'Other',  color: colors.slate[500],       bg: colors.slate[100]             },
};

// ─── Access Code Card ─────────────────────────────────────────────────────────

function AccessCodeCard({
  code,
  onRevoke,
  onResend,
  revoking,
  resending,
}: {
  code: AccessCode;
  onRevoke: () => void;
  onResend: () => void;
  revoking: boolean;
  resending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const codeStatus = getCodeStatus(code);
  const statusCfg = statusConfig[codeStatus];
  const typeCfg = recipientTypeConfig[code.recipientType];

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card style={styles.codeCard}>
      {/* Header row: name + type badge + status badge */}
      <View style={styles.codeHeader}>
        <View style={styles.codeNameBlock}>
          <Text style={styles.codeName} numberOfLines={1}>
            {code.recipientName}
          </Text>
          <Text style={styles.codeEmail} numberOfLines={1}>
            {code.recipientEmail}
          </Text>
        </View>
        <View style={styles.codeBadges}>
          <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeCfg.color }]}>
              {typeCfg.label}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Code display */}
      <TouchableOpacity
        style={styles.codeDisplay}
        onPress={handleCopy}
        activeOpacity={0.7}
        accessibilityLabel="Copy access code"
      >
        <Text style={styles.codeText}>{code.code}</Text>
        <View style={styles.copyButton}>
          <Copy size={16} color={copied ? colors.success : colors.slate[500]} />
          {copied && <Text style={styles.copiedText}>Copied!</Text>}
        </View>
      </TouchableOpacity>

      {/* Actions for active codes */}
      {codeStatus === 'active' && (
        <View style={styles.codeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onResend}
            disabled={resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.teal[600]} />
            ) : (
              <RefreshCw size={15} color={colors.teal[600]} />
            )}
            <Text style={styles.actionButtonText}>
              {resending ? 'Sending...' : 'Resend'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onRevoke}
            disabled={revoking}
            activeOpacity={0.7}
          >
            {revoking ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <ShieldX size={15} color={colors.error} />
            )}
            <Text style={[styles.actionButtonText, styles.actionRevokeText]}>
              {revoking ? 'Revoking...' : 'Revoke'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expiry info for non-revoked codes */}
      {codeStatus !== 'revoked' && (
        <View style={styles.expiryRow}>
          <Clock size={12} color={colors.slate[400]} />
          <Text style={styles.expiryText}>
            {codeStatus === 'expired'
              ? 'Expired'
              : `Expires ${code.expiresAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? ''}`}
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Add Recipient Form ───────────────────────────────────────────────────────

function AddRecipientForm({
  reportId,
  onDone,
}: {
  reportId: string;
  onDone: () => void;
}) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0 && email.trim().includes('@');

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const addRecipient = callable('addReportRecipient');
      await addRecipient({ reportId, name: name.trim(), email: email.trim(), type: 'other' });
      setName('');
      setEmail('');
      onDone();
    } catch (err: any) {
      console.error('addReportRecipient error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to add recipient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.addForm}>
      <View style={styles.addFormHeader}>
        <UserPlus size={16} color={colors.teal[600]} />
        <Text style={styles.addFormTitle}>Add Recipient</Text>
      </View>

      <TextInput
        style={styles.formInput}
        placeholder="Recipient name"
        placeholderTextColor={colors.slate[400]}
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        returnKeyType="next"
      />
      <TextInput
        style={styles.formInput}
        placeholder="Email address"
        placeholderTextColor={colors.slate[400]}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <Button
        title={loading ? 'Adding...' : 'Add Recipient'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
        fullWidth
      />
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ManageAccessScreen({ route }: Props) {
  const { reportId } = route.params;

  const [codes, setCodes]             = useState<AccessCode[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [revokingId, setRevokingId]   = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // ── Firestore subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = firestore()
      .collection(COLLECTIONS.ACCESS_CODES(reportId))
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessCode));
          setCodes(docs);
          setLoading(false);
        },
        (err) => {
          console.error('ManageAccess snapshot error:', err);
          setLoading(false);
        }
      );

    return unsub;
  }, [reportId]);

  // ── Revoke access code ─────────────────────────────────────────────────────
  const handleRevoke = (code: AccessCode) => {
    Alert.alert(
      'Revoke Access Code',
      `This will immediately block ${code.recipientName} from accessing the report.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(code.id);
            try {
              const revokeCode = callable('revokeAccessCode');
              await revokeCode({ reportId, accessCodeId: code.id });
            } catch (err: any) {
              console.error('revokeAccessCode error:', err);
              Alert.alert('Error', err?.message ?? 'Failed to revoke access code.');
            } finally {
              setRevokingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Resend notification ────────────────────────────────────────────────────
  const handleResend = async (code: AccessCode) => {
    setResendingId(code.id);
    try {
      const resend = callable('resendNotification');
      await resend({ reportId, accessCodeId: code.id });
      Alert.alert('Sent', `Notification resent to ${code.recipientEmail}.`);
    } catch (err: any) {
      console.error('resendNotification error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to resend notification.');
    } finally {
      setResendingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {loading ? (
          <ListSkeleton rows={3} />
        ) : (
          <FlatList
            data={codes}
            keyExtractor={(c) => c.id}
            contentContainerStyle={
              codes.length === 0 && !showForm
                ? styles.emptyContainer
                : styles.listContent
            }
            renderItem={({ item }) => (
              <AccessCodeCard
                code={item}
                onRevoke={() => handleRevoke(item)}
                onResend={() => handleResend(item)}
                revoking={revokingId === item.id}
                resending={resendingId === item.id}
              />
            )}
            ListEmptyComponent={
              !showForm ? (
                <EmptyState
                  title="No access codes yet"
                  description="Add a recipient to generate an access code and send them a link to this report."
                  icon={<Mail size={48} color={colors.slate[300]} />}
                />
              ) : null
            }
            ListFooterComponent={
              showForm ? (
                <AddRecipientForm
                  reportId={reportId}
                  onDone={() => setShowForm(false)}
                />
              ) : null
            }
          />
        )}

        {/* Bottom action bar */}
        {!showForm && (
          <BottomActionBar>
            <Button
              title="Add Recipient"
              onPress={() => setShowForm(true)}
              fullWidth
            />
          </BottomActionBar>
        )}

        {showForm && (
          <BottomActionBar>
            <Button
              title="Cancel"
              onPress={() => setShowForm(false)}
              variant="secondary"
              fullWidth
            />
          </BottomActionBar>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },

  // List
  listContent: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] + touchTargets.bottomActionBar,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.base,
  },

  // Code card
  codeCard: {
    gap: spacing.sm,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  codeNameBlock: {
    flex: 1,
  },
  codeName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  codeEmail: {
    ...typography.caption,
    color: colors.slate[500],
    marginTop: 1,
  },
  codeBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 0,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: layout.pillRadius,
  },
  typeBadgeText: {
    ...typography.captionMedium,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: layout.pillRadius,
  },
  statusBadgeText: {
    ...typography.captionMedium,
  },

  // Code display
  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    letterSpacing: 3,
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  copiedText: {
    ...typography.captionMedium,
    color: colors.success,
  },

  // Code actions
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: touchTargets.minimum,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.slate[200],
  },
  actionButtonText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  actionRevokeText: {
    color: colors.error,
  },

  // Expiry
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiryText: {
    ...typography.caption,
    color: colors.slate[400],
  },

  // Add form
  addForm: {
    gap: spacing.md,
  },
  addFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  addFormTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.slate[900],
    height: touchTargets.minimum,
    backgroundColor: colors.white,
  },
});
