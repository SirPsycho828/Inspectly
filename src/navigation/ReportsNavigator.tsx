import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReportsListScreen } from '@/screens/reports/ReportsListScreen';
import { ReportDetailScreen } from '@/screens/reports/ReportDetailScreen';
import { ManageAccessScreen } from '@/screens/reports/ManageAccessScreen';
import { colors } from '@/constants/theme';

export type ReportsStackParamList = {
  ReportsList: undefined;
  ReportDetail: { reportId: string };
  ManageAccess: { reportId: string };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export function ReportsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ contentStyle: { backgroundColor: colors.slate[50] } }}
    >
      <Stack.Screen name="ReportsList" component={ReportsListScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Report' }} />
      <Stack.Screen name="ManageAccess" component={ManageAccessScreen} options={{ title: 'Manage Access' }} />
    </Stack.Navigator>
  );
}
