import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

/**
 * StatusModal - Modal reutilizable para mostrar errores, éxitos y confirmaciones
 * Basado en el diseño moderno con overlay blur y animaciones
 * 
 * @param {boolean} visible - Controla la visibilidad del modal
 * @param {function} onClose - Callback cuando se cierra el modal
 * @param {string} type - 'error' | 'success' | 'warning' | 'info'
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje descriptivo
 * @param {string} primaryButtonText - Texto del botón principal (default: "Aceptar")
 * @param {function} onPrimaryPress - Callback del botón principal
 * @param {string} secondaryButtonText - Texto del botón secundario (opcional)
 * @param {function} onSecondaryPress - Callback del botón secundario (opcional)
 * @param {string} icon - Nombre del icono de Ionicons (opcional, se auto-selecciona por tipo)
 */
const StatusModal = ({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  primaryButtonText = 'Aceptar',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  icon,
}) => {
  // Configuración por tipo
  const getConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: icon || 'close-circle',
          iconBg: 'rgba(159, 5, 25, 0.1)',
          iconColor: '#ff716c',
          accentColor: '#ff716c',
        };
      case 'success':
        return {
          icon: icon || 'checkmark-circle',
          iconBg: 'rgba(63, 255, 140, 0.1)',
          iconColor: '#3fff8c',
          accentColor: '#3fff8c',
        };
      case 'warning':
        return {
          icon: icon || 'warning',
          iconBg: 'rgba(255, 184, 0, 0.1)',
          iconColor: '#FFB800',
          accentColor: '#FFB800',
        };
      default:
        return {
          icon: icon || 'information-circle',
          iconBg: 'rgba(100, 200, 255, 0.1)',
          iconColor: '#64C8FF',
          accentColor: '#64C8FF',
        };
    }
  };

  const config = getConfig();

  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop Blur */}
        <View style={styles.backdrop} />
        
        {/* Modal Container */}
        <View style={styles.modalContainer}>
          <View style={[styles.modal, { borderTopColor: config.accentColor }]}>
            {/* Header con Icono */}
            <View style={[styles.header, { backgroundColor: config.iconBg }]}>
              <View style={[
                styles.iconContainer, 
                { backgroundColor: config.iconBg },
                type === 'error' && { backgroundColor: 'rgba(159, 5, 25, 0.2)' }
              ]}>
                <Ionicons name={config.icon} size={36} color={config.iconColor} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Contenido */}
            <View style={styles.content}>
              <Text style={styles.message}>{message}</Text>

              {/* Botones de Acción */}
              <View style={styles.actions}>
                {/* Botón Principal con Gradiente */}
                <TouchableOpacity
                  style={styles.primaryButtonWrapper}
                  onPress={handlePrimaryPress}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[config.accentColor, config.accentColor + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Botón Secundario (opcional) */}
                {secondaryButtonText && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleSecondaryPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Decorative Bottom Line */}
            <View style={[styles.bottomLine, { backgroundColor: config.accentColor }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    zIndex: 2,
  },
  modal: {
    backgroundColor: '#20262f',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(68, 72, 79, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 24,
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f3fc',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  message: {
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  primaryButtonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#a8abb3',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bottomLine: {
    height: 4,
    width: '100%',
    opacity: 0.3,
  },
});

export default StatusModal;
