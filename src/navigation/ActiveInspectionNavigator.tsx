// Active inspection mode — full-screen focused inspection workflow
// Hides bottom tab bar. Exit requires confirmation dialog.

import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ChecklistViewScreen } from '@/screens/inspection/ChecklistViewScreen';
import { ItemDetailScreen } from '@/screens/inspection/ItemDetailScreen';
import { FindingEntryScreen } from '@/screens/inspection/FindingEntryScreen';
import { PhotoCaptureScreen } from '@/screens/inspection/PhotoCaptureScreen';
import { AnnotationEditorScreen } from '@/screens/inspection/AnnotationEditorScreen';
import { SectionReviewScreen } from '@/screens/inspection/SectionReviewScreen';
import { ReportPreviewScreen } from '@/screens/inspection/ReportPreviewScreen';
import { ExecutiveSummaryScreen } from '@/screens/inspection/ExecutiveSummaryScreen';
import { PublishConfirmScreen } from '@/screens/inspection/PublishConfirmScreen';
import { PublishSuccessScreen } from '@/screens/inspection/PublishSuccessScreen';
import { colors, typography } from '@/constants/theme';
import { OfflineBanner } from '@/components/ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { InspectionsStackParamList } from './InspectionsNavigator';

export type ActiveInspectionParamList = {
  ChecklistView: { inspectionId: string };
  ItemDetail: { inspectionId: string; sectionId: string; itemId: string };
  FindingEntry: { inspectionId: string; findingId?: string; checklistItemId?: string; sectionId?: string };
  PhotoCapture: { inspectionId: string; findingId?: string };
  AnnotationEditor: { inspectionId: string; findingId: string; photoIndex: number };
  SectionReview: { inspectionId: string; sectionId: string };
  ReportPreview: { inspectionId: string };
  ExecutiveSummary: { inspectionId: string };
  PublishConfirm: { inspectionId: string };
  PublishSuccess: { inspectionId: string; reportId: string };
};

const Stack = createNativeStackNavigator<ActiveInspectionParamList>();

type Props = NativeStackScreenProps<InspectionsStackParamList, 'ActiveInspection'>;

export function ActiveInspectionNavigator({ route }: Props) {
  const { inspectionId } = route.params;
  const navigation = useNavigation();

  const handleExit = () => {
    Alert.alert(
      'Exit Inspection',
      'Your progress is saved. You can resume anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => navigation.goBack() },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.slate[50] },
        headerTintColor: colors.slate[700],
        headerTitleStyle: {
          ...typography.bodyMedium,
          color: colors.slate[900],
        },
      }}
    >
      <Stack.Screen
        name="ChecklistView"
        component={ChecklistViewScreen}
        initialParams={{ inspectionId }}
        options={{
          title: 'Inspection',
          headerLeft: () => (
            <X
              color={colors.slate[700]}
              size={24}
              onPress={handleExit}
              hitSlop={12}
            />
          ),
        }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Detail' }}
      />
      <Stack.Screen
        name="FindingEntry"
        component={FindingEntryScreen}
        options={{ title: 'Finding' }}
      />
      <Stack.Screen
        name="PhotoCapture"
        component={PhotoCaptureScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="AnnotationEditor"
        component={AnnotationEditorScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="SectionReview"
        component={SectionReviewScreen}
        options={{ title: 'Section Review' }}
      />
      <Stack.Screen
        name="ReportPreview"
        component={ReportPreviewScreen}
        options={{ title: 'Report Preview' }}
      />
      <Stack.Screen
        name="ExecutiveSummary"
        component={ExecutiveSummaryScreen}
        options={{ title: 'Executive Summary' }}
      />
      <Stack.Screen
        name="PublishConfirm"
        component={PublishConfirmScreen}
        options={{ title: 'Publish Report' }}
      />
      <Stack.Screen
        name="PublishSuccess"
        component={PublishSuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
