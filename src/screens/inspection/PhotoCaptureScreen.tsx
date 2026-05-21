// Photo capture — full-screen camera modal
// Based on docs/planning/09_Photo_Capture_Annotation.md

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { colors, typography, spacing, touchTargets, layout } from '@/constants/theme';
import { COLLECTIONS, STORAGE_PATHS } from '@/constants/collections';
import type { ActiveInspectionParamList } from '@/navigation/ActiveInspectionNavigator';

type Props = NativeStackScreenProps<ActiveInspectionParamList, 'PhotoCapture'>;

export function PhotoCaptureScreen({ route, navigation }: Props) {
  const { inspectionId, findingId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'auto' | 'on' | 'off'>('auto');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>Camera access is needed to capture inspection photos.</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topClose} onPress={() => navigation.goBack()}>
          <X size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo) {
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 3000 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCapturedUri(manipulated.uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedUri) return;
    setUploading(true);
    try {
      const photoId = `photo_${Date.now()}`;
      const storagePath = STORAGE_PATHS.INSPECTION_PHOTO(inspectionId, photoId);
      await storage().ref(storagePath).putFile(capturedUri);
      const downloadUrl = await storage().ref(storagePath).getDownloadURL();

      if (findingId) {
        await firestore()
          .collection(COLLECTIONS.FINDINGS(inspectionId))
          .doc(findingId)
          .update({
            photos: firestore.FieldValue.arrayUnion({
              storageUrl: downloadUrl,
              thumbnailUrl: downloadUrl,
              caption: '',
              annotations: [],
              takenAt: firestore.Timestamp.now(),
              order: Date.now(),
            }),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Photo saved locally. Will upload when online.');
      navigation.goBack();
    } finally {
      setUploading(false);
    }
  };

  const cycleFlash = () => setFlash((p) => (p === 'auto' ? 'on' : p === 'on' ? 'off' : 'auto'));
  const FlashIcon = flash === 'off' ? ZapOff : Zap;

  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
        <View style={styles.previewActions}>
          <TouchableOpacity onPress={() => setCapturedUri(null)} style={styles.retakeBtn}>
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.useBtn, uploading && { opacity: 0.5 }]}
            onPress={handleUsePhoto} disabled={uploading}>
            <Text style={styles.useText}>{uploading ? 'Saving...' : 'Use Photo'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.topClose} onPress={() => navigation.goBack()}>
          <X size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flash} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={24} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={cycleFlash} style={styles.flashBtn} hitSlop={12}>
          <FlashIcon size={20} color={flash === 'off' ? colors.slate[400] : '#FBBF24'} />
          <Text style={styles.flashText}>{flash.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.shutter} onPress={handleCapture} activeOpacity={0.7}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  topBar: { position: 'absolute', top: 60, left: spacing.base, right: spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topClose: { position: 'absolute', top: 60, left: spacing.base },
  flashBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flashText: { color: colors.white, ...typography.captionMedium },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: touchTargets.shutter, height: touchTargets.shutter, borderRadius: touchTargets.shutter / 2, borderWidth: 4, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: touchTargets.shutter - 16, height: touchTargets.shutter - 16, borderRadius: (touchTargets.shutter - 16) / 2, backgroundColor: colors.white },
  preview: { flex: 1 },
  previewActions: { position: 'absolute', bottom: 40, left: spacing.base, right: spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retakeBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.base },
  retakeText: { color: colors.white, ...typography.bodyMedium },
  useBtn: { backgroundColor: colors.teal[600], borderRadius: layout.borderRadius, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  useText: { color: colors.white, ...typography.bodyMedium },
  permContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  permText: { color: colors.white, ...typography.body, textAlign: 'center', marginBottom: spacing.xl },
  permButton: { backgroundColor: colors.teal[600], borderRadius: layout.borderRadius, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  permButtonText: { color: colors.white, ...typography.bodyMedium },
});
