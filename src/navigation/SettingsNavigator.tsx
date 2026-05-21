import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsMainScreen } from '@/screens/settings/SettingsMainScreen';
import { EditProfileScreen } from '@/screens/settings/EditProfileScreen';
import { ChecklistTemplatesScreen } from '@/screens/settings/ChecklistTemplatesScreen';
import { CommentLibraryScreen } from '@/screens/settings/CommentLibraryScreen';
import { BrandingSetupScreen } from '@/screens/settings/BrandingSetupScreen';
import { AccountSecurityScreen } from '@/screens/settings/AccountSecurityScreen';
import { CreateFirmScreen } from '@/screens/settings/CreateFirmScreen';
import { JoinFirmScreen } from '@/screens/settings/JoinFirmScreen';
import { colors } from '@/constants/theme';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  EditProfile: undefined;
  ChecklistTemplates: undefined;
  CommentLibrary: undefined;
  BrandingSetup: undefined;
  AccountSecurity: undefined;
  CreateFirm: undefined;
  JoinFirm: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ contentStyle: { backgroundColor: colors.slate[50] } }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsMainScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ChecklistTemplates" component={ChecklistTemplatesScreen} options={{ title: 'Checklist Templates' }} />
      <Stack.Screen name="CommentLibrary" component={CommentLibraryScreen} options={{ title: 'Comment Library' }} />
      <Stack.Screen name="BrandingSetup" component={BrandingSetupScreen} options={{ title: 'Branding' }} />
      <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ title: 'Account & Security' }} />
      <Stack.Screen name="CreateFirm" component={CreateFirmScreen} options={{ title: 'Create a Firm' }} />
      <Stack.Screen name="JoinFirm" component={JoinFirmScreen} options={{ title: 'Join a Firm' }} />
    </Stack.Navigator>
  );
}
