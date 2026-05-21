import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock, Trash2, AlertTriangle } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import { firebase } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { callable } from '@/services/firebase';
import { Button } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { signOut } from '@/services/auth';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AccountSecurity'>;

export function AccountSecurityScreen(_props: Props) {
  const { user, firebaseUser } = useAuthContext();

  const isPasswordProvider = firebaseUser?.providerData.some(
    (p) => p.providerId === 'password'
  ) ?? false;
  const isGoogleOnly =
    firebaseUser?.providerData.every((p) => p.providerId === 'google.com') ?? false;

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account state
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !currentUser.email) throw new Error('Not authenticated');

      // Reauthenticate first
      const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await currentUser.reauthenticateWithCredential(credential);

      // Now update password
      await currentUser.updatePassword(newPassword);

      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been updated.');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setPasswordError('New password is too weak. Use at least 8 characters.');
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This cannot be undone. Your account, inspections, and data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const deleteAccount = callable('deleteAccount');
      await deleteAccount();
      await signOut();
    } catch {
      setDeletingAccount(false);
      Alert.alert('Error', 'Failed to delete account. Please contact support.');
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
          {/* ── Email ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Mail size={18} color={colors.teal[600]} />
              <Text style={styles.sectionTitle}>Email Address</Text>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyValue}>{user?.email ?? '—'}</Text>
            </View>
            <Text style={styles.helperText}>
              Your email address is used for sign-in and report delivery.
            </Text>
          </View>

          {/* ── Password ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Lock size={18} color={colors.teal[600]} />
              <Text style={styles.sectionTitle}>Password</Text>
            </View>

            {isGoogleOnly ? (
              <View style={styles.infoBox}>
                <AlertTriangle size={16} color={colors.severity.info} />
                <Text style={styles.infoBoxText}>
                  You signed in with Google. Password changes are managed through your Google account.
                </Text>
              </View>
            ) : (
              <>
                {!showPasswordForm ? (
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => setShowPasswordForm(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionText}>Change Password</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.passwordForm}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Current Password</Text>
                      <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor={colors.slate[400]}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>New Password</Text>
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="At least 8 characters"
                        placeholderTextColor={colors.slate[400]}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Confirm New Password</Text>
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor={colors.slate[400]}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleChangePassword}
                      />
                    </View>

                    {passwordError && (
                      <Text style={styles.errorText}>{passwordError}</Text>
                    )}

                    <View style={styles.formButtons}>
                      <Button
                        title="Cancel"
                        onPress={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError(null);
                        }}
                        variant="secondary"
                        style={styles.formButtonHalf}
                      />
                      <Button
                        title="Update"
                        onPress={handleChangePassword}
                        loading={savingPassword}
                        style={styles.formButtonHalf}
                      />
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── Danger Zone ── */}
          <View style={[styles.sectionCard, styles.dangerCard]}>
            <View style={styles.sectionTitleRow}>
              <Trash2 size={18} color={colors.severity.critical} />
              <Text style={[styles.sectionTitle, styles.dangerTitle]}>Delete Account</Text>
            </View>
            <Text style={styles.dangerDescription}>
              Permanently deletes your account, all your inspections, reports, and associated data.
              This action cannot be reversed.
            </Text>
            <Button
              title={deletingAccount ? 'Deleting…' : 'Delete My Account'}
              onPress={handleDeleteAccount}
              variant="destructive"
              loading={deletingAccount}
            />
          </View>
        </ScrollView>
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
    gap: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Cards
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    padding: spacing.base,
    gap: spacing.md,
  },
  dangerCard: {
    borderColor: colors.severity.critical + '40',
    backgroundColor: colors.severity.criticalBg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  dangerTitle: {
    color: colors.severity.critical,
  },

  // Email readonly
  readonlyRow: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    backgroundColor: colors.slate[100],
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  readonlyValue: {
    ...typography.body,
    color: colors.slate[600],
  },
  helperText: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Info box (Google-only)
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.severity.infoBg,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
  },
  infoBoxText: {
    ...typography.body,
    color: colors.severity.info,
    flex: 1,
  },

  // Change password action
  actionRow: {
    minHeight: touchTargets.listItem,
    justifyContent: 'center',
  },
  actionText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },

  // Password form
  passwordForm: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
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
  errorText: {
    ...typography.caption,
    color: colors.severity.critical,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formButtonHalf: {
    flex: 1,
  },

  // Danger zone
  dangerDescription: {
    ...typography.body,
    color: colors.slate[600],
  },
});
