// Annotation Editor — draw on photos with arrows, circles, rectangles, text
// Based on docs/planning/09_Photo_Capture_Annotation.md

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  PanResponder, Dimensions, TextInput, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { ArrowUpRight, Circle, Square, Type, Undo2, Redo2, X, Check, ZoomIn, ZoomOut } from 'lucide-react-native';
import { colors, typography, spacing, touchTargets, layout, annotationDefaults } from '@/constants/theme';
import { COLLECTIONS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';
import type { Annotation, AnnotationType } from '@/types';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'AnnotationEditor'>;

const TOOLS: { type: AnnotationType; Icon: typeof ArrowUpRight }[] = [
  { type: 'arrow', Icon: ArrowUpRight },
  { type: 'circle', Icon: Circle },
  { type: 'rectangle', Icon: Square },
  { type: 'text', Icon: Type },
];

const { width: SW } = Dimensions.get('window');

export function AnnotationEditorScreen({ route, navigation }: Props) {
  const { inspectionId, findingId, photoIndex } = route.params;
  const [activeTool, setActiveTool] = useState<AnnotationType>('arrow');
  const [activeColor, setActiveColor] = useState<string>(annotationDefaults.color);
  const [showColors, setShowColors] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [photoUri, setPhotoUri] = useState('');
  const imgLayout = useRef({ w: SW, h: SW });

  // Load photo and existing annotations
  useEffect(() => {
    const unsub = firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc(findingId)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const photos = doc.data()?.photos || [];
        if (photos[photoIndex]) {
          setPhotoUri(photos[photoIndex].storageUrl);
          setAnnotations(photos[photoIndex].annotations || []);
        }
      });
    return unsub;
  }, [inspectionId, findingId, photoIndex]);

  const pct = (px: number, dim: number) => (px / dim) * 100;

  const addAnnotation = useCallback((ann: Annotation) => {
    setUndoStack((prev) => [...prev.slice(-19), annotations]);
    setRedoStack([]);
    setAnnotations((prev) => [...prev, ann]);
  }, [annotations]);

  const handleUndo = () => {
    if (!undoStack.length) return;
    setRedoStack((prev) => [...prev, annotations]);
    setAnnotations(undoStack[undoStack.length - 1]);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    setUndoStack((prev) => [...prev, annotations]);
    setAnnotations(redoStack[redoStack.length - 1]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        if (activeTool === 'text') {
          setTextPos({ x: pct(g.x0, imgLayout.current.w), y: pct(g.y0 - 100, imgLayout.current.h) });
        }
      },
      onPanResponderRelease: (_, g) => {
        if (activeTool === 'text') return;
        const sx = pct(g.x0, imgLayout.current.w), sy = pct(g.y0 - 100, imgLayout.current.h);
        const ex = pct(g.x0 + g.dx, imgLayout.current.w), ey = pct(g.y0 + g.dy - 100, imgLayout.current.h);
        const base = { color: activeColor, width: null, height: null, endX: null, endY: null, radius: null, text: null };

        if (activeTool === 'arrow') {
          addAnnotation({ ...base, type: 'arrow', x: sx, y: sy, endX: ex, endY: ey });
        } else if (activeTool === 'circle') {
          const r = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) / 2;
          addAnnotation({ ...base, type: 'circle', x: sx, y: sy, radius: r });
        } else if (activeTool === 'rectangle') {
          addAnnotation({ ...base, type: 'rectangle', x: Math.min(sx, ex), y: Math.min(sy, ey), width: Math.abs(ex - sx), height: Math.abs(ey - sy) });
        }
      },
    })
  ).current;

  const handleTextSubmit = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); setTextInput(''); return; }
    addAnnotation({ type: 'text', x: textPos.x, y: textPos.y, text: textInput.substring(0, 50), color: activeColor, width: null, height: null, endX: null, endY: null, radius: null });
    setTextPos(null);
    setTextInput('');
  };

  const handleSave = async () => {
    try {
      const ref = firestore().collection(COLLECTIONS.FINDINGS(inspectionId)).doc(findingId);
      const doc = await ref.get();
      if (!doc.exists) { navigation.goBack(); return; }
      const photos = [...(doc.data()?.photos || [])];
      if (photos[photoIndex]) {
        photos[photoIndex] = { ...photos[photoIndex], annotations };
        await ref.update({ photos, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save annotations.');
    }
  };

  const handleCancel = () => {
    if (annotations.length) {
      Alert.alert('Discard?', 'Annotations will not be saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else navigation.goBack();
  };

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={handleCancel} style={s.topBtn}><X size={24} color={colors.white} /></TouchableOpacity>
        <View style={s.topCenter}>
          <TouchableOpacity onPress={handleUndo} disabled={!undoStack.length} style={[s.topBtn, !undoStack.length && s.dim]}><Undo2 size={22} color={colors.white} /></TouchableOpacity>
          <TouchableOpacity onPress={handleRedo} disabled={!redoStack.length} style={[s.topBtn, !redoStack.length && s.dim]}><Redo2 size={22} color={colors.white} /></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave} style={s.topBtn}><Check size={24} color={colors.teal[600]} /><Text style={s.doneText}>Done</Text></TouchableOpacity>
      </View>

      <View style={s.imgWrap} {...panResponder.panHandlers}
        onLayout={(e) => { imgLayout.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[s.img, { transform: [{ scale: zoom }] }]} resizeMode="contain" />
        ) : (
          <View style={s.placeholder}><Text style={s.placeholderText}>Loading photo...</Text></View>
        )}
        {annotations.map((a, i) => (
          <View key={i} style={[s.overlay, { left: `${a.x}%`, top: `${a.y}%` }]}>
            {a.type === 'text' && <View style={[s.textAnn, { backgroundColor: a.color + '80' }]}><Text style={s.textAnnText}>{a.text}</Text></View>}
            {a.type === 'circle' && <View style={{ width: (a.radius || 20) * 2, height: (a.radius || 20) * 2, borderRadius: a.radius || 20, borderWidth: 3, borderColor: a.color }} />}
            {a.type === 'rectangle' && <View style={{ width: a.width || 40, height: a.height || 40, borderWidth: 3, borderColor: a.color }} />}
          </View>
        ))}
      </View>

      {textPos && (
        <View style={s.textOverlay}>
          <TextInput style={s.textField} value={textInput} onChangeText={setTextInput}
            placeholder="Enter label..." placeholderTextColor={colors.slate[400]}
            maxLength={50} autoFocus onSubmitEditing={handleTextSubmit} returnKeyType="done" />
          <TouchableOpacity onPress={handleTextSubmit} style={s.textSubmit}><Text style={s.textSubmitText}>Add</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.zoomCtrl}>
        <TouchableOpacity onPress={() => setZoom((z) => Math.min(z + 0.5, 3))} style={s.zoomBtn}><ZoomIn size={20} color={colors.white} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setZoom((z) => Math.max(z - 0.5, 1))} style={s.zoomBtn}><ZoomOut size={20} color={colors.white} /></TouchableOpacity>
      </View>

      <View style={s.toolbar}>
        {TOOLS.map(({ type, Icon }) => (
          <TouchableOpacity key={type} style={[s.toolBtn, activeTool === type && s.toolActive]} onPress={() => setActiveTool(type)}>
            <Icon size={22} color={activeTool === type ? colors.white : colors.slate[400]} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.colorDot, { backgroundColor: activeColor }]} onPress={() => setShowColors(!showColors)} />
      </View>

      {showColors && (
        <View style={s.colorPicker}>
          {annotationDefaults.colorOptions.map((c) => (
            <TouchableOpacity key={c} style={[s.colorOpt, { backgroundColor: c }, activeColor === c && s.colorSel]}
              onPress={() => { setActiveColor(c); setShowColors(false); }} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.base, paddingBottom: spacing.sm, backgroundColor: 'rgba(0,0,0,0.7)' },
  topBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: 4 },
  topCenter: { flexDirection: 'row', gap: spacing.base },
  dim: { opacity: 0.3 },
  doneText: { color: colors.teal[600], ...typography.bodyMedium },
  imgWrap: { flex: 1 },
  img: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: colors.slate[400], ...typography.body },
  overlay: { position: 'absolute' },
  textAnn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  textAnnText: { color: colors.white, ...typography.captionMedium },
  textOverlay: { position: 'absolute', bottom: 120, left: spacing.base, right: spacing.base, flexDirection: 'row', backgroundColor: colors.white, borderRadius: layout.borderRadius, overflow: 'hidden' },
  textField: { flex: 1, height: touchTargets.minimum, paddingHorizontal: spacing.base, ...typography.body, color: colors.slate[900] },
  textSubmit: { backgroundColor: colors.teal[600], justifyContent: 'center', paddingHorizontal: spacing.base },
  textSubmitText: { color: colors.white, ...typography.bodyMedium },
  zoomCtrl: { position: 'absolute', right: spacing.base, bottom: 140, gap: spacing.sm },
  zoomBtn: { width: touchTargets.minimum, height: touchTargets.minimum, borderRadius: touchTargets.minimum / 2, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.md, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.7)', gap: spacing.lg },
  toolBtn: { width: touchTargets.minimum, height: touchTargets.minimum, borderRadius: touchTargets.minimum / 2, justifyContent: 'center', alignItems: 'center' },
  toolActive: { backgroundColor: colors.teal[600] },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white, marginLeft: spacing.base },
  colorPicker: { position: 'absolute', bottom: 100, right: spacing.base, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: layout.borderRadius, padding: spacing.sm, gap: spacing.sm },
  colorOpt: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  colorSel: { borderWidth: 3, borderColor: colors.white },
});
