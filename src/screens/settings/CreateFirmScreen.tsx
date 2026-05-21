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
import { Building2 } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { Button, BottomActionBar } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/constants/collections';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'CreateFirm'>;

interface FormErrors {
  firmName?: string;
  phone?: string;
  email?: string;
}

export function CreateFirmScreen({ navigation }: Props) {
  const { user } = useAuthContext();

  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!firmName.trim()) next.firmName = 'Firm name is required.';
    if (!phone.trim()) next.phone = 'Company phone is required.';
    if (!email.trim()) {
      next.email = 'Company email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (!validate() || !user) return;

    setSaving(true);
    try {
      const firmRef = firestore().collection(COLLECTIONS.FIRMS).doc();
      const batch = firestore().batch();

      batch.set(firmRef, {
        name: firmName.trim(),
        adminId: user.id,
        memberIds: [user.id],
        memberCount: 1,
        branding: {
          logoUrl: null,
          primaryColor: '#0D9488',
          companyPhone: phone.trim(),
          companyEmail: email.trim(),
          companyWebsite: website.trim() || null,
          reportFooterText: '',
        },
        status: 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      batch.update(firestore().collection(COLLECTIONS.USERS).doc(user.id), {
        firmId: firmRef.id,
        role: 'firm_admin',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Firm Created!', `"${firmName.trim()}" is now ready.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create firm. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
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
          {/* Header hint */}
          <View style={styles.hintCard}>
            <Building2 size={20} color={colors.teal[600]} />
            <Text style={styles.hintText}>
              Creating a firm lets you manage inspectors, share templates, and apply unified branding
              across all reports.
            </Text>
          </View>

          {/* Firm Name */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Firm Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.firmName ? styles.inputError : null]}
              value={firmName}
              onChangeText={(v) => { setFirmName(v); clearError('firmName'); }}
              placeholder="Acme Home Inspections"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors.firmName ? <Text style={styles.errorText}>{errors.firmName}</Text> : null}
          </View>

          {/* Company Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Company Phone <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={phone}
              onChangeText={(v) => { setPhone(v); clearError('phone'); }}
              placeholder="(555) 000-0000"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          {/* Company Email */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Company Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError('email'); }}
              placeholder="info@mycompany.com"
              placeholderTextColor={colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Company Website */}
          <View style={styles.field}>
            <Text style={styles.label}>Company Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://mycompany.com"
              placeholderTextColor={colors.slate[400]}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>
        </ScrollView>

        <BottomActionBar>
          <Button
            title="Create Firm"
            onPress={handleCreate}
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

  // Hint card
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.teal[50],
    borderRadius: layout.borderRadius,
    padding: spacing.md,
  },
  hintText: {
    ...typography.body,
    color: colors.teal[700],
    flex: 1,
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
});
