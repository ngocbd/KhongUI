import React, { useState } from 'react';
import {
  ACCOUNT_KEY_CODE,
  ACCOUNT_UIN,
  MAX_CONTACTS_PER_SPACE,
  SpaceRecord,
  formatHushUntilDate,
  formatShortUin,
  formatUinFourLines,
} from '../utils/rules';
import { AvatarView, MaskedCodeInput, Spinner } from './CommonUI';
import { BedtimeIllustration, Icon, KhongLogo, QrPatternSquare } from './Icon';

export type LeftSubPage =
  | 'chat_list'
  | 'contacts'
  | 'new_contact'
  | 'settings'
  | 'my_id'
  | 'notifications'
  | 'privacy'
  | 'hush'
  | 'new_space'
  | 'remove_space'
  | 'chat_settings'
  | 'about'
  | 'about_verify'
  | 'about_threat';

interface SettingsPagesProps {
  subPage: LeftSubPage;
  onNavigate: (page: LeftSubPage) => void;
  onBack: () => void;
  regularContactCount: number;
  notificationsEnabled: boolean;
  onToggleNotifications: (val: boolean) => void;
  onLockNow: () => void;
  onClearSpaceHistory: () => void;
  onHushCurrentSpace: () => void;
  onRemoveCurrentSpace: () => void;
  onCreateNewSpace: (newCode: string) => void;
  allSpaces: SpaceRecord[];
  isOffline: boolean;
  onShowToast: (msg: string) => void;
  onCopyText: (text: string, toastMsg: string) => void;
}

