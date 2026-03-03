import React from 'react';

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number;
}

const MaterialIcon = ({ name, className = '', size = 24 }: MaterialIconProps) => (
  <span
    className={`material-icons-outlined ${className}`}
    style={{ fontSize: size }}
  >
    {name}
  </span>
);

export default MaterialIcon;
