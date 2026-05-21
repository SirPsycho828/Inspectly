import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InspectionsListScreen } from '@/screens/inspections/InspectionsListScreen';
import { InspectionSetupScreen } from '@/screens/inspections/InspectionSetupScreen';
import { InspectionDetailScreen } from '@/screens/inspections/InspectionDetailScreen';
import { ActiveInspectionNavigator } from './ActiveInspectionNavigator';
import { colors } from '@/constants/theme';

export type InspectionsStackParamList = {
  InspectionsList: undefined;
  InspectionSetup: undefined;
  InspectionDetail: { inspectionId: string };
  ActiveInspection: { inspectionId: string };
};

const Stack = createNativeStackNavigator<InspectionsStackParamList>();

export function InspectionsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.slate[50] },
      }}
    >
      <Stack.Screen
        name="InspectionsList"
        component={InspectionsListScreen}
        options={{ title: 'Inspections' }}
      />
      <Stack.Screen
        name="InspectionSetup"
        component={InspectionSetupScreen}
        options={{ title: 'New Inspection' }}
      />
      <Stack.Screen
        name="InspectionDetail"
        component={InspectionDetailScreen}
        options={{ title: 'Inspection' }}
      />
      <Stack.Screen
        name="ActiveInspection"
        component={ActiveInspectionNavigator}
        options={{
          headerShown: false,
          // Disable back swipe to prevent accidental exits
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
