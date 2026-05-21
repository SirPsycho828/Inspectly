// Bottom tab navigator — 3-4 tabs depending on firm membership
// Based on docs/planning/05_Mobile_Shell_Navigation.md

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ClipboardList,
  FileText,
  Users,
  Settings,
} from 'lucide-react-native';
import { useAuthContext } from '@/contexts/AuthContext';
import { InspectionsNavigator } from './InspectionsNavigator';
import { ReportsNavigator } from './ReportsNavigator';
import { FirmNavigator } from './FirmNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { colors, typography } from '@/constants/theme';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { user } = useAuthContext();
  const hasFirm = !!user?.firmId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal[600],
        tabBarInactiveTintColor: colors.slate[500],
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
        },
        tabBarStyle: {
          height: 56,
          borderTopColor: colors.slate[200],
        },
      }}
    >
      <Tab.Screen
        name="InspectionsTab"
        component={InspectionsNavigator}
        options={{
          tabBarLabel: 'Inspections',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsNavigator}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      {hasFirm && (
        <Tab.Screen
          name="FirmTab"
          component={FirmNavigator}
          options={{
            tabBarLabel: 'Firm',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
      )}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
