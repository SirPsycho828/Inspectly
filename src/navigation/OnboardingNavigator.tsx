import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileSetupScreen } from '@/screens/onboarding/ProfileSetupScreen';
import { FirmJoinScreen } from '@/screens/onboarding/FirmJoinScreen';
import { colors } from '@/constants/theme';

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
  FirmJoin: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.slate[50] },
      }}
    >
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="FirmJoin" component={FirmJoinScreen} />
    </Stack.Navigator>
  );
}
