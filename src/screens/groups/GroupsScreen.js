import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { groupService } from '../../services';

const GroupsScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getMyGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el grupo');
      return;
    }

    try {
      setSubmitting(true);
      await groupService.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
      });
      
      Alert.alert('¡Éxito!', 'Grupo creado exitosamente');
      setCreateModalVisible(false);
      setGroupName('');
      setGroupDescription('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'No se pudo crear el grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de invitación');
      return;
    }

    try {
      setSubmitting(true);
      await groupService.joinGroup(inviteCode.trim());
      
      Alert.alert('¡Éxito!', 'Te has unido al grupo exitosamente');
      setJoinModalVisible(false);
      setInviteCode('');
      loadGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.error?.message || 'No se pudo unir al grupo'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderGroupCard = ({ item }) => (
    <TouchableOpacity style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupDescription} numberOfLines={2}>
            {item.description || 'Sin descripción'}
          </Text>
        </View>
      </View>

      <View style={styles.groupStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.member_count || 0}</Text>
          <Text style={styles.statLabel}>Miembros</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {item.GroupMember?.group_points || 0}
          </Text>
          <Text style={styles.statLabel}>Tus Puntos</Text>
        </View>
      </View>

      <View style={styles.inviteCodeContainer}>
        <Text style={styles.inviteCodeLabel}>Código invitación:</Text>
        <View style={styles.inviteCodeBox}>
          <Text style={styles.inviteCode}>{item.invite_code}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mis Grupos</Text>
            <Text style={styles.headerSubtitle}>
              Compite con tus amigos
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.actionButtonText}>+ Crear Grupo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => setJoinModalVisible(true)}
        >
          <Text style={styles.actionButtonText}>Unirse a Grupo</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes grupos</Text>
          <Text style={styles.emptySubtext}>
            Crea un grupo o únete con un código de invitación
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Grupo</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del grupo</Text>
              <TextInput
                style={styles.input}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Ej: Amigos del fútbol"
                placeholderTextColor={COLORS.textGray}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="Describe tu grupo..."
                placeholderTextColor={COLORS.textGray}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCreateModalVisible(false);
                  setGroupName('');
                  setGroupDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateGroup}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.black} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unirse a Grupo</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Código de invitación</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Ingresa el código"
                placeholderTextColor={COLORS.textGray}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setJoinModalVisible(false);
                  setInviteCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleJoinGroup}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.black} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Unirse</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 255, 140, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a8abb3',
    fontWeight: '600',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  joinButton: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.black,
    ...FONTS.body2,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: SIZES.padding,
  },
  groupCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: SIZES.padding,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIconText: {
    color: COLORS.primary,
    ...FONTS.h3,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: COLORS.white,
    ...FONTS.h4,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupDescription: {
    color: COLORS.textGray,
    ...FONTS.body3,
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.padding,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.padding,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.primary,
    ...FONTS.h3,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textGray,
    ...FONTS.body4,
    marginTop: 4,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeLabel: {
    color: COLORS.textGray,
    ...FONTS.body3,
  },
  inviteCodeBox: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  inviteCode: {
    color: COLORS.primary,
    ...FONTS.body2,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.white,
    ...FONTS.h3,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textGray,
    ...FONTS.body3,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.white,
    ...FONTS.h3,
    fontWeight: 'bold',
    marginBottom: SIZES.padding * 1.5,
  },
  inputGroup: {
    marginBottom: SIZES.padding,
  },
  inputLabel: {
    color: COLORS.textGray,
    ...FONTS.body3,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundDark,
    color: COLORS.white,
    ...FONTS.body2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SIZES.padding,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textGray,
    ...FONTS.body2,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    color: COLORS.black,
    ...FONTS.body2,
    fontWeight: 'bold',
  },
});

export default GroupsScreen;
