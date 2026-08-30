import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DeliveryRiderHeader } from '@/components/driver/DeliveryRiderChrome';
import { PrimaryButton } from '@/components/ui/controls';
import type { DeliveryAssignment, DeliveryProofPhoto } from '@/lib/deliveryRiderApi';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';

function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Feather name="alert-circle" size={17} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function DeliveryProofScreen({
  assignment,
  busy,
  submitError,
  onBack,
  onSubmit,
}: {
  assignment: DeliveryAssignment;
  busy: boolean;
  submitError: string;
  onBack: () => void;
  onSubmit: (photo: DeliveryProofPhoto) => void;
}) {
  const [photo, setPhoto] = useState<DeliveryProofPhoto | null>(null);
  const [pickerError, setPickerError] = useState('');

  const choosePhoto = async (source: 'camera' | 'library') => {
    setPickerError('');
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError(source === 'camera'
        ? 'Camera permission is required to take delivery proof.'
        : 'Photo library permission is required to choose delivery proof.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: false,
        });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      fileName: asset.fileName ?? `delivery-proof-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  return (
    <View style={styles.screen}>
      <DeliveryRiderHeader title="Proof of delivery" subtitle={assignment.referenceNumber} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{photo ? 'Review the delivery photo' : 'Add a delivery photo'}</Text>
          <Text style={styles.subtitle}>
            Submit one clear image showing the completed delivery before marking this Service Request delivered.
          </Text>
        </View>

        {photo ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.previewFooter}>
              <View style={styles.previewCheck}>
                <Feather name="check" size={14} color={colors.surface} />
              </View>
              <View style={styles.previewCopy}>
                <Text style={styles.previewTitle}>Photo ready</Text>
                <Text style={styles.previewName} numberOfLines={1}>{photo.fileName}</Text>
              </View>
              <Pressable onPress={() => setPhoto(null)} hitSlop={8}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.photoEmpty}>
            <View style={styles.photoIcon}><Feather name="camera" size={34} color={colors.primary} /></View>
            <Text style={styles.photoEmptyTitle}>No photo added yet</Text>
            <Text style={styles.photoEmptyBody}>Make sure the delivered cylinder and handoff location are visible.</Text>
          </View>
        )}

        <View style={styles.pickerActions}>
          <Pressable disabled={busy} onPress={() => void choosePhoto('camera')} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>
            <Feather name="camera" size={19} color={colors.primary} />
            <Text style={styles.pickerButtonText}>{photo ? 'Retake photo' : 'Take photo'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => void choosePhoto('library')} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>
            <Feather name="image" size={19} color={colors.primary} />
            <Text style={styles.pickerButtonText}>Choose photo</Text>
          </Pressable>
        </View>

        {pickerError ? <InlineError message={pickerError} /> : null}
        {submitError ? <InlineError message={submitError} /> : null}

        <View style={styles.deliverySummary}>
          <View style={styles.summaryIcon}><Feather name="map-pin" size={18} color={colors.primary} /></View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>Delivering to</Text>
            <Text style={styles.summaryValue}>{assignment.customerName}</Text>
            <Text style={styles.summaryAddress}>{assignment.deliveryAddress}</Text>
          </View>
        </View>

        <PrimaryButton
          label={busy ? 'Submitting delivery…' : 'Submit Delivered'}
          disabled={busy || !photo}
          onPress={() => {
            if (photo) onSubmit(photo);
          }}
        />
        <Text style={styles.finePrint}>The delivered milestone is saved only after the proof upload succeeds.</Text>
      </ScrollView>
    </View>
  );
}

export function DeliveryCompletedScreen({
  assignment,
  onDone,
}: {
  assignment: DeliveryAssignment;
  onDone: () => void;
}) {
  return (
    <View style={styles.screen}>
      <DeliveryRiderHeader title="Delivery complete" subtitle={assignment.referenceNumber} />
      <View style={styles.completedBody}>
        <View style={styles.completedCard}>
          <View style={styles.completedIcon}><Feather name="check" size={40} color={colors.success} /></View>
          <Text style={styles.completedTitle}>Marked as delivered</Text>
          <Text style={styles.completedText}>The delivered milestone and proof photo were saved for this Service Request.</Text>
          <View style={styles.savedPill}>
            <Feather name="image" size={15} color={colors.success} />
            <Text style={styles.savedText}>Delivery proof saved</Text>
          </View>
          <View style={styles.completedSummary}>
            <Text style={styles.completedLabel}>Customer</Text>
            <Text style={styles.completedValue}>{assignment.customerName}</Text>
            <Text style={styles.completedLabel}>Service Request</Text>
            <Text style={styles.completedValue}>{assignment.referenceNumber}</Text>
          </View>
          <PrimaryButton label="Return home" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 40, gap: 17 },
  headingCopy: { gap: 5 },
  title: { fontFamily: fonts.bold, fontSize: 21, color: colors.darkNavy },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textMuted },
  photoEmpty: { minHeight: 245, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9D9EB', backgroundColor: colors.surface },
  photoIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  photoEmptyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.darkNavy },
  photoEmptyBody: { maxWidth: 270, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  previewCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface, ...cardShadow },
  preview: { width: '100%', height: 290, backgroundColor: colors.surfaceMuted },
  previewFooter: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  previewCheck: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  previewCopy: { flex: 1 },
  previewTitle: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text },
  previewName: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted, marginTop: 2 },
  pickerActions: { flexDirection: 'row', gap: 10 },
  pickerButton: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, borderWidth: 1, borderColor: '#B9D9EB', backgroundColor: colors.surface },
  pickerButtonText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  pressed: { opacity: 0.75 },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, padding: 12, backgroundColor: '#FDECEA' },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.danger },
  deliverySummary: { flexDirection: 'row', gap: 11, borderRadius: 15, padding: 14, backgroundColor: colors.surface },
  summaryIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  summaryCopy: { flex: 1 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted },
  summaryValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text, marginTop: 2 },
  summaryAddress: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.textMuted, marginTop: 2 },
  finePrint: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: colors.textMuted, textAlign: 'center' },
  completedBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 45 },
  completedCard: { alignItems: 'stretch', gap: 16, borderRadius: 22, padding: 23, backgroundColor: colors.surface, ...cardShadow },
  completedIcon: { width: 80, height: 80, alignSelf: 'center', borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F8F2' },
  completedTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.darkNavy, textAlign: 'center' },
  completedText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  savedPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E9F8F2' },
  savedText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.success },
  completedSummary: { gap: 4, borderRadius: 14, padding: 14, backgroundColor: colors.surfaceMuted },
  completedLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted, marginTop: 4 },
  completedValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
});
