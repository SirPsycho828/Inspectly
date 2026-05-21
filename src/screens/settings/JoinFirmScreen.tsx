import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UserPlus } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { Button, BottomActionBar } from '@/components/ui';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'JoinFirm'>;

export function JoinFirmScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleCodeChange = (value: string) => {
    setServerError(null);
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;
    setServerError(null);
    setLoading(true);

    try {
      const redeemFirmInvite = callable('redeemFirmInvite');
      const result = await redeemFirmInvite({ code });
      const data = result.data as { firmName?: string };

      Alert.alert(
        'Welcome!',
        `You've joined${data?.firmName ? ` ${data.firmName}` : ' the firm'}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      // Cloud Functions errors come through as err.message or err.details
      const msg: string = err?.message ?? '';

      if (msg.includes('not-found') || msg.includes('invalid')) {
        setServerError('That invite code is invalid. Check the code and try again.');
      } else if (msg.includes('expired')) {
        setServerError('This invite code has expired. Ask your firm admin for a new one.');
      } else if (msg.includes('already-used') || msg.includes('used')) {
        setServerError('This invite code has already been used.');
      } else if (msg.includes('already-member') || msg.includes('already in')) {
        setServerError('You are already a member of a firm.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon + description */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <UserPlus size={32} color={colors.teal[600]} />
            </View>
            <Text style={styles.headline}>Enter Invite Code</Text>
            <Text style={styles.subheadline}>
              Ask your firm administrator for a 6-character invite code to join their firm.
            </Text>
          </View>

          {/* Code input */}
          <View style={styles.codeContainer}>
            <TextInput
              style={[styles.codeInput, serverError ? styles.codeInputError : null]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="XXXXXX"
              placeholderTextColor={colors.slate[300]}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleJoin}
              autoFocus
            />
            <Text style={styles.charCount}>{code.length}/6</Text>
          </View>

          {/* Server error */}
          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          {/* Helper */}
          <Text style={styles.helperText}>
            Codes are case-insensitive and expire after 48 hours.
          </Text>
        </ScrollView>

        <BottomActionBar>
          <Button
            title={loading ? 'Joining…' : 'Join Firm'}
            onPress={handleJoin}
            loading={loading}
            disabled={code.length !== 6}
            fullWidth
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: layout.screenPaddingH,
    gap: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },

  // Header
  headerSection: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    ...typography.headingLg,
    color: colors.slate[900],
    textAlign: 'center',
  },
  subheadline: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 22,
  },

  // Code input
  codeContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  codeInput: {
    height: 64,
    width: '70%',
    borderWidth: 2,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 8,
    color: colors.slate[900],
  },
  codeInputError: {
    borderColor: colors.severity.critical,
  },
  charCount: {
    ...typography.caption,
    color: colors.slate[400],
  },

  // Error
  errorBox: {
    backgroundColor: colors.severity.criticalBg,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    width: '100%',
  },
  errorText: {
    ...typography.body,
    color: colors.severity.critical,
    textAlign: 'center',
  },

  // Helper
  helperText: {
    ...typography.caption,
    color: colors.slate[400],
    textAlign: 'center',
  },
});
