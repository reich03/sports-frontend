import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView,
  StatusBar, TextInput, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { f1EventService } from '../../services';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BASE_URL } from '../../constants/config';
import StatusModal from '../../components/StatusModal';

const getPhotoUri = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('file://') || photo.startsWith('http')) return photo;
  return `${BASE_URL}${photo}`;
};

const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};
const formatTime = (d) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const isClosed = (event) => {
  if (!event) return true;
  if (event.status && event.status !== 'scheduled') return true;
  return Date.now() >= new Date(event.event_date).getTime();
};

// Convierte HEX '#rrggbb' + alpha 0-255 a rgba
const withAlpha = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return hex;
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function F1PredictionScreen({ navigation, route }) {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [event, setEvent] = useState(null);
  const [grid, setGrid] = useState([]); // pilotos disponibles
  const [positions, setPositions] = useState([]); // driver_ids ordenados P1..PN
  const [pole, setPole] = useState('');
  const [fastestLap, setFastestLap] = useState('');
  const [dotd, setDotd] = useState('');
  const [retirements, setRetirements] = useState('');
  const [tab, setTab] = useState('picks'); // 'picks' | 'summary'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState(null); // 'pole' | 'fastest' | 'dotd' | { positionIndex: n }
  const [retirementsModal, setRetirementsModal] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '', onAccept: null });

  const showStatus = useCallback((type, title, message, onAccept) => {
    setStatusModal({ visible: true, type, title, message, onAccept: onAccept || null });
  }, []);
  const closeStatus = useCallback(() => {
    setStatusModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const gridSize = event?.grid_size || 20;
  const locked = event ? isClosed(event) : false;

  const load = useCallback(async () => {
    try {
      const [eventRes, driversRes, myPredRes] = await Promise.all([
        f1EventService.getEventById(eventId),
        f1EventService.getEventDrivers(eventId),
        f1EventService.getMyPrediction(eventId).catch(() => ({ data: { prediction: null } })),
      ]);
      const ev = eventRes.data?.event || null;
      setEvent(ev);

      const availDrivers = driversRes.data?.drivers || [];
      setGrid(availDrivers);

      const pred = myPredRes.data?.prediction;
      if (pred && Array.isArray(pred.positions) && pred.positions.length > 0) {
        setPositions(pred.positions);
        setPole(pred.pole_driver_id || '');
        setFastestLap(pred.fastest_lap_driver_id || '');
        setDotd(pred.driver_of_the_day_id || '');
        setRetirements(pred.retirements_count != null ? String(pred.retirements_count) : '');
      } else {
        // Inicializar con la parrilla en el mismo orden
        const size = ev?.grid_size || 20;
        setPositions(availDrivers.slice(0, size).map((d) => d.id));
      }
    } catch (err) {
      console.error('Error cargando predicción F1:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const driversById = useMemo(() => {
    const map = {};
    grid.forEach((d) => { map[d.id] = d; });
    return map;
  }, [grid]);

  // Pilotos que aún no están asignados en la parrilla del usuario
  const availableList = useMemo(() => {
    const set = new Set(positions);
    return grid.filter((d) => !set.has(d.id));
  }, [grid, positions]);

  const usedCount = positions.filter(Boolean).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openPositionPicker = (idx) => {
    if (locked) return;
    setPickerFor({ positionIndex: idx });
  };

  const assignDriverToPosition = (driverId, positionIndex) => {
    setPositions((prev) => {
      const next = [...prev];
      // Extender si es necesario
      while (next.length < positionIndex + 1) next.push(null);
      // Si el piloto ya estaba en otra posición, lo removemos
      const prevIdx = next.indexOf(driverId);
      if (prevIdx >= 0) next[prevIdx] = null;
      next[positionIndex] = driverId;
      return next;
    });
    setPickerFor(null);
  };

  const removeFromPosition = (positionIndex) => {
    if (locked) return;
    setPositions((prev) => {
      const next = [...prev];
      next[positionIndex] = null;
      return next;
    });
  };

  const handleReorderPositions = ({ data }) => {
    // data es un array de items { key, driverId | null, idx }
    // reconstruimos positions manteniendo huecos nulls sólo si el usuario reordena entre huecos
    setPositions(data.map((it) => it.driverId));
  };

  const handleSave = async () => {
    if (!event) return;
    if (isClosed(event)) {
      showStatus('warning', 'Predicciones cerradas', 'Las predicciones para este evento ya están cerradas.');
      return;
    }
    setSaving(true);
    try {
      await f1EventService.upsertMyPrediction(event.id, {
        positions,
        pole_driver_id: pole || null,
        fastest_lap_driver_id: fastestLap || null,
        driver_of_the_day_id: dotd || null,
        retirements_count: retirements ? parseInt(retirements, 10) : null,
      });
      showStatus(
        'success',
        '¡Predicción guardada!',
        'Tu predicción se ha guardado correctamente. Puedes revisarla en el resumen.',
        () => setTab('summary'),
      );
    } catch (err) {
      showStatus('error', 'Error al guardar', err.response?.data?.error?.message || 'No se pudo guardar la predicción. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Sub-componentes UI ────────────────────────────────────────────────────

  const DriverAvatar = ({ driver, size = 42 }) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {driver?.photo ? (
        <Image source={{ uri: getPhotoUri(driver.photo) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Ionicons name="person" size={size * 0.55} color={C.primary} />
      )}
    </View>
  );

  // Item de posición (fila derecha)
  const renderPositionItem = ({ item, drag, isActive }) => {
    const driver = item.driverId ? driversById[item.driverId] : null;
    const posLabel = `P${item.idx + 1}`;
    const isPodium = item.idx < 3;

    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={locked || !driver ? undefined : drag}
          onPress={() => driver ? removeFromPosition(item.idx) : openPositionPicker(item.idx)}
          delayLongPress={140}
          style={[
            styles.posSlot,
            driver && styles.posSlotFilled,
            isPodium && driver && styles.posSlotPodium,
            isActive && styles.posSlotActive,
          ]}
        >
          <Text style={[styles.posLabel, isPodium && driver && styles.posLabelPodium]}>{posLabel}</Text>
          {driver ? (
            <View style={styles.posDriverRow}>
              <DriverAvatar driver={driver} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.posDriverName, isPodium && { color: C.primary }]} numberOfLines={1}>
                  {driver.short_name || driver.name?.split(' ').slice(-1)[0]}
                </Text>
                {driver.number != null && (
                  <Text style={styles.posDriverMeta}>#{driver.number}</Text>
                )}
              </View>
              {!locked && (
                <Ionicons name="reorder-three" size={16} color={C.textSecondary} />
              )}
            </View>
          ) : isPodium ? (
            <Text style={styles.posPlaceholderPodium}>PODIO</Text>
          ) : (
            <Text style={styles.posPlaceholder}>+ toca</Text>
          )}
        </Pressable>
      </ScaleDecorator>
    );
  };

  const renderAvailableDriver = ({ item }) => (
    <View style={styles.availDriver}>
      <View style={styles.availLeft}>
        <Text style={styles.availOrder}>#{item.number ?? '-'}</Text>
        <DriverAvatar driver={item} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.availName} numberOfLines={1}>{item.short_name || item.name}</Text>
          <Text style={styles.availTeam} numberOfLines={1}>{item.team?.name || 'Sin escudería'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.availAdd}
        onPress={() => {
          // asignar al primer slot vacío
          if (locked) return;
          const emptyIdx = positions.findIndex((p, i) => !p && i < gridSize);
          if (emptyIdx === -1) {
            showStatus('warning', 'Parrilla llena', 'Todos los slots ya tienen piloto. Toca una posición para reemplazarlo.');
            return;
          }
          assignDriverToPosition(item.id, emptyIdx);
        }}
      >
        <Ionicons name="add" size={18} color={C.onAccent} />
      </TouchableOpacity>
    </View>
  );

  const positionData = useMemo(() => {
    // rellenar hasta gridSize
    const arr = [];
    for (let i = 0; i < gridSize; i += 1) {
      arr.push({ key: `pos-${i}`, idx: i, driverId: positions[i] || null });
    }
    return arr;
  }, [positions, gridSize]);

  const DriverPickerModal = () => {
    const isForPosition = pickerFor && typeof pickerFor === 'object' && pickerFor.positionIndex != null;
    const positionIndex = isForPosition ? pickerFor.positionIndex : null;
    const isForField = pickerFor && typeof pickerFor === 'string';
    const currentValue =
      pickerFor === 'pole' ? pole
      : pickerFor === 'fastest' ? fastestLap
      : pickerFor === 'dotd' ? dotd
      : null;

    const title =
      pickerFor === 'pole' ? 'Pole position'
      : pickerFor === 'fastest' ? 'Vuelta rápida'
      : pickerFor === 'dotd' ? 'Piloto del día'
      : `Piloto para P${(positionIndex || 0) + 1}`;

    const [q, setQ] = useState('');
    const list = useMemo(() => {
      const query = q.trim().toLowerCase();
      if (!query) return grid;
      return grid.filter((d) =>
        d.name?.toLowerCase().includes(query) ||
        d.short_name?.toLowerCase().includes(query) ||
        d.team?.name?.toLowerCase().includes(query) ||
        String(d.number || '').includes(query)
      );
    }, [q, grid]);

    return (
      <Modal visible={!!pickerFor} transparent animationType="slide" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerTitle}>{title}</Text>
                <Text style={styles.pickerSub}>Selecciona un piloto de la lista</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerFor(null)} style={styles.pickerCloseBtn}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Ionicons name="search" size={16} color={C.textSecondary} />
              <TextInput
                style={styles.pickerInput}
                placeholder="Buscar piloto..."
                placeholderTextColor={C.textSecondary}
                value={q}
                onChangeText={setQ}
              />
            </View>
            <ScrollView style={styles.pickerScroll} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={true}>
              {isForField && (
                <TouchableOpacity style={styles.pickerRow} onPress={() => {
                  if (pickerFor === 'pole') setPole('');
                  if (pickerFor === 'fastest') setFastestLap('');
                  if (pickerFor === 'dotd') setDotd('');
                  setPickerFor(null);
                }}>
                  <Ionicons name="close-circle-outline" size={22} color={C.textSecondary} />
                  <Text style={[styles.pickerRowText, { color: C.textSecondary }]}>Sin selección</Text>
                </TouchableOpacity>
              )}
              {list.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="search" size={40} color={C.textSecondary} />
                  <Text style={{ color: C.textSecondary, marginTop: 8 }}>Sin resultados</Text>
                </View>
              ) : list.map((d) => {
                const active = currentValue === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                    onPress={() => {
                      if (isForPosition) {
                        assignDriverToPosition(d.id, positionIndex);
                      } else if (pickerFor === 'pole') { setPole(d.id); setPickerFor(null); }
                      else if (pickerFor === 'fastest') { setFastestLap(d.id); setPickerFor(null); }
                      else if (pickerFor === 'dotd') { setDotd(d.id); setPickerFor(null); }
                    }}
                  >
                    <DriverAvatar driver={d} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerRowText} numberOfLines={1}>
                        {d.number != null ? `#${d.number} ` : ''}{d.name}
                      </Text>
                      <Text style={styles.pickerRowMeta} numberOfLines={1}>{d.team?.name || 'Sin escudería'}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const RetirementsModal = () => (
    <Modal visible={retirementsModal} transparent animationType="slide" onRequestClose={() => setRetirementsModal(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setRetirementsModal(false)}>
        <Pressable style={[styles.pickerCard, { minHeight: '55%' }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerTitle}>Nº de abandonos</Text>
              <Text style={styles.pickerSub}>¿Cuántos pilotos crees que abandonarán?</Text>
            </View>
            <TouchableOpacity onPress={() => setRetirementsModal(false)} style={styles.pickerCloseBtn}>
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {Array.from({ length: 16 }, (_, i) => i).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numBtn, retirements === String(n) && styles.numBtnActive]}
                  onPress={() => { setRetirements(String(n)); setRetirementsModal(false); }}
                >
                  <Text style={[styles.numBtnText, retirements === String(n) && styles.numBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Render principal ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: C.text }}>Evento no encontrado</Text>
      </View>
    );
  }

  const podium = positions.slice(0, 3).map((id) => driversById[id]).filter(Boolean);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Elegir Predicción F1</Text>
          <View style={styles.headerMeta}>
            <Ionicons name="calendar-outline" size={11} color={C.textSecondary} />
            <Text style={styles.headerMetaText} numberOfLines={1}>
              {event.name} · {formatDate(event.event_date)} · {formatTime(event.event_date)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'picks' && styles.tabActive]}
          onPress={() => setTab('picks')}
        >
          <Text style={[styles.tabText, tab === 'picks' && styles.tabTextActive]}>Elegir Pilotos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'summary' && styles.tabActive]}
          onPress={() => setTab('summary')}
        >
          <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Resumen</Text>
        </TouchableOpacity>
      </View>

      {locked && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={14} color={C.warning} />
          <Text style={styles.lockedText}>Predicciones cerradas — el evento ya comenzó</Text>
        </View>
      )}

      {tab === 'picks' ? (
        <View style={styles.pickBody}>
          {/* Columna izquierda: pilotos disponibles */}
          <View style={styles.leftCol}>
            <Text style={styles.colTitle}>Pilotos Disponibles</Text>
            <Text style={styles.colSub}>Toca + para asignarlo a la siguiente posición libre</Text>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {availableList.length === 0 ? (
                <View style={styles.emptyAvail}>
                  <Ionicons name="checkmark-circle" size={26} color={C.primary} />
                  <Text style={styles.emptyAvailText}>Todos asignados</Text>
                </View>
              ) : (
                availableList.map((item) => renderAvailableDriver({ item }))
              )}
            </ScrollView>
          </View>

          {/* Columna derecha: posiciones */}
          <View style={styles.rightCol}>
            <Text style={styles.colTitle}>Predicción de Posiciones</Text>
            <Text style={styles.colSub}>{usedCount}/{gridSize} · Mantén pulsado para reordenar</Text>
            <DraggableFlatList
              data={positionData}
              keyExtractor={(it) => it.key}
              renderItem={renderPositionItem}
              onDragEnd={handleReorderPositions}
              activationDistance={8}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
          {/* Podio */}
          <Text style={styles.sectionTitle}>Podio predicho</Text>
          <View style={styles.podiumRow}>
            {[1, 0, 2].map((rankIdx) => {
              const driver = podium[rankIdx];
              const podiumClass = rankIdx === 0 ? styles.podium1 : rankIdx === 1 ? styles.podium2 : styles.podium3;
              const label = rankIdx === 0 ? 'P1' : rankIdx === 1 ? 'P2' : 'P3';
              return (
                <View key={rankIdx} style={[styles.podiumSlot, podiumClass]}>
                  <Text style={styles.podiumLabel}>{label}</Text>
                  {driver ? (
                    <>
                      <DriverAvatar driver={driver} size={54} />
                      <Text style={styles.podiumName} numberOfLines={1}>{driver.short_name || driver.name?.split(' ').slice(-1)[0]}</Text>
                    </>
                  ) : (
                    <View style={styles.podiumEmpty}>
                      <Ionicons name="help" size={22} color={C.textSecondary} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Menciones */}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Menciones especiales</Text>
          <View style={styles.mentionsList}>
            <MentionRow C={C} styles={styles} icon="trophy" label="Pole Position" driver={driversById[pole]} disabled={locked} onPress={() => setPickerFor('pole')} />
            <MentionRow C={C} styles={styles} icon="flash" label="Vuelta Rápida" driver={driversById[fastestLap]} disabled={locked} onPress={() => setPickerFor('fastest')} />
            <MentionRow C={C} styles={styles} icon="star" label="Piloto del Día" driver={driversById[dotd]} disabled={locked} onPress={() => setPickerFor('dotd')} />
            <TouchableOpacity
              style={styles.mentionRow}
              disabled={locked}
              onPress={() => setRetirementsModal(true)}
            >
              <View style={[styles.mentionIcon, { backgroundColor: withAlpha(C.error, 0.15) }]}>
                <Ionicons name="warning" size={18} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mentionLabel}>Abandonos</Text>
                <Text style={styles.mentionValue}>{retirements ? `${retirements} pilotos` : 'Sin selección'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Listado completo predicho */}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Parrilla completa</Text>
          <View style={{ marginTop: 8 }}>
            {positions.map((driverId, idx) => {
              const d = driverId ? driversById[driverId] : null;
              const isPodium = idx < 3;
              return (
                <View key={`sum-${idx}`} style={[styles.sumRow, isPodium && styles.sumRowPodium]}>
                  <Text style={[styles.sumPos, isPodium && { color: C.primary }]}>P{idx + 1}</Text>
                  {d ? (
                    <>
                      <DriverAvatar driver={d} size={30} />
                      <Text style={styles.sumName} numberOfLines={1}>{d.name}</Text>
                      <Text style={styles.sumTeam} numberOfLines={1}>{d.team?.name || ''}</Text>
                    </>
                  ) : (
                    <Text style={{ color: C.textSecondary, fontStyle: 'italic', flex: 1, marginLeft: 8 }}>Sin piloto</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Footer con guardar */}
      {!locked && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>{usedCount}/{gridSize} pilotos · {tab === 'summary' ? 'Confirma tu predicción' : 'Elige y ordena'}</Text>
          </View>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={C.onAccent} /> : (
              <>
                <Ionicons name="save" size={16} color={C.onAccent} />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <DriverPickerModal />
      <RetirementsModal />

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        primaryButtonText="Aceptar"
        onPrimaryPress={() => {
          const cb = statusModal.onAccept;
          closeStatus();
          if (cb) cb();
        }}
        onClose={closeStatus}
      />
    </View>
  );
}

const MentionRow = ({ C, styles, icon, label, driver, disabled, onPress }) => (
  <TouchableOpacity style={styles.mentionRow} disabled={disabled} onPress={onPress}>
    <View style={[styles.mentionIcon, { backgroundColor: withAlpha(C.primary, 0.15) }]}>
      <Ionicons name={icon} size={18} color={C.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.mentionLabel}>{label}</Text>
      <Text style={styles.mentionValue} numberOfLines={1}>
        {driver ? `${driver.number != null ? `#${driver.number} ` : ''}${driver.name}` : 'Sin selección'}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
  </TouchableOpacity>
);

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  infoBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 },
  headerMetaText: { color: C.textSecondary, fontSize: 11 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: `${C.primary}44`, backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: `${C.primary}18`, borderColor: C.primary },
  tabText: { color: C.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: C.primary },

  lockedBanner: { marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.warning}18`, borderColor: C.warning, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  lockedText: { color: C.warning, fontSize: 12, fontWeight: '600' },

  pickBody: { flex: 1, flexDirection: 'row', paddingHorizontal: 10, gap: 8 },
  leftCol: { flex: 1.05 },
  rightCol: { flex: 1 },
  colTitle: { color: C.text, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  colSub: { color: C.textSecondary, fontSize: 10.5, marginBottom: 8 },

  availDriver: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 8, borderRadius: 12, backgroundColor: C.cardDark, borderWidth: 1, borderColor: `${C.primary}18`,
    marginBottom: 6,
  },
  availLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  availOrder: { color: C.primary, fontWeight: '800', fontSize: 11, width: 28 },
  availName: { color: C.text, fontWeight: '600', fontSize: 12 },
  availTeam: { color: C.textSecondary, fontSize: 10, marginTop: 1 },
  availAdd: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  emptyAvail: { alignItems: 'center', padding: 20 },
  emptyAvailText: { color: C.textSecondary, fontSize: 12, marginTop: 6 },

  posSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, borderColor: `${C.primary}30`, borderStyle: 'dashed',
    marginBottom: 5, backgroundColor: 'transparent', minHeight: 46,
  },
  posSlotFilled: { borderStyle: 'solid', backgroundColor: `${C.primary}0d`, borderColor: `${C.primary}55` },
  posSlotPodium: { borderColor: C.primary, backgroundColor: `${C.primary}18` },
  posSlotActive: { transform: [{ scale: 1.02 }], borderColor: C.primary, backgroundColor: `${C.primary}28` },
  posLabel: { color: C.primary, fontWeight: '800', fontSize: 12, width: 28 },
  posLabelPodium: { color: C.primary },
  posDriverRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  posDriverName: { color: C.text, fontWeight: '700', fontSize: 12 },
  posDriverMeta: { color: C.textSecondary, fontSize: 10, marginTop: 1 },
  posPlaceholder: { color: C.textSecondary, fontSize: 11, flex: 1 },
  posPlaceholderPodium: { color: C.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, flex: 1 },

  avatar: { backgroundColor: `${C.primary}22`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Resumen
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumSlot: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: C.cardDark, borderWidth: 1, borderColor: `${C.primary}22`, gap: 6 },
  podium1: { paddingVertical: 22, borderColor: `${C.primary}88`, backgroundColor: `${C.primary}22` },
  podium2: { paddingVertical: 14 },
  podium3: { paddingVertical: 10 },
  podiumLabel: { color: C.primary, fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
  podiumName: { color: C.text, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  podiumEmpty: { width: 54, height: 54, borderRadius: 27, backgroundColor: `${C.textSecondary}22`, alignItems: 'center', justifyContent: 'center' },

  mentionsList: { gap: 8 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.cardDark, borderWidth: 1, borderColor: `${C.primary}18` },
  mentionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mentionLabel: { color: C.text, fontSize: 13, fontWeight: '700' },
  mentionValue: { color: C.textSecondary, fontSize: 11, marginTop: 2 },

  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: C.cardDark, marginBottom: 4, borderWidth: 1, borderColor: `${C.primary}12` },
  sumRowPodium: { borderColor: `${C.primary}55` },
  sumPos: { color: C.textSecondary, fontWeight: '800', width: 32, fontSize: 11 },
  sumName: { color: C.text, fontWeight: '600', fontSize: 12, flex: 1 },
  sumTeam: { color: C.textSecondary, fontSize: 10 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 12,
    backgroundColor: C.background, borderTopWidth: 1, borderTopColor: `${C.primary}22`,
  },
  footerLabel: { color: C.textSecondary, fontSize: 11 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  saveBtnText: { color: C.onAccent, fontWeight: '800', fontSize: 14 },

  // Picker — bottom sheet grande y visible
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  pickerCard: {
    backgroundColor: C.cardDark,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    height: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: `${C.primary}44`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  pickerHandle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: `${C.textSecondary}66`, marginBottom: 12 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${C.primary}22`,
    marginBottom: 4,
  },
  pickerCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${C.textSecondary}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerTitle: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  pickerSub: { color: C.textSecondary, fontSize: 12, marginTop: 3 },
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${C.primary}14`,
    borderWidth: 1, borderColor: `${C.primary}33`,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 12, marginBottom: 10,
  },
  pickerInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },
  pickerScroll: { flex: 1 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, marginBottom: 6,
    backgroundColor: `${C.primary}08`,
    borderWidth: 1, borderColor: `${C.primary}18`,
  },
  pickerRowActive: { backgroundColor: `${C.primary}22`, borderColor: C.primary },
  pickerRowText: { color: C.text, fontSize: 14, fontWeight: '700' },
  pickerRowMeta: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  numBtn: {
    width: 62, height: 54, borderRadius: 14,
    borderWidth: 1.5, borderColor: `${C.primary}44`,
    backgroundColor: `${C.primary}0d`,
    alignItems: 'center', justifyContent: 'center',
  },
  numBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  numBtnText: { color: C.primary, fontWeight: '800', fontSize: 18 },
  numBtnTextActive: { color: C.onAccent },
});
