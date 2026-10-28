import React, { useState } from 'react';
import {
  ContactEntry,
  MAX_CONTACTS_PER_SPACE,
  MAX_NAME_BYTES,
  formatKeyCodeGroups,
  formatShortUin,
  formatUinFourLines,
  getByteLength,
  getContactDisplayTitle,
  isValidKeyCode,
  isValidUin,
  normalizeKeyCodeInput,
  normalizeUinInput,
  parseKhongPasteString,
  uin,
} from '../utils/rules';
import { AvatarView, Spinner } from './CommonUI';
import { Icon } from './Icon';

interface ContactsListViewProps {
  headerTitle: 'New Message' | 'Contacts';
  contacts: ContactEntry[];
  onBack: () => void;
  onSelectContact: (contactId: string) => void;
  onOpenNewContact: () => void;
}

export const ContactsListView: React.FC<ContactsListViewProps> = ({
  headerTitle,
  contacts,
  onBack,
  onSelectContact,
  onOpenNewContact,
}) => {
  const regularContacts = contacts.filter((c) => !c.isUnknownSender);
  const isFull = regularContacts.length >= MAX_CONTACTS_PER_SPACE;

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
        <div className="header-title-stack">
          <h1 className="header-title">{headerTitle}</h1>
          <div className="header-subtitle-small">
            {regularContacts.length} of {MAX_CONTACTS_PER_SPACE}
          </div>
        </div>
      </header>

      <div className="subpage-scroll">
        <button
          type="button"
          className={`add-contact-row ${isFull ? 'dimmed-row' : ''}`}
          onClick={() => {
            if (!isFull) onOpenNewContact();
          }}
          disabled={isFull}
        >
          <span className="add-contact-icon">
            <Icon name="person_add" />
          </span>
          <span className="add-contact-label">Add contact</span>
        </button>

        {isFull && (
          <div className="settings-footnote">
            A space can have up to 24 contacts.
          </div>
        )}

        {regularContacts.length === 0 ? (
          <div className="contacts-blank-state">
            No contacts yet. Add one with their UIN and key code.
          </div>
        ) : (
          <div className="contacts-list">
            {regularContacts.map((entry) => {
              const hasName = Boolean(entry.name && entry.name.trim().length > 0);
              const title = getContactDisplayTitle(entry);
              const shortUin = formatShortUin(entry.uinValue);

              return (
                <button
                  key={entry.id}
                  type="button"
                  className="contact-list-row"
                  onClick={() => onSelectContact(entry.id)}
                >
                  <AvatarView uinValue={entry.uinValue} size={48} />
                  <div className="contact-row-main">
                    <div className="contact-row-title">{title}</div>
                    {hasName && (
                      <div className="contact-row-sub">{shortUin}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface NewContactViewProps {
  existingContacts: ContactEntry[];
  isOffline: boolean;
  onBack: () => void;
  onAddContactSuccess: (newEntry: ContactEntry) => void;
  lastCopiedText: string;
}

export const NewContactView: React.FC<NewContactViewProps> = ({
  existingContacts,
  isOffline,
  onBack,
  onAddContactSuccess,
  lastCopiedText,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [uinRaw, setUinRaw] = useState('');
  const [keyCodeRaw, setKeyCodeRaw] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const regularContacts = existingContacts.filter((c) => !c.isUnknownSender);
  const isFull = regularContacts.length >= MAX_CONTACTS_PER_SPACE;

  const normalizedUin = normalizeUinInput(uinRaw);
  const normalizedKey = normalizeKeyCodeInput(keyCodeRaw);
  const formattedKey = formatKeyCodeGroups(normalizedKey);

  const nameBytes = getByteLength(nameInput);
  const nameTooLong = nameBytes > MAX_NAME_BYTES;
  const uinHasError = uinRaw.trim().length > 0 && !isValidUin(normalizedUin);
  const isDuplicate =
    isValidUin(normalizedUin) &&
    regularContacts.some((c) => c.uinValue === normalizedUin);
  const keyHasError =
    keyCodeRaw.trim().length > 0 && !isValidKeyCode(normalizedKey);

  const canSubmit =
    !isAdding &&
    !isFull &&
    !nameTooLong &&
    isValidUin(normalizedUin) &&
    !isDuplicate &&
    isValidKeyCode(normalizedKey);

  const handlePasteClick = async () => {
    setSubmitError('');
    let candidate = lastCopiedText;
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim().toLowerCase().startsWith('khong:')) {
          candidate = clipText;
        }
      }
    } catch {
      // Clipboard read not available in environment; use fallback sample
    }
    const parsed = parseKhongPasteString(candidate || '');
    if (parsed) {
      setUinRaw(parsed.uinValue);
      setKeyCodeRaw(parsed.keyCodeValue);
    } else {
      const sampleUin = uin('f00dbabe', '0009');
      const sampleKey = '1234 5678 9ABC DEF1 2345 6789 ABCD EF12';
      setUinRaw(sampleUin);
      setKeyCodeRaw(sampleKey);
    }
  };

  const handleDone = () => {
    setSubmitError('');
    if (isFull) {
      setSubmitError('A space can have up to 24 contacts.');
      return;
    }
    if (nameTooLong) {
      setSubmitError('This name is too long.');
      return;
    }
    if (!isValidUin(normalizedUin)) {
      setSubmitError('A UIN has 64 characters: digits 0–9 and letters a–f.');
      return;
    }
    if (isDuplicate) {
      setSubmitError('This contact is already in your list.');
      return;
    }
    if (!isValidKeyCode(normalizedKey)) {
      setSubmitError('A key code has 32 letters and digits.');
      return;
    }
    if (isOffline) {
      setSubmitError("You're offline. Connect to add a contact.");
      return;
    }

    setIsAdding(true);
    setTimeout(() => {
      setIsAdding(false);
      if (formattedKey === '0000 0000 0000 0000 0000 0000 0000 0000') {
        setSubmitError(
          "Couldn't add this contact. Check the UIN, the key code, and your connection."
        );
        return;
      }
      const created: ContactEntry = {
        id: `contact-${Date.now()}`,
        uinValue: normalizedUin,
        keyCode: formattedKey,
        name: nameInput.trim(),
        unreadCount: 0,
        messages: [],
      };
      onAddContactSuccess(created);
    }, 1200);
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
        <h1 className="header-title">New Contact</h1>
        <button
          type="button"
          className="icon-btn header-right-btn"
          disabled={!canSubmit}
          onClick={handleDone}
          aria-label="Save contact"
        >
          <Icon name="done" />
        </button>
      </header>

      <div className="subpage-scroll subpage-padded">
        <div className="paste-header-row">
          <button
            type="button"
            className="text-btn"
            onClick={handlePasteClick}
            disabled={isAdding}
          >
            Paste
          </button>
        </div>

        <div className="form-field-block">
          <label className="field-label">Name (optional)</label>
          <input
            type="text"
            className="khong-input"
            placeholder="Name (optional)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            disabled={isAdding}
          />
          {nameTooLong && (
            <div className="field-error-text">This name is too long.</div>
          )}
        </div>

        <div className="form-field-block">
          <label className="field-label">UIN</label>
          <textarea
            rows={4}
            className="khong-textarea mono-textarea"
            placeholder="UIN"
            value={uinRaw}
            onChange={(e) => setUinRaw(e.target.value)}
            disabled={isAdding}
          />
          {uinHasError && (
            <div className="field-error-text">
              A UIN has 64 characters: digits 0–9 and letters a–f.
            </div>
          )}
          {isDuplicate && (
            <div className="field-error-text">
              This contact is already in your list.
            </div>
          )}
        </div>

        <div className="form-field-block">
          <label className="field-label">Key code</label>
          <input
            type="text"
            className="khong-input mono-input"
            placeholder="Key code"
            value={formattedKey}
            onChange={(e) => setKeyCodeRaw(e.target.value)}
            disabled={isAdding}
          />
          {keyHasError && (
            <div className="field-error-text">
              A key code has 32 letters and digits.
            </div>
          )}
        </div>

        {isFull && (
          <div className="field-error-text">
            A space can have up to 24 contacts.
          </div>
        )}

        {submitError && <div className="field-error-text">{submitError}</div>}

        <p className="small-helper-text">
          Ask your contact for both. They can find them in Settings → My ID.
        </p>

        {isAdding && (
          <div className="status-inline-row">
            <Spinner size={18} />
            <span>Adding contact…</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ContactInfoPaneProps {
  contactEntry: ContactEntry;
  onClose: () => void;
  onSaveName: (contactId: string, newName: string) => void;
  onCopyText: (text: string, toastMsg: string) => void;
}

export const ContactInfoPane: React.FC<ContactInfoPaneProps> = ({
  contactEntry,
  onClose,
  onSaveName,
  onCopyText,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(contactEntry.name || '');
  const [nameError, setNameError] = useState('');

  const displayTitle = getContactDisplayTitle(contactEntry);
  const uinLines = contactEntry.uinValue
    ? formatUinFourLines(contactEntry.uinValue)
    : [];

  return (
    <div className="contact-info-pane">
      <header className="khong-header">
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close contact info"
        >
          <Icon name="close" />
        </button>
        <h2 className="header-title">Contact info</h2>
      </header>

      <div className="subpage-scroll">
        <div className="contact-info-hero">
          <AvatarView
            uinValue={contactEntry.uinValue}
            size={120}
            isUnknownSender={contactEntry.isUnknownSender}
          />
          <div className="contact-info-title">{displayTitle}</div>
          <div className="contact-info-subtitle">end-to-end encrypted</div>
        </div>

        <div className="settings-section-card">
          <div className="contact-detail-block">
            <div className="contact-detail-header">
              <span className="section-caption-inline">Name</span>
              {!isEditingName && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setDraftName(contactEntry.name || '');
                    setNameError('');
                    setIsEditingName(true);
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="edit-name-inline">
                <input
                  type="text"
                  className="khong-input"
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setNameError('');
                  }}
                  placeholder="Name (optional)"
                />
                {nameError && (
                  <div className="field-error-text">{nameError}</div>
                )}
                <div className="edit-name-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setIsEditingName(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-btn small-btn"
                    onClick={() => {
                      if (getByteLength(draftName) > MAX_NAME_BYTES) {
                        setNameError('This name is too long.');
                        return;
                      }
                      onSaveName(contactEntry.id, draftName.trim());
                      setIsEditingName(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="contact-detail-value">
                {contactEntry.name || formatShortUin(contactEntry.uinValue)}
              </div>
            )}
          </div>

          {contactEntry.uinValue && (
            <div
              className="contact-detail-block clickable-block"
              onClick={() => onCopyText(contactEntry.uinValue, 'UIN copied')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCopyText(contactEntry.uinValue, 'UIN copied');
                }
              }}
            >
              <div className="contact-detail-header">
                <span className="section-caption-inline">UIN</span>
                <Icon name="content_copy" size={18} />
              </div>
              <div className="mono-four-lines">
                {uinLines.map((line, lIdx) => (
                  <div key={lIdx}>{line}</div>
                ))}
              </div>
            </div>
          )}

          <div
            className="contact-detail-block clickable-block"
            onClick={() => onCopyText(contactEntry.keyCode, 'Key code copied')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCopyText(contactEntry.keyCode, 'Key code copied');
              }
            }}
          >
            <div className="contact-detail-header">
              <span className="section-caption-inline">Key code</span>
              <Icon name="content_copy" size={18} />
            </div>
            <div className="mono-block">{contactEntry.keyCode}</div>
          </div>
        </div>

        <div className="settings-footnote">
          Compare the key code with your contact in person to make sure no one is in the middle.
        </div>
      </div>
    </div>
  );
};
