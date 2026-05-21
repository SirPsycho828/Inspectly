import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { completeOnboarding } from '@/services/auth';

// FirmJoin receives profile data forwarded from ProfileSetupScreen via route params.
// The OnboardingStackParamList uses `undefined` for FirmJoin, so we read params
// permissively — the navigator typing can be tightened later.
type Props = NativeStackScreenProps<OnboardingStackParamList, 'FirmJoin'>;

interface ProfileParams {
  displayName: string;
  phone: string | null;
  licenseNumber: string;
}

export function FirmJoinScreen({ navigation, route }: Props) {
  const profileParams = (route.params as unknown as ProfileParams | undefined) ?? {
    displayName: '',
    phone: null,
    licenseNumber: '',
  };

  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [formError, setFormError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  async function handleJoinFirm() {
    setInviteCodeError('');
    setFormError('');

    if (!inviteCode.trim()) {
      setInviteCodeError('Please enter an invite code.');
      return;
    }

    setJoinLoading(true);
    try {
      await completeOnboarding({
        displayName: profileParams.displayName,
        phone: profileParams.phone,
        licenseNumber: profileParams.licenseNumber,
        firmInviteCode: inviteCode.trim().toUpperCase(),
      });
      // RootNavigator will detect 'authenticated' state and navigate to Main
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'functions/not-found' || err?.message?.includes('invite')) {
        setInviteCodeError('Invite code not found or expired.');
      } else if (code === 'functions/already-exists') {
        setInviteCodeError('This invite code has already been used.');
      } else {
        setFormError('Could not join the firm. Please check the code and try again.');
      }
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleSkip() {
    setFormError('');
    setSkipLoading(true);
    try {
      await completeOnboarding({
        displayName: profileParams.displayName,
        phone: profileParams.phone,
        licenseNumber: profileParams.licenseNumber,
      });
      // RootNavigator will detect 'authenticated' state and navigate to Main
    } catch {
      setFormError('Something went wrong. Please try again.');
      setSkipLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={styles.logoText}>INSPECTLY</Text>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>
          <Text style={styles.heading}>Join a firm</Text>
          <Text style={styles.subheading}>
            If your firm has an invite code, enter it below. You can always join or create a firm later from settings.
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Form-level error */}
          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Invite Code */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Firm Invite Code <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, inviteCodeError ? styles.inputError : null]}
              value={inviteCode}
              onChangeText={(v) => { setInviteCode(v); setInviteCodeError(''); setFormError(''); }}
              placeholder="e.g. ACME-2024"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleJoinFirm}
            />
            {inviteCodeError ? (
              <Text style={styles.fieldError}>{inviteCodeError}</Text>
            ) : null}
            <Text style={styles.helpText}>
              Ask your firm administrator for an invite code.
            </Text>
          </View>

          {/* Join Firm button */}
          <Button
            title="Join Firm"
            onPress={handleJoinFirm}
            loading={joinLoading}
            disabled={skipLoading}
            fullWidth
            style={styles.joinButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Skip button */}
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            loading={skipLoading}
            disabled={joinLoading}
            variant="ghost"
            fullWidth
          />
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            You can create your own firm or join one from your account settings after signing in.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: 56,
    paddingBottom: 32,
  },
  backLink: {
    marginBottom: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLinkText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.teal[600],
    letterSpacing: 3,
    marginBottom: spacing.md,
  },
  stepLabel: {
    ...typography.captionMedium,
    color: colors.teal[600],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  heading: {
    ...typography.headingXl,
    color: colors.slate[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    padding: layout.cardPadding,
  },
  formErrorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  formErrorText: {
    ...typography.body,
    color: colors.error,
  },
  fieldGroup: {
    marginBottom: spacing.base,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
    marginBottom: spacing.xs,
  },
  optional: {
    ...typography.caption,
    color: colors.slate[400],
    fontWeight: '400',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helpText: {
    ...typography.caption,
    color: colors.slate[400],
    marginTop: spacing.xs,
  },
  joinButton: {
    marginBottom: spacing.base,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  dividerText: {
    ...typography.caption,
    color: colors.slate[400],
    marginHorizontal: spacing.sm,
  },
  infoNote: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  infoNoteText: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 18,
  },
});
