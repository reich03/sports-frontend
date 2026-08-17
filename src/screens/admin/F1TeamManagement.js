import React from 'react';
import TeamManagement from './TeamManagement';

/**
 * Wrapper que reutiliza TeamManagement bloqueado a F1.
 * Pre-filtra la lista a escuderías F1 y fija el deporte en el formulario.
 */
export default function F1TeamManagement(props) {
  const params = props.route?.params || {};
  return (
    <TeamManagement
      {...props}
      route={{ ...props.route, params: { ...params, lockedSportCode: 'f1' } }}
    />
  );
}
