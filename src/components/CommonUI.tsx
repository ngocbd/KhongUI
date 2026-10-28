import React, { useState } from 'react';
import { Icon } from './Icon';
import { getAvatarGradient } from '../utils/rules';

interface AvatarViewProps {
  uinValue: string;
  size?: number;
  isUnknownSender?: boolean;
}

export const AvatarView: React.FC<AvatarViewProps> = ({
  uinValue,
  size = 54,
  isUnknownSender = false,
}) => {
  if (isUnknownSender) {
    return (
      <div
        className="avatar-circle avatar-unknown"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <Icon name="person" size={Math.round(size * 0.52)} />
      </div>
    );
  }

  const grad = getAvatarGradient(uinValue);
  const fontSize = Math.max(13, Math.round(size * 0.36));

  return (
    <div
      className="avatar-circle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `linear-gradient(180deg, ${grad.top} 0%, ${grad.bottom} 100%)`,
        fontSize: `${fontSize}px`,
      }}
    >
      {grad.label}
    </div>
  );
};

interface MaskedCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
}

const supportsWebkitTextSecurity =
  typeof window !== 'undefined' &&
  typeof window.CSS !== 'undefined' &&
  typeof window.CSS.supports === 'function' &&
  window.CSS.supports('-webkit-text-security', 'disc');

export const MaskedCodeInput: React.FC<MaskedCodeInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  onKeyDown,
  autoFocus = false,
  ariaLabel,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const useOverlayFallback = !visible && !supportsWebkitTextSecurity && value.length > 0;

  return (
    <div className={`masked-input-wrap ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`khong-input masked-code-field ${
          !visible && supportsWebkitTextSecurity ? 'text-security-disc' : ''
        } ${useOverlayFallback ? 'transparent-input-text' : ''}`}
      />
      {useOverlayFallback && (
        <div className="masked-dots-overlay">
          {'•'.repeat(value.length)}
        </div>
      )}
      <button
        type="button"
        className="icon-btn eye-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? `Mask ${placeholder}` : `Show ${placeholder}`}
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} size={20} />
      </button>
    </div>
  );
};

export const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <span
    className="khong-spinner"
    style={{ width: `${size}px`, height: `${size}px` }}
  />
);
