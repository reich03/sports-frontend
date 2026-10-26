import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { f1EventService } from '../../services';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import StatusModal from '../../components/StatusModal';

export default function F1EventJoinScreen({ navigation, route }) {
  const { eventId } = route.params || {};
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  const joinByCode = async () => {
    if (!code.trim()) {
      setStatusModal({ visible: true, type: 'warning', title: 'Código requerido', message: 'Ingresa el código del evento privado F1.' });
      return;
    }
    setLoading(true);
    try {
      const res = await f1EventService.joinByCode(code.trim().toUpperCase());
      const joinedEventId = res.data?.participant?.event_id;
      const targetId = joinedEventId || eventId;
      if (targetId) {
        navigation.replace('F1Prediction', { eventId: targetId });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'No se pudo unir',
        message: err.response?.data?.error?.message || 'Código inválido',
      });
    } finally {
      setLoading(false);
    }
  };

  const joinDirect = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      await f1EventService.joinEvent(eventId, { access_code: code.trim().toUpperCase() || undefined });
      navigation.replace('F1Prediction', { eventId });
    } catch (err) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'No se pudo unir',
        message: err.response?.data?.error?.message || 'Verifica el código e intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Evento privado F1</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Ionicons name="lock-closed" size={36} color={C.primary} />
        <Text style={styles.title}>Unirse con código</Text>
        <Text style={styles.sub}>
          Este Gran Premio es privado. Ingresa el código que te compartió el organizador.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: F1PRIV26"
          placeholderTextColor={C.textSecondary}
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={styles.btn} onPress={eventId ? joinDirect : joinByCode} disabled={loading}>
          {loading ? <ActivityIndicator color={C.onAccent} /> : <Text style={styles.btnText}>Unirme al evento</Text>}
        </TouchableOpacity>
      </View>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        primaryButtonText="Aceptar"
        onPrimaryPress={() => setStatusModal((p) => ({ ...p, visible: false }))}
        onClose={() => setStatusModal((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontWeight: '800', fontSize: 17 },
  card: {
    marginTop: 24,
    backgroundColor: C.cardDark,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${C.primary}33`,
    gap: 12,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  sub: { color: C.textSecondary, textAlign: 'center', lineHeight: 20, fontSize: 13 },
  input: {
    width: '100%',
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${C.primary}44`,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    marginTop: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: C.onAccent, fontWeight: '800' },
});
