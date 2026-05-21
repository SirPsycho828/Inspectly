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
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { signInWithEmail } from '@/services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateForm(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');
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
    }

    return valid;
  }

  async function handleSignIn() {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // RootNavigator will react to auth state change automatically
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setFormError('Incorrect email or password.');
      } else if (code === 'auth/too-many-requests') {
        setFormError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/user-disabled') {
        setFormError('This account has been disabled.');
      } else {
        setFormError('Sign in failed. Please try again.');
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
          <Text style={styles.logoSub}>Sign in to your account</Text>
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
              placeholder="••••••••"
              placeholderTextColor={colors.slate[400]}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          {/* Forgot Password link */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In button */}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            fullWidth
            style={styles.primaryButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google OAuth button */}
          <Button
            title="Continue with Google"
            onPress={() => {
              // Google OAuth — to be wired up with Google Sign-In SDK
            }}
            variant="secondary"
            fullWidth
          />
        </View>

        {/* Sign Up link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.footerLink}>Sign Up</Text>
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.base,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  primaryButton: {
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
