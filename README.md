# MasterSport - Mobile App

Aplicación móvil de predicciones deportivas desarrollada con React Native y Expo.

## Características

- 🏈 Múltiples deportes (Fútbol, Baloncesto, Fórmula 1)
- 📊 Rankings y estadísticas
- 👥 Grupos privados y públicos
- 🔔 Notificaciones en tiempo real
- 🎨 Modo oscuro por defecto
- 🔐 Autenticación con Google y Apple

## Stack Tecnológico

- React Native con Expo
- React Navigation
- AsyncStorage para almacenamiento local
- Axios para peticiones HTTP
- Expo Linear Gradient

## Instalación

```bash
npm install
```

## Ejecutar

```bash
# Desarrollo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Estructura del Proyecto

```
src/
  ├── components/     # Componentes reutilizables
  ├── screens/        # Pantallas de la aplicación
  ├── navigation/     # Configuración de navegación
  ├── services/       # API y servicios
  ├── context/        # Context API para estado global
  ├── utils/          # Utilidades y helpers
  ├── constants/      # Constantes (colores, tamaños, etc.)
  └── assets/         # Imágenes, fuentes, etc.
```

## Configuración

Crea un archivo `.env` si necesitas variables de entorno personalizadas.

La URL de la API se configura en `app.json` bajo `extra.apiUrl`.
