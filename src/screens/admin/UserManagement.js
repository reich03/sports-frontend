import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import { userService } from '../../services';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import CONFIG, { BASE_URL } from '../../constants/config';

const UserManagement = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Status/Confirmation Modals
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        isActive: true,
    });
    
    // Password visibility
    const [showPassword, setShowPassword] = useState(false);
    
    // Selected avatar image
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        newToday: 0,
        activeUsers: 0,
        inactiveUsers: 0,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [searchQuery, activeFilter, users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            console.log('📋 Fetching all users...');
            const response = await userService.getAllUsers();
            const userData = response.data.users;
            console.log(`✅ Users fetched: ${JSON.stringify(userData)}`);
            console.log('✅ Users fetched:', userData.length);

            setUsers(userData);
            calculateStats(userData);
        } catch (error) {
            console.error('❌ Error fetching users:', error);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Cargar',
                message: 'No se pudieron cargar los usuarios. Por favor, intenta de nuevo.',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateStats = (userData) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const newToday = userData.filter(user => {
            const createdAt = new Date(user.createdAt);
            return createdAt >= todayStart;
        }).length;

        const activeUsers = userData.filter(user => user.isActive !== false).length;
        console.log(`📊 Stats calculated - Total: ${userData.length}, New Today: ${newToday}, Active: ${activeUsers}`);

        setStats({
            totalUsers: userData.length,
            newToday: newToday,
            activeUsers: activeUsers,
            inactiveUsers: userData.length - activeUsers,
        });
    };

    const filterUsers = () => {
        let filtered = [...users];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.username?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (activeFilter === 'active') {
            filtered = filtered.filter(user => user.isActive !== false);
        } else if (activeFilter === 'inactive') {
            filtered = filtered.filter(user => user.isActive === false);
        } else if (activeFilter === 'admin') {
            filtered = filtered.filter(user => user.role === 'admin');
        }

        setFilteredUsers(filtered);
    };

    const handleCreateUser = async () => {
        try {
            if (!formData.name || !formData.email || !formData.password) {
                setStatusModal({
                    visible: true,
                    type: 'warning',
                    title: 'Campos Incompletos',
                    message: 'Por favor completa todos los campos obligatorios para crear el usuario.',
                });
                return;
            }

            console.log('➕ Creating user:', formData);

            await userService.createUser({
                username: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                isActive: formData.isActive,
            });

            setShowCreateModal(false);
            resetForm();
            await fetchUsers();
            
            setStatusModal({
                visible: true,
                type: 'success',
                title: '¡Usuario Creado!',
                message: `El usuario ${formData.name} ha sido creado exitosamente y ya puede acceder al sistema.`,
            });
        } catch (error) {
            console.error('❌ Error creating user:', error);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Crear',
                message: error.response?.data?.error?.message || 'No se pudo crear el usuario. Por favor, intenta de nuevo.',
            });
        }
    };

    const handleUpdateUser = async () => {
        try {
            if (!selectedUser || !formData.name || !formData.email) {
                setStatusModal({
                    visible: true,
                    type: 'warning',
                    title: 'Campos Incompletos',
                    message: 'Por favor completa todos los campos obligatorios para actualizar el usuario.',
                });
                return;
            }

            console.log('✏️ Updating user:', selectedUser.id);

            // Update user profile
            await userService.updateUserProfile(selectedUser.id, {
                username: formData.name,
                email: formData.email,
            });

            // Update role if changed
            if (formData.role !== selectedUser.role) {
                await userService.updateUserRole(selectedUser.id, formData.role);
            }

            setShowEditModal(false);
            resetForm();
            await fetchUsers();
            
            setStatusModal({
                visible: true,
                type: 'success',
                title: '¡Actualización Exitosa!',
                message: `Los datos de ${formData.name} han sido actualizados correctamente.`,
            });
        } catch (error) {
            console.error('❌ Error updating user:', error);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Actualizar',
                message: error.response?.data?.error?.message || 'No se pudo actualizar el usuario. Por favor, intenta de nuevo.',
            });
        }
    };

    const handleDeleteUser = async () => {
        try {
            if (!selectedUser) return;

            console.log('🗑️ Deleting user:', selectedUser.id);
            await userService.deleteUser(selectedUser.id);

            setShowDeleteModal(false);
            setSelectedUser(null);
            await fetchUsers();
            
            setStatusModal({
                visible: true,
                type: 'success',
                title: '¡Usuario Eliminado!',
                message: `El usuario ha sido eliminado correctamente del sistema.`,
            });
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            setShowDeleteModal(false);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Eliminar',
                message: error.response?.data?.error?.message || 'No se pudo eliminar el usuario. Por favor, intenta de nuevo.',
            });
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.username || '',
            email: user.email || '',
            password: '',
            role: user.role || 'user',
            isActive: user.isActive !== false,
        });
        setSelectedImage(null); // Reset selected image when opening edit modal
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        resetForm();
        setSelectedImage(null);
        setShowCreateModal(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'user',
            isActive: true,
        });
        setSelectedUser(null);
        setSelectedImage(null);
    };

    const pickImage = async () => {
        const userId = selectedUser?.id;
        if (!userId) {
            setStatusModal({
                visible: true,
                type: 'warning',
                title: 'Error',
                message: 'Debes crear el usuario primero antes de subir una foto.',
            });
            return;
        }

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            setStatusModal({
                visible: true,
                type: 'warning',
                title: 'Permisos Requeridos',
                message: 'Necesitamos acceso a tu galería para subir fotos.',
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5, // Reducir calidad para archivos más pequeños
            base64: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const imageUri = result.assets[0].uri;
            console.log('📸 Imagen seleccionada:', {
                uri: imageUri,
                width: result.assets[0].width,
                height: result.assets[0].height,
            });
            setSelectedImage(imageUri);
            await handleUploadAvatar(imageUri);
        }
    };

    const handleUploadAvatar = async (imageUri) => {
        const userId = selectedUser?.id;
        if (!userId) return;

        try {
            setUploadingImage(true);
            await userService.uploadAvatar(userId, imageUri);
            
            // Limpiar la imagen seleccionada después del upload exitoso
            setSelectedImage(null);
            
            setStatusModal({
                visible: true,
                type: 'success',
                title: '¡Foto Actualizada!',
                message: 'La foto de perfil ha sido actualizada exitosamente.',
            });
            await fetchUsers();
        } catch (error) {
            console.error('Error al subir avatar:', error);
            
            // También limpiar en caso de error para permitir reintentar
            setSelectedImage(null);
            
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Subir',
                message: error.message || 'No se pudo subir la foto. Intenta seleccionarla de nuevo.',
            });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteAvatar = async () => {
        const userId = selectedUser?.id;
        if (!userId) return;

        try {
            await userService.deleteAvatar(userId);
            setSelectedImage(null);
            setStatusModal({
                visible: true,
                type: 'success',
                title: 'Foto Eliminada',
                message: 'La foto de perfil ha sido eliminada exitosamente.',
            });
            await fetchUsers();
        } catch (error) {
            console.error('Error al eliminar avatar:', error);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error al Eliminar',
                message: error.response?.data?.error?.message || 'No se pudo eliminar la foto. Intenta de nuevo.',
            });
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const renderUserItem = (user) => {
        const isActive = user.isActive !== false;
        const isAdmin = user.role === 'admin';

        return (
            <TouchableOpacity
                key={user.id}
                style={[styles.userItem, !isActive && styles.userItemInactive]}
                activeOpacity={0.7}
            >
                <View style={styles.userItemLeft}>
                    <View style={styles.avatarContainer}>
                        {user.avatar ? (
                            <Image source={{ uri: `${BASE_URL}${user.avatar}` }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, !isActive && styles.avatarInactive]}>
                                <Text style={styles.avatarText}>
                                    {user.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusInactive]} />
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, !isActive && styles.userNameInactive]}>
                            {user.username || user.name || 'Sin nombre'}
                        </Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                </View>

                <View style={styles.userItemRight}>
                    <View style={styles.roleContainer}>
                        <Text style={styles.roleLabel}>ROL</Text>
                        <Text style={[styles.roleValue, isAdmin && styles.roleAdmin]}>
                            {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Text>
                    </View>

                    <View style={styles.userActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openEditModal(user)}
                        >
                            <Ionicons name="create-outline" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openDeleteModal(user)}
                        >
                            <Ionicons name="ban-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando usuarios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <AdminHeader
                title="Usuarios"
                subtitle="Gestión de Usuarios"
                onBack={() => navigation.goBack()}
                rightIcon="notifications-outline"
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <LinearGradient
                        colors={['rgba(63, 255, 140, 0.1)', 'rgba(63, 255, 140, 0.05)']}
                        style={styles.statCard}
                    >
                        <View style={styles.statGlow} />
                        <Text style={styles.statLabel}>USUARIOS</Text>
                        <View style={styles.statRow}>
                            <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
                            <View style={styles.statBadge}>
                                <Ionicons name="trending-up" size={12} color={COLORS.primary} />
                                <Text style={styles.statBadgeText}>8%</Text>
                            </View>
                        </View>
                        <View style={styles.statBar}>
                            <View style={[styles.statBarFill, { width: '72%' }]} />
                        </View>
                    </LinearGradient>

                    <LinearGradient
                        colors={['rgba(123, 230, 255, 0.1)', 'rgba(123, 230, 255, 0.05)']}
                        style={styles.statCard}
                    >
                        <View style={[styles.statGlow, { backgroundColor: 'rgba(123, 230, 255, 0.2)' }]} />
                        <Text style={styles.statLabel}>NUEVOS HOY</Text>
                        <View style={styles.statRow}>
                            <Text style={styles.statValue}>+{stats.newToday}</Text>
                            <View style={[styles.statBadge, styles.statBadgeTertiary]}>
                                <Ionicons name="flash" size={12} color={COLORS.white} />
                                <Text style={[styles.statBadgeText, { color: COLORS.white }]}>Activo</Text>
                            </View>
                        </View>
                        <Text style={styles.statSubtext}>
                            Incremento del 12% desde el ciclo de registro de ayer
                        </Text>
                    </LinearGradient>
                </View>

                {/* Search & Filters */}
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar usuarios, admins o roles..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity style={styles.filterButton}>
                            <Ionicons name="options-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                            onPress={() => setActiveFilter('all')}
                        >
                            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                                Usuarios
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'active' && styles.filterChipActive]}
                            onPress={() => setActiveFilter('active')}
                        >
                            <Text style={[styles.filterChipText, activeFilter === 'active' && styles.filterChipTextActive]}>
                                Activos
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'inactive' && styles.filterChipActive]}
                            onPress={() => setActiveFilter('inactive')}
                        >
                            <Text style={[styles.filterChipText, activeFilter === 'inactive' && styles.filterChipTextActive]}>
                                Inactivos
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'admin' && styles.filterChipActive]}
                            onPress={() => setActiveFilter('admin')}
                        >
                            <Text style={[styles.filterChipText, activeFilter === 'admin' && styles.filterChipTextActive]}>
                                Administradores
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* User List */}
                <View style={styles.userList}>
                    {filteredUsers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
                            <Text style={styles.emptyStateText}>
                                {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                            </Text>
                        </View>
                    ) : (
                        filteredUsers.map((user) => renderUserItem(user))
                    )}
                </View>

                {/* Load More Button */}
                {filteredUsers.length > 0 && (
                    <TouchableOpacity style={styles.loadMoreButton}>
                        <Text style={styles.loadMoreText}>Cargar Más Usuarios</Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Floating Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={openCreateModal}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#000" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Create User Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Crear Nuevo Usuario</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Photo Upload Section */}
                            <View style={styles.photoSection}>
                                <View style={styles.photoPlaceholder}>
                                    {uploadingImage ? (
                                        <ActivityIndicator size="large" color={COLORS.primary} />
                                    ) : selectedImage || selectedUser?.avatar ? (
                                        <Image
                                            source={{ uri: selectedImage || `${BASE_URL}${selectedUser?.avatar}` }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                                    )}
                                </View>
                                <View style={styles.photoInfo}>
                                    <Text style={styles.photoTitle}>Foto de Perfil</Text>
                                    <Text style={styles.photoSubtext}>Tamaño recomendado 400x400px. JPG o PNG.</Text>
                                    <TouchableOpacity
                                        style={[styles.uploadButton, uploadingImage && styles.uploadButtonDisabled]}
                                        onPress={pickImage}
                                        disabled={uploadingImage}
                                    >
                                        <Text style={styles.uploadButtonText}>Subir Nueva</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Información Personal</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Nombre Completo</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="person" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                            placeholder="Ingresa el nombre completo"
                                            placeholderTextColor="#64748b"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Correo Electrónico</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            placeholder="usuario@ejemplo.com"
                                            placeholderTextColor="#64748b"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Contraseña</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.password}
                                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                                            placeholder="Ingresa la contraseña"
                                            placeholderTextColor="#64748b"
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <MaterialIcons
                                                name={showPassword ? 'visibility' : 'visibility-off'}
                                                size={20}
                                                color="#94a3b8"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Governance Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Permisos y Acceso</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Rol de Usuario</Text>
                                    <View style={styles.roleToggle}>
                                        <TouchableOpacity
                                            style={[styles.roleOption, formData.role === 'user' && styles.roleOptionActive]}
                                            onPress={() => setFormData({ ...formData, role: 'user' })}
                                        >
                                            <Text style={[styles.roleOptionText, formData.role === 'user' && styles.roleOptionTextActive]}>
                                                Usuario
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionActive]}
                                            onPress={() => setFormData({ ...formData, role: 'admin' })}
                                        >
                                            <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextActive]}>
                                                Administrador
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Estado de Cuenta</Text>
                                    <View style={styles.statusToggle}>
                                        <TouchableOpacity
                                            style={[styles.statusOption, formData.isActive && styles.statusOptionActive]}
                                            onPress={() => setFormData({ ...formData, isActive: true })}
                                        >
                                            <Text style={[styles.statusOptionText, formData.isActive && styles.statusOptionTextActive]}>
                                                Activo
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.statusOption, !formData.isActive && styles.statusOptionSuspended]}
                                            onPress={() => setFormData({ ...formData, isActive: false })}
                                        >
                                            <Text style={[styles.statusOptionText, !formData.isActive && styles.statusOptionTextSuspended]}>
                                                Suspendido
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>CANCELAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleCreateUser}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    style={styles.saveButtonGradient}
                                >
                                    <Text style={styles.saveButtonText}>CREAR USUARIO</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editar Perfil de Usuario</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Same form as create but with update logic */}
                            <View style={styles.photoSection}>
                                <View style={styles.photoPlaceholder}>
                                    {uploadingImage ? (
                                        <ActivityIndicator size="large" color={COLORS.primary} />
                                    ) : selectedImage || selectedUser?.avatar ? (
                                        <Image
                                            source={{ uri: selectedImage || `${BASE_URL}${selectedUser?.avatar}` }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                                    )}
                                </View>
                                <View style={styles.photoInfo}>
                                    <Text style={styles.photoTitle}>Foto de Perfil</Text>
                                    <Text style={styles.photoSubtext}>Tamaño recomendado 400x400px. JPG o PNG.</Text>
                                    <View style={styles.photoButtons}>
                                        <TouchableOpacity
                                            style={[styles.uploadButton, uploadingImage && styles.uploadButtonDisabled]}
                                            onPress={pickImage}
                                            disabled={uploadingImage}
                                        >
                                            <Text style={styles.uploadButtonText}>Subir Nueva</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.removeButton, uploadingImage && styles.uploadButtonDisabled]}
                                            onPress={handleDeleteAvatar}
                                            disabled={uploadingImage || (!selectedImage && !selectedUser?.avatar)}
                                        >
                                            <Text style={styles.removeButtonText}>Eliminar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Información Personal</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Nombre Completo</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="person" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                            placeholder="Ingresa el nombre completo"
                                            placeholderTextColor="#64748b"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Correo Electrónico</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            placeholder="usuario@ejemplo.com"
                                            placeholderTextColor="#64748b"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Contraseña</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.password}
                                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                                            placeholder="Dejar vacío para mantener la actual"
                                            placeholderTextColor="#64748b"
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <MaterialIcons
                                                name={showPassword ? 'visibility' : 'visibility-off'}
                                                size={20}
                                                color="#94a3b8"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.formHint}>
                                        Opcional: Dejar vacío si no deseas cambiarla.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Permisos y Acceso</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Rol de Usuario</Text>
                                    <View style={styles.roleToggle}>
                                        <TouchableOpacity
                                            style={[styles.roleOption, formData.role === 'user' && styles.roleOptionActive]}
                                            onPress={() => setFormData({ ...formData, role: 'user' })}>
                                            <Text style={[styles.roleOptionText, formData.role === 'user' && styles.roleOptionTextActive]}>
                                                Usuario
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionActive]}
                                            onPress={() => setFormData({ ...formData, role: 'admin' })}
                                        >
                                            <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextActive]}>
                                                Administrador
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Estado de Cuenta</Text>
                                    <View style={styles.statusToggle}>
                                        <TouchableOpacity
                                            style={[styles.statusOption, formData.isActive && styles.statusOptionActive]}
                                            onPress={() => setFormData({ ...formData, isActive: true })}
                                        >
                                            <Text style={[styles.statusOptionText, formData.isActive && styles.statusOptionTextActive]}>
                                                Activo
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.statusOption, !formData.isActive && styles.statusOptionSuspended]}
                                            onPress={() => setFormData({ ...formData, isActive: false })}
                                        >
                                            <Text style={[styles.statusOptionText, !formData.isActive && styles.statusOptionTextSuspended]}>
                                                Suspendido
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>CANCELAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleUpdateUser}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    style={styles.saveButtonGradient}
                                >
                                    <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.deleteOverlay}>
                    <View style={styles.deleteModal}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDeleteModal(false)}
                        >
                            <Ionicons name="close" size={24} color={COLORS.white} />
                        </TouchableOpacity>

                        <View style={styles.deleteIconContainer}>
                            <Ionicons name="warning" size={48} color={COLORS.error} />
                        </View>

                        <Text style={styles.deleteTitle}>Confirmar Eliminación</Text>
                        <Text style={styles.deleteMessage}>
                            ¿Estás seguro de que deseas eliminar este usuario? Esta acción es irreversible y borrará todos los datos asociados permanentemente.
                        </Text>

                        {selectedUser && (
                            <View style={styles.deleteUserCard}>
                                <View style={styles.deleteUserAvatar}>
                                    {selectedUser.photoURL ? (
                                        <Image source={{ uri: selectedUser.photoURL }} style={styles.deleteUserImage} />
                                    ) : (
                                        <View style={styles.deleteUserPlaceholder}>
                                            <Text style={styles.deleteUserInitial}>
                                                {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.deleteUserInfo}>
                                    <Text style={styles.deleteUserName}>
                                        {selectedUser.name || selectedUser.username || 'Sin nombre'}
                                    </Text>
                                    <Text style={styles.deleteUserEmail}>{selectedUser.email}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={styles.deleteCancelButton}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.deleteCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={handleDeleteUser}
                            >
                                <Text style={styles.deleteConfirmText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Status/Confirmation Modal */}
            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                primaryButtonText="Aceptar"
                onPrimaryPress={() => setStatusModal({ ...statusModal, visible: false })}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(63, 255, 140, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: -0.5,
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(32, 38, 47, 0.6)',
        borderRadius: 16,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    statGlow: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        backgroundColor: 'rgba(63, 255, 140, 0.2)',
        borderRadius: 40,
        opacity: 0.5,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 12,
    },
    statValue: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: -1,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(63, 255, 140, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statBadgeTertiary: {
        backgroundColor: 'rgba(123, 230, 255, 0.1)',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.white,
    },
    statBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    statBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    statSubtext: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 15,
    },
    filterButton: {
        marginLeft: 12,
    },
    filterScroll: {
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    filterChipTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    userList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(32, 38, 47, 0.6)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    userItemInactive: {
        opacity: 0.5,
    },
    userItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(63, 255, 140, 0.2)',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(63, 255, 140, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(63, 255, 140, 0.2)',
    },
    avatarInactive: {
        backgroundColor: 'rgba(114, 117, 125, 0.2)',
        borderColor: 'rgba(114, 117, 125, 0.2)',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    statusActive: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    statusInactive: {
        backgroundColor: COLORS.textSecondary,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 4,
    },
    userNameInactive: {
        color: COLORS.textSecondary,
    },
    userEmail: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    userItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    roleContainer: {
        alignItems: 'flex-end',
    },
    roleLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    roleValue: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
    },
    roleAdmin: {
        color: COLORS.white,
    },
    userActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 32,
    },
    loadMoreText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f1f5f9',
    },
    modalBody: {
        padding: 20,
    },
    photoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: 'rgba(32, 38, 47, 0.6)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    photoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    photoInfo: {
        flex: 1,
    },
    photoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f1f5f9',
        marginBottom: 4,
    },
    photoSubtext: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 12,
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    uploadButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        flex: 1,
        minWidth: 120,
        alignItems: 'center',
    },
    uploadButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 0.5,
    },
    uploadButtonDisabled: {
        opacity: 0.5,
    },
    removeButton: {
        backgroundColor: 'rgba(255, 113, 108, 0.15)',
        borderWidth: 1,
        borderColor: COLORS.error,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        flex: 1,
        minWidth: 120,
        alignItems: 'center',
    },
    removeButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    formSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#cbd5e1',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 16,
        gap: 8,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#cbd5e1',
        marginLeft: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 1)',
        paddingLeft: 16,
        paddingRight: 12,
        height: 52,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#f1f5f9',
        fontSize: 15,
        height: '100%',
    },
    eyeIcon: {
        padding: 8,
        marginLeft: 4,
    },
    formInput: {
        backgroundColor: '#1a1f28',
        borderWidth: 1,
        borderColor: 'rgba(168, 171, 179, 0.2)',
        borderRadius: 12,
        padding: 14,
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '500',
    },
    formHint: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
        paddingHorizontal: 4,
    },
    roleToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    roleOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    roleOptionActive: {
        backgroundColor: COLORS.primary,
    },
    roleOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    roleOptionTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    statusToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    statusOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusOptionActive: {
        backgroundColor: COLORS.primary,
    },
    statusOptionSuspended: {
        backgroundColor: COLORS.error,
    },
    statusOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    statusOptionTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    statusOptionTextSuspended: {
        color: '#fff',
        fontWeight: '700',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        letterSpacing: 1.2,
    },
    saveButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1.2,
    },
    // Delete Modal Styles
    deleteOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModal: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 20,
        padding: 32,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(215, 56, 59, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    deleteTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 12,
    },
    deleteMessage: {
        fontSize: 15,
        color: COLORS.white,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    deleteUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    deleteUserAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    deleteUserImage: {
        width: '100%',
        height: '100%',
    },
    deleteUserPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(63, 255, 140, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteUserInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    deleteUserInfo: {
        flex: 1,
    },
    deleteUserName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 4,
    },
    deleteUserEmail: {
        fontSize: 13,
        color: COLORS.primary,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteCancelButton: {
        flex: 1,
        backgroundColor: 'rgba(32, 38, 47, 0.8)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,

    },
    deleteCancelText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
    deleteConfirmButton: {
        flex: 1,
        backgroundColor: COLORS.errorLight,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    deleteConfirmText: {
        fontSize: 15,
        fontWeight: '700',
         color: COLORS.white,
    },
});

export default UserManagement;

