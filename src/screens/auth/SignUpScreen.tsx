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
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { signUpWithEmail } from '@/services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateForm(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');

    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }

    return valid;
  }

  async function handleSignUp() {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      // RootNavigator will detect 'unverified' state and show VerifyEmailScreen
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setEmailError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setEmailError('Enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setPasswordError('Password is too weak. Use at least 8 characters.');
      } else {
        setFormError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
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
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>INSPECTLY</Text>
          <Text style={styles.logoSub}>Create your account</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Form-level error */}
          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(''); setFormError(''); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); setPasswordError(''); setFormError(''); }}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.slate[400]}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, confirmPasswordError ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(''); setFormError(''); }}
              placeholder="Repeat your password"
              placeholderTextColor={colors.slate[400]}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            {confirmPasswordError ? (
              <Text style={styles.fieldError}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          {/* Create Account button */}
          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            fullWidth
          />
        </View>

        {/* Sign In link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
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
    paddingTop: 64,
    paddingBottom: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.teal[600],
    letterSpacing: 3,
  },
  logoSub: {
    ...typography.body,
    color: colors.slate[500],
    marginTop: spacing.xs,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.slate[500],
  },
  footerLink: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
});
