import React from 'react';
import { IconEyeCheck, IconEyeOff } from '@tabler/icons-react';

const VisibilityIconToggle = ({ reveal }: { reveal: boolean }) => {
  return reveal ? (
    <IconEyeOff style={{ width: 'var(--psi-icon-size)', height: 'var(--psi-icon-size)' }} />
  ) : (
    <IconEyeCheck style={{ width: 'var(--psi-icon-size)', height: 'var(--psi-icon-size)' }} />
  );
};

export default VisibilityIconToggle;
