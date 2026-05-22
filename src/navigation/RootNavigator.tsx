// Root navigator — switches between Auth, Onboarding, and Main App
// Based on docs/planning/05_Mobile_Shell_Navigation.md

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { SuspendedScreen } from '@/screens/auth/SuspendedScreen';
import { VerifyEmailScreen } from '@/screens/auth/VerifyEmailScreen';
import { LoadingScreen } from '@/screens/LoadingScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { authState, loading } = useAuthContext();

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      {authState === 'unauthenticated' ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : authState === 'unverified' ? (
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      ) : authState === 'needs_onboarding' ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : authState === 'suspended' ? (
        <Stack.Screen name="Suspended" component={SuspendedScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
