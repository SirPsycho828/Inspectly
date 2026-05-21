import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/constants/collections';
import type { ChecklistTemplate } from '@/types';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChecklistTemplates'>;

type SectionData = {
  title: string;
  data: ChecklistTemplate[];
};

function TemplateSections({ template }: { template: ChecklistTemplate }) {
  return (
    <View style={styles.expandedBody}>
      {template.sections.map((section) => (
        <View key={section.id} style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionMeta}>{section.items.length} items</Text>
        </View>
      ))}
    </View>
  );
}

function TemplateRow({
  template,
  isSystem,
  onSetDefault,
}: {
  template: ChecklistTemplate;
  isSystem: boolean;
  onSetDefault: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalItems = template.sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <View style={styles.templateCard}>
      <TouchableOpacity
        style={styles.templateHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.templateHeaderLeft}>
          <View style={styles.templateTitleRow}>
            <Text style={styles.templateName}>{template.name}</Text>
            {template.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.templateMeta}>
            {template.sections.length} sections · {totalItems} items
          </Text>
        </View>
        {expanded ? (
          <ChevronDown size={18} color={colors.slate[400]} />
        ) : (
          <ChevronRight size={18} color={colors.slate[400]} />
        )}
      </TouchableOpacity>

      {expanded && <TemplateSections template={template} />}

      {!template.isDefault && (
        <View style={styles.templateFooter}>
          <TouchableOpacity
            style={styles.setDefaultButton}
            onPress={() => onSetDefault(template.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function ChecklistTemplatesScreen(_props: Props) {
  const { user } = useAuthContext();
  const [systemTemplates, setSystemTemplates] = useState<ChecklistTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingDefault, setSettingDefault] = useState(false);

  useEffect(() => {
    if (!user) return;

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded === 2) setLoading(false);
    };

    const unsubSystem = firestore()
      .collection(COLLECTIONS.CHECKLIST_TEMPLATES)
      .where('ownerId', '==', 'system')
      .onSnapshot(
        (snap) => {
          setSystemTemplates(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChecklistTemplate, 'id'>) }))
          );
          checkDone();
        },
        () => checkDone()
      );

    const unsubMine = firestore()
      .collection(COLLECTIONS.CHECKLIST_TEMPLATES)
      .where('ownerId', '==', user.id)
      .onSnapshot(
        (snap) => {
          setMyTemplates(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChecklistTemplate, 'id'>) }))
          );
          checkDone();
        },
        () => checkDone()
      );

    return () => {
      unsubSystem();
      unsubMine();
    };
  }, [user]);

  const handleSetDefault = useCallback(
    async (templateId: string) => {
      if (!user || settingDefault) return;
      setSettingDefault(true);
      try {
        const batch = firestore().batch();

        // Clear current default across both lists
        const allTemplates = [...systemTemplates, ...myTemplates];
        allTemplates.forEach((t) => {
          if (t.isDefault) {
            batch.update(
              firestore().collection(COLLECTIONS.CHECKLIST_TEMPLATES).doc(t.id),
              { isDefault: false }
            );
          }
        });

        batch.update(
          firestore().collection(COLLECTIONS.CHECKLIST_TEMPLATES).doc(templateId),
          { isDefault: true }
        );

        await batch.commit();
      } catch {
        Alert.alert('Error', 'Failed to set default template. Please try again.');
      } finally {
        setSettingDefault(false);
      }
    },
    [user, systemTemplates, myTemplates, settingDefault]
  );

  const sections: SectionData[] = [
    { title: 'System Templates', data: systemTemplates },
    { title: 'My Templates', data: myTemplates },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} height={72} borderRadius={layout.borderRadius} style={styles.skeletonItem} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const allEmpty = systemTemplates.length === 0 && myTemplates.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {settingDefault && (
        <View style={styles.updatingBanner}>
          <ActivityIndicator size="small" color={colors.teal[600]} />
          <Text style={styles.updatingText}>Updating default…</Text>
        </View>
      )}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[styles.listContent, allEmpty && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => {
          if (section.data.length === 0) return null;
          return (
            <View style={styles.sectionGroup}>
              <Text style={styles.groupHeader}>{section.title}</Text>
              {section.data.map((template, index) => (
                <View key={template.id} style={index > 0 ? styles.templateSpacing : undefined}>
                  <TemplateRow
                    template={template}
                    isSystem={template.ownerId === 'system'}
                    onSetDefault={handleSetDefault}
                  />
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Templates"
            description="No checklist templates available yet."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },

  // Loading
  skeletonContainer: {
    padding: layout.screenPaddingH,
    gap: spacing.md,
  },
  skeletonItem: {
    width: '100%',
  },

  // Updating banner
  updatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.teal[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  updatingText: {
    ...typography.caption,
    color: colors.teal[700],
  },

  // List
  listContent: {
    padding: layout.screenPaddingH,
    paddingBottom: spacing['2xl'],
    gap: spacing.xl,
  },
  listContentEmpty: {
    flex: 1,
  },

  // Section group
  sectionGroup: {
    gap: spacing.sm,
  },
  groupHeader: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  templateSpacing: {
    marginTop: spacing.sm,
  },

  // Template card
  templateCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    minHeight: touchTargets.listItem,
    gap: spacing.sm,
  },
  templateHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  templateName: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  templateMeta: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Default badge
  defaultBadge: {
    backgroundColor: colors.teal[50],
    borderRadius: layout.pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    ...typography.captionMedium,
    color: colors.teal[600],
  },

  // Expanded sections
  expandedBody: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.slate[50],
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.slate[700],
    flex: 1,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Footer / set default
  templateFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  setDefaultButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  setDefaultText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
});
