import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronDown, ChevronRight, MessageSquare, Search, Trash2 } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { colors, typography, spacing, layout, touchTargets } from '@/constants/theme';
import { EmptyState, LoadingSkeleton, SeverityBadge } from '@/components/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/constants/collections';
import type { CommentLibraryEntry } from '@/types';
import type { SettingsStackParamList } from '@/navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'CommentLibrary'>;

function CommentRow({
  entry,
  onDelete,
}: {
  entry: CommentLibraryEntry;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.commentCard}>
      <TouchableOpacity
        style={styles.commentHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.commentHeaderLeft}>
          <Text style={styles.commentComponent}>{entry.component}</Text>
          <Text style={styles.commentCondition} numberOfLines={expanded ? undefined : 1}>
            {entry.condition}
          </Text>
          <View style={styles.commentMeta}>
            <SeverityBadge severity={entry.severity} />
            <Text style={styles.useCount}>
              Used {entry.useCount} {entry.useCount === 1 ? 'time' : 'times'}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronDown size={18} color={colors.slate[400]} />
        ) : (
          <ChevronRight size={18} color={colors.slate[400]} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.narrativeContainer}>
          <Text style={styles.narrativeLabel}>Narrative</Text>
          <Text style={styles.narrativeText}>{entry.narrative}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(entry.id)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.severity.critical} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function CommentLibraryScreen(_props: Props) {
  const { user } = useAuthContext();
  const [allEntries, setAllEntries] = useState<CommentLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    const unsub = firestore()
      .collection(COLLECTIONS.COMMENT_LIBRARY)
      .where('ownerId', '==', user.id)
      .orderBy('useCount', 'desc')
      .onSnapshot(
        (snap) => {
          setAllEntries(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<CommentLibraryEntry, 'id'>),
            }))
          );
          setLoading(false);
        },
        () => setLoading(false)
      );

    return unsub;
  }, [user]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Delete Comment',
      'Remove this saved comment from your library? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection(COLLECTIONS.COMMENT_LIBRARY).doc(id).delete();
            } catch {
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const filtered = search.trim()
    ? allEntries.filter((e) =>
        e.component.toLowerCase().includes(search.trim().toLowerCase())
      )
    : allEntries;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton
              key={i}
              height={80}
              borderRadius={layout.borderRadius}
              style={styles.skeletonItem}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.slate[400]} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by component…"
          placeholderTextColor={colors.slate[400]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        renderItem={({ item }) => (
          <CommentRow entry={item} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<MessageSquare size={40} color={colors.slate[300]} />}
            title="No Saved Comments"
            description={
              search.trim()
                ? `No comments match "${search}".`
                : 'Comments you save during inspections will appear here for quick reuse.'
            }
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

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 36,
    ...typography.body,
    color: colors.slate[900],
  },

  // List
  listContent: {
    padding: layout.screenPaddingH,
    paddingBottom: spacing['2xl'],
  },
  listContentEmpty: {
    flex: 1,
  },
  itemSeparator: {
    height: spacing.sm,
  },

  // Comment card
  commentCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.base,
    minHeight: touchTargets.listItem,
    gap: spacing.sm,
  },
  commentHeaderLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  commentComponent: {
    ...typography.bodyMedium,
    color: colors.slate[900],
  },
  commentCondition: {
    ...typography.body,
    color: colors.slate[600],
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  useCount: {
    ...typography.caption,
    color: colors.slate[500],
  },

  // Narrative
  narrativeContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    padding: spacing.base,
    backgroundColor: colors.slate[50],
    gap: spacing.sm,
  },
  narrativeLabel: {
    ...typography.captionMedium,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  narrativeText: {
    ...typography.body,
    color: colors.slate[700],
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteText: {
    ...typography.bodyMedium,
    color: colors.severity.critical,
  },
});
