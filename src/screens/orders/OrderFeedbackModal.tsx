import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { radii } from '@/theme/metrics';

const reviewedKey = (customerId: string) => `superkalan.reviewedOrders.${customerId}`;

export async function loadReviewedOrderIds(customerId: string): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(reviewedKey(customerId));
    return new Set(stored ? JSON.parse(stored) as string[] : []);
  } catch {
    return new Set();
  }
}

async function rememberReviewedOrder(customerId: string, orderId: string): Promise<void> {
  const ids = await loadReviewedOrderIds(customerId);
  ids.add(orderId);
  try {
    await AsyncStorage.setItem(reviewedKey(customerId), JSON.stringify([...ids]));
  } catch {
    // The API remains authoritative if device storage is unavailable.
  }
}

export function OrderFeedbackModal({
  orderId, customerId, onClose, onReviewed,
}: {
  orderId: string | null;
  customerId: string | null;
  onClose: () => void;
  onReviewed: (orderId: string) => void;
}) {
  const [step, setStep] = useState<'rate' | 'comment'>('rate');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStep('rate');
    setRating(0);
    setComment('');
    setSubmitError(null);
    setSubmitSuccess(false);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [orderId]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const submit = async () => {
    if (rating === 0 || !orderId || submitting || submitSuccess) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch('/csat/ratings', {
        method: 'POST',
        body: JSON.stringify({
          serviceRequestId: orderId,
          stars: rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = apiErrorMessage(data, 'Failed to submit feedback');
        if (res.status === 409 && message.toLowerCase().includes('already been rated')) {
          if (customerId) await rememberReviewedOrder(customerId, orderId);
          onReviewed(orderId);
        }
        throw new Error(message);
      }
      if (customerId) await rememberReviewedOrder(customerId, orderId);
      onReviewed(orderId);
      setSubmitSuccess(true);
      closeTimer.current = setTimeout(close, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={orderId !== null} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.feedbackSheet}>
            <View style={styles.progressRow}>
              {step === 'comment' ? <><View style={styles.dot} /><View style={styles.dash} /></> : <><View style={styles.dash} /><View style={styles.dot} /></>}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {step === 'rate' && <View style={styles.fbAvatarWrap}><View style={styles.fbAvatar}><Feather name="user" size={42} color="#fff" /></View></View>}
              <Text style={styles.fbTitle}>How was your experience?</Text>
              <Text style={styles.fbSub}>
                {step === 'comment'
                  ? 'Help us improve your delivery experience by rating our branch.'
                  : 'Help us improve your delivery experience by rating your rider.'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => {
                    setRating(n);
                    if (step === 'rate') advanceTimer.current = setTimeout(() => setStep('comment'), 250);
                  }} hitSlop={4}>
                    <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={48} color={n <= rating ? colors.starYellow : colors.cardBorder} />
                  </Pressable>
                ))}
              </View>
              {step === 'comment' && (
                <TextInput style={styles.commentBox} placeholder="Write your thoughts..." placeholderTextColor={colors.muted} multiline value={comment} onChangeText={setComment} returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />
              )}
              {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
              {submitSuccess ? <Text style={styles.submitSuccess}>✓ Feedback submitted! Thank you.</Text> : null}
              <Pressable
                style={[styles.fbBtn, { backgroundColor: rating > 0 && !submitting && !submitSuccess ? colors.primary : colors.disabledBlue }]}
                disabled={rating === 0 || submitting || submitSuccess}
                onPress={() => void submit()}
              >
                <Text style={styles.fbBtnText}>{submitting ? 'Submitting…' : submitSuccess ? 'Submitted!' : 'Submit Feedback'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  feedbackSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  dash: { width: 40, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  fbAvatarWrap: { alignItems: 'center', marginBottom: 12 },
  fbAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.avatarGray, alignItems: 'center', justifyContent: 'center' },
  fbTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, marginBottom: 4 },
  fbSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.grayText, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  commentBox: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.chip, padding: 12, height: 100, fontFamily: fonts.regular, fontSize: 15, color: colors.label, textAlignVertical: 'top', marginBottom: 12 },
  submitError: { fontFamily: fonts.medium, fontSize: 13, color: '#CC1903', marginBottom: 10, textAlign: 'center' },
  submitSuccess: { fontFamily: fonts.medium, fontSize: 13, color: '#16A34A', marginBottom: 10, textAlign: 'center' },
  fbBtn: { height: 47, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  fbBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
});
