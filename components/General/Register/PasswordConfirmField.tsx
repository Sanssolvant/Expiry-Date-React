import React from 'react';
import { IconLock } from '@tabler/icons-react';
import { PasswordInput } from '@mantine/core';
import VisibilityIconToggle from '../Toggles/VisibilityIconToggle';

export const PasswordConfirmField = ({
  confirmPassword,
  setConfirmPassword,
  confirmPasswordError,
  setConfirmPasswordError,
}: {
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPasswordError: string;
  setConfirmPasswordError: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Setze den Wert für das Confirm Password
    setConfirmPassword(event.currentTarget.value);

    // Fehler zurücksetzen, wenn der Benutzer etwas eingibt
    setConfirmPasswordError('');
  };

  return (
    <PasswordInput
      label="Passwort bestätigen"
      withAsterisk
      placeholder="Passwort wiederholen"
      visibilityToggleIcon={VisibilityIconToggle}
      leftSection={<IconLock size={18} />}
      value={confirmPassword}
      onChange={handleConfirmPasswordChange} // Fehler zurücksetzen und Wert aktualisieren
      error={confirmPasswordError} // Zeige den Fehler an, wenn vorhanden
      required
    />
  );
};
