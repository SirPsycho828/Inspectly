import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ProfileSetup'>;

export function ProfileSetupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [nameError, setNameError] = useState('');
  const [licenseError, setLicenseError] = useState('');

  function validateForm(): boolean {
    let valid = true;
    setNameError('');
    setLicenseError('');

    if (!name.trim()) {
      setNameError('Full name is required.');
      valid = false;
    }

    if (!licenseNumber.trim()) {
      setLicenseError('License number is required.');
      valid = false;
    }

    return valid;
  }

  function handleContinue() {
    if (!validateForm()) return;
    navigation.navigate('FirmJoin', {
      displayName: name.trim(),
      phone: phone.trim() || null,
      licenseNumber: licenseNumber.trim(),
    } as any);
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
        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={styles.logoText}>INSPECTLY</Text>
          <Text style={styles.stepLabel}>Step 1 of 2</Text>
          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.subheading}>
            Tell us about yourself. This information will appear on your inspection reports.
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(''); }}
              placeholder="Jane Smith"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Phone <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />
          </View>

          {/* License Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, licenseError ? styles.inputError : null]}
              value={licenseNumber}
              onChangeText={(v) => { setLicenseNumber(v); setLicenseError(''); }}
              placeholder="e.g. HI-123456"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {licenseError ? <Text style={styles.fieldError}>{licenseError}</Text> : null}
            <Text style={styles.helpText}>
              Your state-issued home inspector license number.
            </Text>
          </View>

          <Button
            title="Continue"
            onPress={handleContinue}
            fullWidth
          />
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
  fieldGroup: {
    marginBottom: spacing.base,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
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
});
