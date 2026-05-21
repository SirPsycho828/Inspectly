import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { Button, BottomActionBar } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/constants/collections';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!displayName.trim()) {
      next.displayName = 'Name is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setSaving(true);
    try {
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(user.id)
        .update({
          displayName: displayName.trim(),
          phone: phone.trim() || null,
          licenseNumber: licenseNumber.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
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
          {/* Display Name */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.displayName ? styles.inputError : null]}
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                if (errors.displayName) setErrors((e) => ({ ...e, displayName: undefined }));
              }}
              placeholder="Jane Smith"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors.displayName ? (
              <Text style={styles.errorText}>{errors.displayName}</Text>
            ) : null}
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          {/* License Number */}
          <View style={styles.field}>
            <Text style={styles.label}>License Number</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="HI-123456"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* Email (non-editable) */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>{user?.email ?? '—'}</Text>
            </View>
            <Text style={styles.helperText}>
              Email cannot be changed here. Use Account &amp; Security to manage email.
            </Text>
          </View>
        </ScrollView>

        <BottomActionBar>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
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
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  // Fields
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
  required: {
    color: colors.severity.critical,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.slate[900],
  },
  inputError: {
    borderColor: colors.severity.critical,
  },
  errorText: {
    ...typography.caption,
    color: colors.severity.critical,
  },
  helperText: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Read-only
  readonlyInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.slate[100],
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  readonlyText: {
    ...typography.body,
    color: colors.slate[500],
  },
});
