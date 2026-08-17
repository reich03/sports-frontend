import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formArea: {
    flex: 1,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
    width: '100%',
  },
  brandLogoHorizontal: {
    width: SCREEN_WIDTH * 0.88,
    height: Math.min(SCREEN_WIDTH * 0.24, 104),
  },
  brandTagline: {
    marginTop: 8,
    fontSize: 14,
    color: '#cbd5e1',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 50,
  },
  brandFooter: {
    alignItems: 'center',
    marginTop: 30,
    width: '100%',
    opacity: 1,
  },
  brandLogoMundial: {
    width: SCREEN_WIDTH * 0.68,
    height: Math.min(SCREEN_WIDTH * 0.22, 100),
  },
  formCard: {
    backgroundColor: 'rgba(15, 20, 26, 0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  emailHighlight: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  expiryNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 6,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginLeft: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 20, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
    paddingLeft: 16,
    paddingRight: 12,
    height: 56,
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
  otpInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 20,
    height: '100%',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  checkIcon: {
    marginLeft: 8,
  },
  checkIconPlaceholder: {
    width: 28,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.backgroundDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});
