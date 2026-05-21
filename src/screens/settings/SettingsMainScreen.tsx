import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  Shield,
  ListChecks,
  MessageSquare,
  Palette,
  Building2,
  UserPlus,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { useAuthContext } from '@/contexts/AuthContext';
import { signOut } from '@/services/auth';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function SettingsRow({ icon, label, onPress }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.slate[400]} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Separator() {
  return <View style={styles.separator} />;
}

export function SettingsMainScreen({ navigation }: Props) {
  const { user } = useAuthContext();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch {
            setSigningOut(false);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const isSolo = !user?.firmId;
  const iconColor = colors.slate[500];
  const iconSize = 20;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <User size={28} color={colors.teal[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName ?? '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role === 'firm_admin' ? 'Firm Admin' : 'Inspector'}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile section */}
        <SectionHeader title="Profile" />
        <View style={styles.section}>
          <SettingsRow
            icon={<User size={iconSize} color={iconColor} />}
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <Separator />
          <SettingsRow
            icon={<Shield size={iconSize} color={iconColor} />}
            label="Account & Security"
            onPress={() => navigation.navigate('AccountSecurity')}
          />
        </View>

        {/* Inspection section */}
        <SectionHeader title="Inspection" />
        <View style={styles.section}>
          <SettingsRow
            icon={<ListChecks size={iconSize} color={iconColor} />}
            label="Checklist Templates"
            onPress={() => navigation.navigate('ChecklistTemplates')}
          />
          <Separator />
          <SettingsRow
            icon={<MessageSquare size={iconSize} color={iconColor} />}
            label="Comment Library"
            onPress={() => navigation.navigate('CommentLibrary')}
          />
        </View>

        {/* Branding section — solo inspectors only */}
        {isSolo && (
          <>
            <SectionHeader title="Branding" />
            <View style={styles.section}>
              <SettingsRow
                icon={<Palette size={iconSize} color={iconColor} />}
                label="Branding"
                onPress={() => navigation.navigate('BrandingSetup')}
              />
            </View>
          </>
        )}

        {/* Firm section — solo inspectors only */}
        {isSolo && (
          <>
            <SectionHeader title="Firm" />
            <View style={styles.section}>
              <SettingsRow
                icon={<Building2 size={iconSize} color={iconColor} />}
                label="Create a Firm"
                onPress={() => navigation.navigate('CreateFirm')}
              />
              <Separator />
              <SettingsRow
                icon={<UserPlus size={iconSize} color={iconColor} />}
                label="Join a Firm"
                onPress={() => navigation.navigate('JoinFirm')}
              />
            </View>
          </>
        )}

        {/* About section */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Info size={iconSize} color={iconColor} />
            </View>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={colors.severity.critical} />
          <Text style={styles.signOutText}>
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing['2xl'],
  },

  // Profile card
  profileCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.base,
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.headingMd,
    color: colors.slate[900],
  },
  profileEmail: {
    ...typography.body,
    color: colors.slate[500],
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  roleBadgeText: {
    ...typography.captionMedium,
    color: colors.teal[600],
  },

  // Section
  sectionHeader: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargets.listItem,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.slate[900],
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    color: colors.slate[400],
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginLeft: spacing.base + 24 + spacing.md,
  },

  // Sign out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touchTargets.listItem,
    borderWidth: 1,
    borderColor: colors.severity.critical,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  signOutText: {
    ...typography.bodyMedium,
    color: colors.severity.critical,
  },
});
