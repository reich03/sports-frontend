import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminHeader } from '../../components/admin';
import { COLORS } from '../../constants/theme';
import { sportService } from '../../services';
import { getDefaultScoreRules } from '../../constants/scoring';
import StatusModal from '../../components/StatusModal';

const SCORE_RULE_FIELDS = [
  {
    key: 'exact_score',
    title: 'Marcador exacto',
    description: 'Resultado completo acertado (ej. 2-1)',
  },
  {
    key: 'correct_winner',
    title: 'Ganador correcto',
    description: 'Acierta quién gana, sin marcador exacto',
  },
  {
    key: 'correct_draw',
    title: 'Empate correcto',
    description: 'Predice empate y el partido termina empatado',
  },
  {
    key: 'home_goal_bonus',
    title: 'Goles del local',
    description: 'Acierta los goles del equipo local',
  },
  {
    key: 'away_goal_bonus',
    title: 'Goles del visitante',
    description: 'Acierta los goles del equipo visitante',
  },
];

const POSITION_RULE_FIELDS = [
  {
    key: 'exact_podium',
    title: 'Podio exacto',
    description: 'Orden exacto del podio (1º, 2º, 3º)',
  },
  {
    key: 'correct_position',
    title: 'Posición correcta',
    description: 'Piloto o equipo en la posición correcta',
  },
  {
    key: 'in_podium',
    title: 'En el podio',
    description: 'En podio pero en posición distinta',
  },
  {
    key: 'pole_position',
    title: 'Pole position',
    description: 'Acierta la pole position',
  },
];

