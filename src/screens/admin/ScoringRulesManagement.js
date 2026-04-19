import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminHeader, AdminCard } from '../../components/admin';
import { COLORS } from '../../constants/theme';
import { sportService } from '../../services';
import StatusModal from '../../components/StatusModal';

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

  const getDefaultRules = (predictionType) => {
    if (predictionType === 'score') {
      return {
        exact_score: 5,
        correct_winner: 3,
        correct_draw: 3,
        exact_difference: 2,
        one_score_correct: 1,
      };
    } else if (predictionType === 'positions') {
      return {
        exact_podium: 10,
        correct_position: 3,
        in_podium: 1,
        pole_position: 2,
      };
    }
    return {};
  };

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setRules(sport.scoring_rules || getDefaultRules(sport.prediction_type));
  };

  const handleRuleChange = (key, value) => {
    setRules(prev => ({
      ...prev,
      [key]: parseInt(value) || 0
    }));
  };

  const handleSave = async () => {
    if (!selectedSport) return;

    try {
      setSaving(true);
      await sportService.updateSport(selectedSport.id, {
        scoring_rules: rules
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Guardado!',
        message: 'Las reglas de puntuación se han actualizado correctamente.',
      });

      // Reload sports
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

  const renderScoreRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.sectionTitle}>Puntos por Acierto</Text>
      <Text style={styles.sectionSubtitle}>
        Define cuántos puntos gana el usuario según su predicción
      </Text>

      {/* Exact Score */}
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="trophy" size={24} color={COLORS.primary} />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Marcador Exacto</Text>
            <Text style={styles.ruleDescription}>
              El usuario predice el resultado exacto (ej: 2-1)
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.exact_score?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('exact_score', val)}
        />
      </View>

      {/* Correct Winner */}
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="trophy-outline" size={24} color={COLORS.success} />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Ganador Correcto</Text>
            <Text style={styles.ruleDescription}>
              Acierta quién gana pero no el marcador exacto
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.correct_winner?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('correct_winner', val)}
        />
      </View>

      {/* Correct Draw */}
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="remove-circle-outline" size={24} color="#94a3b8" />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Empate Correcto</Text>
            <Text style={styles.ruleDescription}>
              Predice empate y el resultado es empate
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.correct_draw?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('correct_draw', val)}
        />
      </View>

      {/* Exact Difference */}
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="analytics-outline" size={24} color="#fbbf24" />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Diferencia Exacta (Bonus)</Text>
            <Text style={styles.ruleDescription}>
              Acierta la diferencia de goles (ej: gana por 2)
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.exact_difference?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('exact_difference', val)}
        />
      </View>

      {/* One Score Correct */}
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#60a5fa" />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Un Marcador Correcto</Text>
            <Text style={styles.ruleDescription}>
              Acierta solo el marcador del local o visitante
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.one_score_correct?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('one_score_correct', val)}
        />
      </View>

      {/* Example Section */}
      <View style={styles.exampleSection}>
        <Text style={styles.exampleTitle}>📊 Ejemplo de Puntuación</Text>
        <Text style={styles.exampleSubtitle}>Resultado Real: 2-1</Text>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 2-1:</Text>
          <Text style={styles.examplePoints}>{rules.exact_score || 0} pts (exacto)</Text>
        </View>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 3-2:</Text>
          <Text style={styles.examplePoints}>
            {(rules.correct_winner || 0) + (rules.exact_difference || 0)} pts (ganador + diferencia)
          </Text>
        </View>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 1-0:</Text>
          <Text style={styles.examplePoints}>{rules.correct_winner || 0} pts (ganador)</Text>
        </View>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 2-0:</Text>
          <Text style={styles.examplePoints}>
            {(rules.correct_winner || 0) + (rules.one_score_correct || 0)} pts (ganador + local)
          </Text>
        </View>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 0-1:</Text>
          <Text style={styles.examplePoints}>{rules.one_score_correct || 0} pts (solo visitante)</Text>
        </View>
        
        <View style={styles.exampleRow}>
          <Text style={styles.examplePrediction}>Predicción 3-0:</Text>
          <Text style={styles.examplePoints}>0 pts (nada correcto)</Text>
        </View>
      </View>
    </View>
  );

  const renderPositionRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.sectionTitle}>Puntos por Posición (F1, MotoGP)</Text>

      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="trophy" size={24} color={COLORS.primary} />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Podio Exacto</Text>
            <Text style={styles.ruleDescription}>Orden exacto del podio</Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.exact_podium?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('exact_podium', val)}
        />
      </View>

      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="podium" size={24} color={COLORS.success} />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Posición Correcta</Text>
            <Text style={styles.ruleDescription}>Equipo en posición correcta</Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.correct_position?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('correct_position', val)}
        />
      </View>

      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#60a5fa" />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>En el Podio</Text>
            <Text style={styles.ruleDescription}>Equipo en podio pero posición incorrecta</Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.in_podium?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('in_podium', val)}
        />
      </View>

      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <Ionicons name="flash" size={24} color="#fbbf24" />
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleTitle}>Pole Position</Text>
            <Text style={styles.ruleDescription}>Acierta la pole position</Text>
          </View>
        </View>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={rules.pole_position?.toString() || '0'}
          onChangeText={(val) => handleRuleChange('pole_position', val)}
        />
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
      
      <ScrollView style={styles.scrollView}>
        {/* Sport Selector */}
        <View style={styles.sportSelector}>
          {sports.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.sportChip,
                selectedSport?.id === sport.id && styles.sportChipActive
              ]}
              onPress={() => handleSportChange(sport)}
            >
              <Text style={[
                styles.sportChipText,
                selectedSport?.id === sport.id && styles.sportChipTextActive
              ]}>
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rules based on sport type */}
        {selectedSport?.prediction_type === 'score' && renderScoreRules()}
        {selectedSport?.prediction_type === 'positions' && renderPositionRules()}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.backgroundDark} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={COLORS.backgroundDark} />
              <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  sportChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sportChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sportChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  sportChipTextActive: {
    color: COLORS.backgroundDark,
  },
  rulesContainer: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  ruleCard: {
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  pointsInput: {
    width: 70,
    height: 48,
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  exampleSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  exampleSubtitle: {
    fontSize: 13,
    color: '#60a5fa',
    marginBottom: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  examplePrediction: {
    fontSize: 13,
    color: '#94a3b8',
  },
  examplePoints: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.backgroundDark,
  },
});

export default ScoringRulesManagement;
