import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FirmDashboardScreen } from '@/screens/firm/FirmDashboardScreen';
import { FirmMemberListScreen } from '@/screens/firm/FirmMemberListScreen';
import { MemberDetailScreen } from '@/screens/firm/MemberDetailScreen';
import { FirmSettingsScreen } from '@/screens/firm/FirmSettingsScreen';
import { FirmBrandingScreen } from '@/screens/firm/FirmBrandingScreen';
import { colors } from '@/constants/theme';

export type FirmStackParamList = {
  FirmDashboard: undefined;
  FirmMemberList: undefined;
  MemberDetail: { memberId: string };
  FirmSettings: undefined;
  FirmBranding: undefined;
};

const Stack = createNativeStackNavigator<FirmStackParamList>();

export function FirmNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ contentStyle: { backgroundColor: colors.slate[50] } }}
    >
      <Stack.Screen name="FirmDashboard" component={FirmDashboardScreen} options={{ title: 'Firm' }} />
      <Stack.Screen name="FirmMemberList" component={FirmMemberListScreen} options={{ title: 'Members' }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member' }} />
      <Stack.Screen name="FirmSettings" component={FirmSettingsScreen} options={{ title: 'Firm Settings' }} />
      <Stack.Screen name="FirmBranding" component={FirmBrandingScreen} options={{ title: 'Branding' }} />
    </Stack.Navigator>
  );
}