const RuleField = ({ title, description, value, onChange }) => (
  <View style={styles.ruleRow}>
    <View style={styles.ruleTextBlock}>
      <Text style={styles.ruleTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.ruleDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>
    <View style={styles.pointsWrap}>
      <Text style={styles.pointsLabel}>pts</Text>
      <TextInput
        style={styles.pointsInput}
        keyboardType="number-pad"
        maxLength={3}
        value={value?.toString() ?? '0'}
        onChangeText={onChange}
        selectTextOnFocus
      />
    </View>
  </View>
);

const ExampleRow = ({ prediction, detail, points }) => (
  <View style={styles.exampleRow}>
    <View style={styles.exampleLeft}>
      <Text style={styles.examplePrediction}>{prediction}</Text>
      {detail ? (
        <Text style={styles.exampleDetail} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </View>
    <View style={styles.examplePtsBadge}>
      <Text style={styles.examplePtsText}>{points} pts</Text>
    </View>
  </View>
);

const ScoringRulesManagement = ({ navigation }) => {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);
  const [rules, setRules] = useState({});

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadSports();
  }, []);

  const getDefaultRules = (predictionType) => {
    if (predictionType === 'score') return getDefaultScoreRules();
    if (predictionType === 'positions') {
      return {
        exact_podium: 10,
        correct_position: 3,
        in_podium: 1,
        pole_position: 2,
      };
    }
    return {};
  };

  const loadSports = async () => {
    try {
      setLoading(true);
      const response = await sportService.getSports();
      const sportsData = response.data?.sports || response.data || [];
      setSports(sportsData);

      if (sportsData.length > 0) {
        const firstSport = sportsData[0];
        setSelectedSport(firstSport);
        setRules(firstSport.scoring_rules || getDefaultRules(firstSport.prediction_type));
      }
    } catch (error) {
      console.error('Error loading sports:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los deportes',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setRules(sport.scoring_rules || getDefaultRules(sport.prediction_type));
  };

  const handleRuleChange = (key, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setRules((prev) => ({
      ...prev,
      [key]: sanitized === '' ? 0 : parseInt(sanitized, 10),
    }));
  };

  const handleSave = async () => {
    if (!selectedSport) return;

    try {
      setSaving(true);
      await sportService.updateSport(selectedSport.id, {
        scoring_rules: rules,
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Guardado',
        message: 'Las reglas de puntuación se actualizaron correctamente.',
      });

      await loadSports();
    } catch (error) {
      console.error('Error saving rules:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron guardar las reglas de puntuación',
      });
    } finally {
      setSaving(false);
    }
  };

  const maxPerMatch =
    (rules.exact_score || 0) +
    Math.max(rules.correct_winner || 0, rules.correct_draw || 0) +
    (rules.home_goal_bonus || 0) +
    (rules.away_goal_bonus || 0);

  const renderScoreExamples = () => {
    const exact = rules.exact_score || 0;
    const winner = rules.correct_winner || 0;
    const homeBonus = rules.home_goal_bonus || 0;
    const awayBonus = rules.away_goal_bonus || 0;

    return (
      <View style={styles.exampleCard}>
        <Text style={styles.exampleHeading}>Ejemplo con resultado real 2-1</Text>
        <Text style={styles.exampleHint}>
          Máximo teórico por partido: {maxPerMatch} pts (si sumas todos los aciertos)
        </Text>

        <ExampleRow
          prediction="Predicción 2-1"
          detail="Marcador exacto"
          points={exact}
        />
        <ExampleRow
          prediction="Predicción 3-2"
          detail="Ganador + goles visitante"
          points={winner + awayBonus}
        />
        <ExampleRow
          prediction="Predicción 2-0"
          detail="Ganador + goles local"
          points={winner + homeBonus}
        />
        <ExampleRow
          prediction="Predicción 1-0"
          detail="Solo ganador"
          points={winner}
        />
        <ExampleRow
          prediction="Predicción 2-3"
          detail="Solo goles local"
          points={homeBonus}
        />
        <ExampleRow prediction="Predicción 3-0" detail="Sin acierto" points={0} />
      </View>
    );
  };

  const renderScoreRules = () => (
    <View style={styles.rulesBlock}>
      <Text style={styles.blockTitle}>Puntos por acierto</Text>
      <Text style={styles.blockSubtitle}>
        Define cuántos puntos gana el usuario según su predicción
      </Text>

      <View style={styles.rulesList}>
        {SCORE_RULE_FIELDS.map((field) => (
          <RuleField
            key={field.key}
            title={field.title}
            description={field.description}
            value={rules[field.key]}
            onChange={(val) => handleRuleChange(field.key, val)}
          />
        ))}
      </View>

      {renderScoreExamples()}
    </View>
  );

  const renderPositionRules = () => (
    <View style={styles.rulesBlock}>
      <Text style={styles.blockTitle}>Puntos por posición</Text>
      <Text style={styles.blockSubtitle}>
        Reglas para deportes con predicción de podio (F1, MotoGP, etc.)
      </Text>

      <View style={styles.rulesList}>
        {POSITION_RULE_FIELDS.map((field) => (
          <RuleField
            key={field.key}
            title={field.title}
            description={field.description}
            value={rules[field.key]}
            onChange={(val) => handleRuleChange(field.key, val)}
          />
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Reglas de Puntuación" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Reglas de Puntuación" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbarCard}>
          <Text style={styles.toolbarLabel}>Deporte</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportChipsRow}
          >
            {sports.map((sport) => {
              const active = selectedSport?.id === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportChip, active && styles.sportChipActive]}
                  onPress={() => handleSportChange(sport)}
                >
                  <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedSport ? (
            <View style={styles.sportMeta}>
              <Text style={styles.sportMetaText}>
                Tipo: {selectedSport.prediction_type === 'score' ? 'Marcador' : 'Posiciones'}
              </Text>
            </View>
          ) : null}
        </View>

        {selectedSport?.prediction_type === 'score' && renderScoreRules()}
        {selectedSport?.prediction_type === 'positions' && renderPositionRules()}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, '#00c96a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.backgroundDark} />
            ) : (
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        primaryButtonText="Entendido"
        onPrimaryPress={() => setStatusModal({ ...statusModal, visible: false })}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  toolbarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 10,
  },
  sportChipsRow: {
    gap: 8,
    paddingRight: 4,
  },
  sportChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  sportChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sportChipTextActive: {
    color: COLORS.backgroundDark,
  },
  sportMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  sportMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  rulesBlock: {
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  blockSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  rulesList: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}18`,
  },
  ruleTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 3,
  },
  ruleDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  pointsWrap: {
    width: 64,
    alignItems: 'center',
    gap: 4,
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: `${COLORS.primary}90`,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pointsInput: {
    width: 64,
    height: 44,
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${COLORS.primary}50`,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' } : {}),
  },
  exampleCard: {
    marginTop: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  exampleHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  exampleHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  exampleLeft: {
    flex: 1,
    minWidth: 0,
  },
  examplePrediction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  exampleDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  examplePtsBadge: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examplePtsText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saveButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonGradient: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.backgroundDark,
  },
});

export default ScoringRulesManagement;