export const SettingsPages: React.FC<SettingsPagesProps> = ({
  subPage,
  onNavigate,
  onBack,
  regularContactCount,
  notificationsEnabled,
  onToggleNotifications,
  onLockNow,
  onClearSpaceHistory,
  onHushCurrentSpace,
  onRemoveCurrentSpace,
  onCreateNewSpace,
  allSpaces,
  isOffline,
  onCopyText,
}) => {
  // S-20 Privacy and Security dialogs / states
  const [infoDialogText, setInfoDialogText] = useState<{ title: string; body: string } | null>(
    null
  );
  const [confirmClearSpaceOpen, setConfirmClearSpaceOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  // S-21 Hush states
  const [hushHours, setHushHours] = useState<number>(1);
  const [confirmHushOpen, setConfirmHushOpen] = useState(false);
  const [isHushing, setIsHushing] = useState(false);

  // S-22 New space states
  const [newSpaceStep, setNewSpaceStep] = useState<
    'intro' | 'keep' | 'choose_code' | 'creating' | 'created' | 'offline_error'
  >('intro');
  const [keepCodes, setKeepCodes] = useState<string[]>(['']);
  const [keepErrors, setKeepErrors] = useState<Record<number, string>>({});
  const [isCheckingKeepCodes, setIsCheckingKeepCodes] = useState(false);

  const [newSpaceCode1, setNewSpaceCode1] = useState('');
  const [newSpaceCode2, setNewSpaceCode2] = useState('');
  const [newSpaceCodeError, setNewSpaceCodeError] = useState('');
  const [newSpaceMismatchError, setNewSpaceMismatchError] = useState('');
  const [isCheckingDuplicateSpaceCode, setIsCheckingDuplicateSpaceCode] = useState(false);

  // S-23 Remove space states
  const [removeConfirmText, setRemoveConfirmText] = useState('');
  const [isRemovingSpace, setIsRemovingSpace] = useState(false);

  const isCodeValidInSpaces = (candidate: string): boolean => {
    const trimmed = candidate.trim();
    return allSpaces.some(
      (sp) => !sp.isRemoved && !sp.isHushed && sp.codeValue === trimmed
    );
  };

  if (subPage === 'settings') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Settings</h1>
        </header>

        <div className="subpage-scroll">
          <div
            className="settings-profile-card"
            onClick={() => onNavigate('my_id')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNavigate('my_id');
            }}
          >
            <AvatarView uinValue={ACCOUNT_UIN} size={54} />
            <div className="profile-card-info">
              <div className="profile-card-title">My ID</div>
              <div className="profile-card-subtitle">{formatShortUin(ACCOUNT_UIN)}</div>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('my_id');
              }}
              aria-label="QR code"
            >
              <Icon name="qr_code_2" />
            </button>
          </div>

          <div className="settings-section-card">
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('my_id')}
            >
              <span className="settings-row-icon">
                <Icon name="badge" />
              </span>
              <span className="settings-row-label">My ID</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('contacts')}
            >
              <span className="settings-row-icon">
                <Icon name="person" />
              </span>
              <span className="settings-row-label">Contacts</span>
              <span className="settings-row-value">
                {regularContactCount} of {MAX_CONTACTS_PER_SPACE}
              </span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>

          <div className="settings-section-card">
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('notifications')}
            >
              <span className="settings-row-icon">
                <Icon name="notifications" />
              </span>
              <span className="settings-row-label">Notifications</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('privacy')}
            >
              <span className="settings-row-icon">
                <Icon name="shield" />
              </span>
              <span className="settings-row-label">Privacy and Security</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('chat_settings')}
            >
              <span className="settings-row-icon">
                <Icon name="palette" />
              </span>
              <span className="settings-row-label">Chat Settings</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>

          <div className="settings-section-card">
            <div className="settings-section-caption">Spaces</div>
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                setNewSpaceStep('intro');
                setKeepCodes(['']);
                setKeepErrors({});
                setNewSpaceCode1('');
                setNewSpaceCode2('');
                setNewSpaceCodeError('');
                setNewSpaceMismatchError('');
                onNavigate('new_space');
              }}
            >
              <span className="settings-row-icon">
                <Icon name="add_circle" />
              </span>
              <span className="settings-row-label">New space</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row settings-row-danger"
              onClick={() => {
                setRemoveConfirmText('');
                onNavigate('remove_space');
              }}
            >
              <span className="settings-row-icon danger-icon">
                <Icon name="delete_forever" />
              </span>
              <span className="settings-row-label danger-text">Remove this space</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>
          <div className="settings-footnote">
            Every Khong account has the same space options. Khong never shows how many spaces an account has.
          </div>

          <div className="settings-section-card">
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('about')}
            >
              <span className="settings-row-icon">
                <Icon name="info" />
              </span>
              <span className="settings-row-label">About Khong</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'my_id') {
    const uinLines = formatUinFourLines(ACCOUNT_UIN);
    const fullBoth = `khong:${ACCOUNT_UIN}.${ACCOUNT_KEY_CODE}`;
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">My ID</h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          <p className="body-secondary-text">
            Share these with people you want to talk to in this space.
          </p>

          <QrPatternSquare labelText={`QR code: ${fullBoth}`} />

          <div className="info-card">
            <div className="section-caption-inline">UIN</div>
            <div className="mono-four-lines">
              {uinLines.map((line, lineIdx) => (
                <div key={lineIdx}>{line}</div>
              ))}
            </div>
          </div>

          <div className="info-card">
            <div className="section-caption-inline">Key code</div>
            <div className="mono-block">{ACCOUNT_KEY_CODE}</div>
          </div>

          <div className="button-row-group">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onCopyText(ACCOUNT_UIN, 'UIN copied')}
            >
              <Icon name="content_copy" size={18} />
              <span>Copy UIN</span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onCopyText(ACCOUNT_KEY_CODE, 'Key code copied')}
            >
              <Icon name="content_copy" size={18} />
              <span>Copy key code</span>
            </button>
            <button
              type="button"
              className="primary-btn full-width-btn"
              onClick={() => onCopyText(fullBoth, 'Copied to clipboard')}
            >
              <Icon name="content_copy" size={18} />
              <span>Copy both</span>
            </button>
          </div>

          <div className="settings-footnote">
            Anything you copy stays in the clipboard after Khong locks.
          </div>

          <div className="warning-card">
            <div className="warning-card-header">
              <Icon name="warning" size={20} />
              <span>
                Anyone who has this UIN can recognize this account in every space. Share it only with people from one space.
              </span>
            </div>
            <div className="warning-card-sub">
              To keep groups of people fully apart, use a separate Khong account.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'notifications') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Notifications</h1>
        </header>
        <div className="subpage-scroll">
          <div className="settings-section-card">
            <label className="settings-row switch-row">
              <span className="settings-row-icon">
                <Icon name="notifications" />
              </span>
              <span className="settings-row-label">Message notifications</span>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => onToggleNotifications(e.target.checked)}
                className="khong-switch"
              />
            </label>
          </div>

          <div className="subpage-padded">
            <div className="sys-notification-preview">
              <KhongLogo size={36} />
              <div className="sys-notification-text">
                <div className="sys-notification-app">Khong</div>
                <div className="sys-notification-title">New message</div>
                <div className="sys-notification-body">Open Khong to read it.</div>
              </div>
            </div>

            <div className="settings-footnote">
              Notifications never show who wrote or what they wrote. This setting applies to your whole account on this device.
            </div>

            {notificationsEnabled && (
              <div className="settings-footnote">
                Khong will register this device at its next regular check.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'privacy') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Privacy and Security</h1>
        </header>
        <div className="subpage-scroll">
          <div className="settings-section-card">
            <div className="settings-section-caption">Lock</div>
            <button type="button" className="settings-row" onClick={onLockNow}>
              <span className="settings-row-icon">
                <Icon name="lock" />
              </span>
              <span className="settings-row-label">Lock now</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row"
              onClick={() =>
                setInfoDialogText({
                  title: 'Auto-lock',
                  body: "Khong locks when you leave the app, when you switch to another app, and after 2 minutes without activity. This can't be changed.",
                })
              }
            >
              <span className="settings-row-icon">
                <Icon name="schedule" />
              </span>
              <span className="settings-row-label">Auto-lock</span>
              <span className="settings-row-value">2 minutes</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row"
              onClick={() => onNavigate('hush')}
            >
              <span className="settings-row-icon">
                <Icon name="bedtime" />
              </span>
              <span className="settings-row-label">Hush this space</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>

          <div className="settings-section-card">
            <div className="settings-section-caption">Screen</div>
            <button
              type="button"
              className="settings-row"
              onClick={() =>
                setInfoDialogText({
                  title: 'Screen privacy',
                  body: "Khong clears the screen before your phone saves an app-switcher picture. Some phones can still capture a frame; a web app can't fully prevent that.",
                })
              }
            >
              <span className="settings-row-icon">
                <Icon name="visibility_off" />
              </span>
              <span className="settings-row-label">Screen privacy</span>
              <span className="settings-row-value">Always on</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
          </div>

          <div className="settings-section-card">
            <div className="settings-section-caption">Data</div>
            <button
              type="button"
              className="settings-row"
              onClick={() =>
                setInfoDialogText({
                  title: 'Message history',
                  body: "Your messages are stored on the server, encrypted with this space's code. Only someone who knows the code can read them. History is kept for up to 1 year, or less when your account's history storage is full.",
                })
              }
            >
              <span className="settings-row-icon">
                <Icon name="shield" />
              </span>
              <span className="settings-row-label">Message history</span>
              <span className="settings-row-value">Stored encrypted</span>
              <span className="settings-row-chevron">
                <Icon name="chevron_right" size={20} />
              </span>
            </button>
            <button
              type="button"
              className="settings-row settings-row-danger"
              onClick={() => setConfirmClearSpaceOpen(true)}
            >
              <span className="settings-row-icon danger-icon">
                <Icon name="delete" />
              </span>
              <span className="settings-row-label danger-text">
                {isClearingHistory ? 'Clearing…' : 'Clear history of this space'}
              </span>
            </button>
            <div className="settings-row static-row">
              <span className="settings-row-icon">
                <Icon name="schedule" />
              </span>
              <span className="settings-row-label">Undelivered messages and files</span>
              <span className="settings-row-value">Deleted after 14 days</span>
            </div>
          </div>

          <div className="settings-footnote">
            Anyone who knows this space's code can read its history. The server deletes messages and files not picked up within 14 days.
          </div>
        </div>

        {infoDialogText && (
          <div className="dialog-backdrop" onClick={() => setInfoDialogText(null)}>
            <div className="khong-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
              <div className="dialog-title">{infoDialogText.title}</div>
              <div className="dialog-body">{infoDialogText.body}</div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="dialog-btn primary-text"
                  onClick={() => setInfoDialogText(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmClearSpaceOpen && (
          <div className="dialog-backdrop" onClick={() => setConfirmClearSpaceOpen(false)}>
            <div className="khong-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
              <div className="dialog-title">Clear history?</div>
              <div className="dialog-body">
                All messages in this space will become unreadable on every device. This can't be undone.
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="dialog-btn primary-text"
                  onClick={() => setConfirmClearSpaceOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dialog-btn danger-text"
                  onClick={() => {
                    setConfirmClearSpaceOpen(false);
                    setIsClearingHistory(true);
                    setTimeout(() => {
                      setIsClearingHistory(false);
                      onClearSpaceHistory();
                    }, 1000);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subPage === 'hush') {
    const durationOptions = [
      { label: '1 hour', hours: 1 },
      { label: '8 hours', hours: 8 },
      { label: '1 day', hours: 24 },
      { label: '3 days', hours: 72 },
      { label: '1 week', hours: 168 },
    ];
    const untilFormatted = formatHushUntilDate(hushHours);

    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Hush</h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          <div className="illustration-center">
            <BedtimeIllustration />
          </div>
          <p className="body-text">
            While this space is hushed, its code won't open it. Khong responds exactly as if the code were wrong. You can't end a hush early.
          </p>

          <div className="radio-group-card">
            {durationOptions.map((opt) => (
              <label key={opt.label} className="radio-row">
                <input
                  type="radio"
                  name="hush-duration"
                  checked={hushHours === opt.hours}
                  onChange={() => setHushHours(opt.hours)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {isHushing ? (
            <div className="status-inline-row">
              <Spinner size={18} />
              <span>Hushing…</span>
            </div>
          ) : (
            <button
              type="button"
              className="primary-btn full-width-btn"
              onClick={() => setConfirmHushOpen(true)}
            >
              Hush and lock
            </button>
          )}
        </div>

        {confirmHushOpen && (
          <div className="dialog-backdrop" onClick={() => setConfirmHushOpen(false)}>
            <div className="khong-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
              <div className="dialog-title">Hush this space?</div>
              <div className="dialog-body">
                Until {untilFormatted}, this code won't open this space. Khong will lock now.
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="dialog-btn primary-text"
                  onClick={() => setConfirmHushOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dialog-btn danger-text"
                  onClick={() => {
                    setConfirmHushOpen(false);
                    setIsHushing(true);
                    setTimeout(() => {
                      setIsHushing(false);
                      onHushCurrentSpace();
                    }, 1000);
                  }}
                >
                  Hush
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subPage === 'new_space') {
    const handleKeepContinue = () => {
      if (isOffline) {
        setNewSpaceStep('offline_error');
        return;
      }
      const nonBlankPositions = keepCodes
        .map((val, pos) => ({ val: val.trim(), pos }))
        .filter((item) => item.val.length > 0);

      if (nonBlankPositions.length === 0) {
        setNewSpaceStep('choose_code');
        return;
      }

      setIsCheckingKeepCodes(true);
      setKeepErrors({});
      const waitMs = nonBlankPositions.length * 2000;
      setTimeout(() => {
        setIsCheckingKeepCodes(false);
        const errs: Record<number, string> = {};
        for (const item of nonBlankPositions) {
          if (!isCodeValidInSpaces(item.val)) {
            errs[item.pos] = 'Wrong code';
          }
        }
        if (Object.keys(errs).length > 0) {
          setKeepErrors(errs);
        } else {
          setNewSpaceStep('choose_code');
        }
      }, waitMs);
    };

    const handleChooseNewSpaceCode = () => {
      setNewSpaceCodeError('');
      setNewSpaceMismatchError('');
      if (newSpaceCode1.length < 6) {
        setNewSpaceCodeError('Use at least 6 characters.');
        return;
      }
      if (newSpaceCode1 !== newSpaceCode2) {
        setNewSpaceMismatchError("The codes don't match.");
        return;
      }
      if (isOffline) {
        setNewSpaceStep('offline_error');
        return;
      }
      if (isCodeValidInSpaces(newSpaceCode1)) {
        setIsCheckingDuplicateSpaceCode(true);
        setTimeout(() => {
          setIsCheckingDuplicateSpaceCode(false);
          setNewSpaceCodeError('Choose a different code.');
        }, 2000);
        return;
      }
      setNewSpaceStep('creating');
      setTimeout(() => {
        onCreateNewSpace(newSpaceCode1);
        setNewSpaceStep('created');
      }, 2000);
    };

    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">
            {newSpaceStep === 'keep' ? 'Spaces to keep' : 'New space'}
          </h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          {newSpaceStep === 'intro' && (
            <>
              <p className="body-text">
                A space is a separate set of contacts and chats with its own code. People in one space can't see the others. Khong never shows how many spaces an account has.
              </p>
              <button
                type="button"
                className="primary-btn full-width-btn"
                onClick={() => setNewSpaceStep('keep')}
              >
                Continue
              </button>
            </>
          )}

          {newSpaceStep === 'keep' && (
            <>
              <p className="body-text">
                Enter the codes of any other spaces you want to keep.
              </p>
              <div className="warning-card">
                <div className="warning-card-header">
                  <Icon name="warning" size={20} />
                  <span>Any space whose code you don't enter here can be overwritten.</span>
                </div>
              </div>

              <div className="keep-codes-list">
                {keepCodes.map((codeVal, pos) => (
                  <div key={pos} className="keep-code-item">
                    <MaskedCodeInput
                      value={codeVal}
                      onChange={(v) => {
                        const updated = [...keepCodes];
                        updated[pos] = v;
                        setKeepCodes(updated);
                      }}
                      placeholder="Code"
                      disabled={isCheckingKeepCodes}
                    />
                    {keepErrors[pos] && (
                      <div className="field-error-text">{keepErrors[pos]}</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="text-btn"
                disabled={isCheckingKeepCodes}
                onClick={() => setKeepCodes((prev) => [...prev, ''])}
              >
                Add another code
              </button>

              {isCheckingKeepCodes && (
                <div className="status-inline-row">
                  <Spinner size={16} />
                  <span>Checking…</span>
                </div>
              )}

              <button
                type="button"
                className="primary-btn full-width-btn"
                disabled={isCheckingKeepCodes}
                onClick={handleKeepContinue}
              >
                Continue
              </button>
            </>
          )}

          {newSpaceStep === 'choose_code' && (
            <>
              <h2 className="page-heading">Choose a code</h2>
              <p className="body-text">
                You'll type this code to open Khong. Use a phrase you can remember, a few words long.
              </p>
              <div className="form-field-block">
                <MaskedCodeInput
                  value={newSpaceCode1}
                  onChange={setNewSpaceCode1}
                  placeholder="Code"
                  disabled={isCheckingDuplicateSpaceCode}
                />
                {newSpaceCodeError && (
                  <div className="field-error-text">{newSpaceCodeError}</div>
                )}
              </div>
              <div className="form-field-block">
                <MaskedCodeInput
                  value={newSpaceCode2}
                  onChange={setNewSpaceCode2}
                  placeholder="Repeat code"
                  disabled={isCheckingDuplicateSpaceCode}
                />
                {newSpaceMismatchError && (
                  <div className="field-error-text">{newSpaceMismatchError}</div>
                )}
              </div>
              <p className="small-helper-text">
                There's no way to recover a forgotten code. If you forget it, everything in this space is lost.
              </p>
              <p className="small-helper-text">
                Some keyboards remember what you type. Turn on your keyboard's incognito mode before typing a code.
              </p>
              {isCheckingDuplicateSpaceCode && (
                <div className="status-inline-row">
                  <Spinner size={16} />
                  <span>Checking…</span>
                </div>
              )}
              <button
                type="button"
                className="primary-btn full-width-btn"
                disabled={
                  !newSpaceCode1 ||
                  !newSpaceCode2 ||
                  isCheckingDuplicateSpaceCode
                }
                onClick={handleChooseNewSpaceCode}
              >
                Continue
              </button>
            </>
          )}

          {newSpaceStep === 'creating' && (
            <div className="center-status-view">
              <Spinner size={32} />
              <div className="status-title">Creating space…</div>
            </div>
          )}

          {newSpaceStep === 'created' && (
            <div className="center-status-view">
              <Icon name="check_circle" size={48} className="primary-icon" />
              <p className="body-text">
                Space created. Lock Khong and type its code to open it.
              </p>
              <button
                type="button"
                className="primary-btn full-width-btn"
                onClick={() => onNavigate('settings')}
              >
                Done
              </button>
            </div>
          )}

          {newSpaceStep === 'offline_error' && (
            <div className="center-status-view">
              <Icon name="cloud_off" size={48} className="danger-icon" />
              <p className="body-text">
                Couldn't create a space. Check your connection and try again.
              </p>
              <button
                type="button"
                className="primary-btn full-width-btn"
                onClick={() => setNewSpaceStep('intro')}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (subPage === 'remove_space') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Remove this space?</h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          <h2 className="page-heading">Remove this space?</h2>
          <p className="body-text">
            This space, its contacts, its chats, and its history will be deleted for good. Its code will stop working. This can't be undone. Other spaces aren't affected.
          </p>
          <div className="form-field-block">
            <input
              type="text"
              className="khong-input"
              placeholder="Type REMOVE to confirm"
              aria-label="Type REMOVE to confirm"
              value={removeConfirmText}
              onChange={(e) => setRemoveConfirmText(e.target.value)}
              disabled={isRemovingSpace}
            />
          </div>
          {isRemovingSpace ? (
            <div className="status-inline-row">
              <Spinner size={18} />
              <span>Removing…</span>
            </div>
          ) : (
            <button
              type="button"
              className="danger-btn full-width-btn"
              disabled={removeConfirmText !== 'REMOVE'}
              onClick={() => {
                setIsRemovingSpace(true);
                setTimeout(() => {
                  setIsRemovingSpace(false);
                  onRemoveCurrentSpace();
                }, 1500);
              }}
            >
              Remove space
            </button>
          )}
        </div>
      </div>
    );
  }

  if (subPage === 'chat_settings') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Chat Settings</h1>
        </header>
        <div className="subpage-scroll">
          <div className="settings-section-card">
            <div className="settings-row static-row">
              <span className="settings-row-icon">
                <Icon name="palette" />
              </span>
              <span className="settings-row-label">Theme</span>
              <span className="settings-row-value">System</span>
            </div>
          </div>
          <div className="settings-footnote">
            Khong follows your device's light or dark setting.
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'about_verify') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onNavigate('about')}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Verify this build</h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          <p className="body-text">
            Compare this hash with the one published for this release. If they differ, don't use this copy of Khong.
          </p>
          <div className="info-card">
            <div className="mono-block">sample-build-0000…0000</div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'about_threat') {
    return (
      <div className="subpage-container">
        <header className="khong-header">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onNavigate('about')}
            aria-label="Back"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="header-title">Threat model and limits</h1>
        </header>
        <div className="subpage-scroll subpage-padded">
          <ul className="threat-list">
            <li>No recovery for forgotten codes.</li>
            <li>History is stored encrypted and opens only with its space's code.</li>
            <li>One UIN is shared by every space.</li>
            <li>Messages checked every 15 minutes.</li>
            <li>Screenshots of the app switcher may still be captured on some phones.</li>
            <li>The server sees that an account receives messages, not their content.</li>
          </ul>
        </div>
      </div>
    );
  }

  // S-25 About Khong
  return (
    <div className="subpage-container">
      <header className="khong-header">
        <button
          type="button"
          className="icon-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="header-title">About Khong</h1>
      </header>
      <div className="subpage-scroll">
        <div className="about-hero">
          <KhongLogo size={72} />
          <div className="about-app-name">Khong</div>
          <div className="about-version">0.0.0 · pre-alpha</div>
        </div>

        <div className="subpage-padded">
          <div className="warning-card">
            <div className="warning-card-header">
              <Icon name="warning" size={20} />
              <span>
                Khong is pre-alpha and has not been audited. Don't rely on it for your safety yet.
              </span>
            </div>
          </div>
        </div>

        <div className="settings-section-card">
          <button
            type="button"
            className="settings-row"
            onClick={() =>
              onCopyText('sample-build-0000…0000', 'Copied to clipboard')
            }
          >
            <span className="settings-row-icon">
              <Icon name="content_copy" />
            </span>
            <span className="settings-row-label">Build hash</span>
            <span className="settings-row-value mono-inline">
              sample-build-0000…0000
            </span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => onNavigate('about_verify')}
          >
            <span className="settings-row-icon">
              <Icon name="verified" />
            </span>
            <span className="settings-row-label">Verify this build</span>
            <span className="settings-row-chevron">
              <Icon name="chevron_right" size={20} />
            </span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => onNavigate('about_threat')}
          >
            <span className="settings-row-icon">
              <Icon name="shield" />
            </span>
            <span className="settings-row-label">Threat model and limits</span>
            <span className="settings-row-chevron">
              <Icon name="chevron_right" size={20} />
            </span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() =>
              onCopyText('github.com/habogay/khong', 'Copied to clipboard')
            }
          >
            <span className="settings-row-icon">
              <Icon name="content_copy" />
            </span>
            <span className="settings-row-label">Source code</span>
            <span className="settings-row-value">github.com/habogay/khong</span>
          </button>
        </div>
      </div>
    </div>
  );
};
