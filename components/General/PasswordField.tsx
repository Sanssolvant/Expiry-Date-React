import React, { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { Box, PasswordInput, Popover, Progress, Text } from '@mantine/core';
import VisibilityIconToggle from './VisibilityIconToggle';

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  return (
    <Text
      style={{ display: 'flex', alignItems: 'center', color: meets ? 'teal' : 'red' }}
      mt={7}
      size="sm"
    >
      <Box ml={10}>{label}</Box>
    </Text>
  );
}

const requirements = [
  { re: /[0-9]/, label: 'Enthält Nummern' },
  { re: /[a-z]/, label: 'Enthält kleine Buchstaben' },
  { re: /[A-Z]/, label: 'Enthält grosse Buchstaben' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Enthält spezielle Zeichen' },
];

function getStrength(password: string) {
  let multiplier = password.length > 5 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

export const PasswordField = ({ form }: { form: any }) => {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [value, setValue] = useState('');

  const strength = getStrength(value);
  const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
  ));

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.currentTarget.value;
    setValue(newPassword);
    form.setFieldValue('password', newPassword); // Aktualisiere den Wert im Formular
  };

  useEffect(() => {
    if (!value) {
      setPopoverOpened(false);
    }
  }, [value]);

  return (
    <Popover
      opened={popoverOpened}
      position="bottom"
      width="target"
      transitionProps={{ transition: 'pop' }}
    >
      <Popover.Target>
        <div
          onFocusCapture={() => setPopoverOpened(true)}
          onBlurCapture={() => setPopoverOpened(false)}
        >
          <PasswordInput
            label="Passwort"
            autoComplete="true"
            withAsterisk
            placeholder="Dein Passwort"
            visibilityToggleIcon={VisibilityIconToggle}
            leftSection={<IconLock size={18} />}
            value={value}
            error={form.errors.password}
            onChange={handlePasswordChange} // Setze den Passwortwert im Formular
          />
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <Progress color={color} value={strength} size={5} mb="xs" />
        <PasswordRequirement label="Enthält mindestens 8 Zeichen" meets={value.length > 7} />
        {checks}
      </Popover.Dropdown>
    </Popover>
  );
};
