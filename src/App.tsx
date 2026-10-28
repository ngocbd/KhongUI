import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AttachmentData,
  ContactEntry,
  MessageItem,
  SpaceRecord,
  buildTwentyFourContacts,
  createInitialSpaces,
  formatShortUin,
  getChatLastPreview,
  getContactDisplayTitle,
  isValidUin,
  normalizeUinInput,
  parseTimeToMinutes,
} from './utils/rules';
import { AvatarView, MaskedCodeInput, Spinner } from './components/CommonUI';
import { Icon, KhongLogo, PaperPlaneIllustration } from './components/Icon';
import { LeftSubPage, SettingsPages } from './components/SettingsPages';
import {
  ContactInfoPane,
  ContactsListView,
  NewContactView,
} from './components/ContactsPages';
import { ChatPane } from './components/ChatPane';

type TopScreen =
  | 'boot'
  | 'browser_unsupported'
  | 'welcome'
  | 'choose_code'
  | 'setting_up'
  | 'existing_account'
  | 'lock'
  | 'lock_about'
  | 'lock_about_verify'
  | 'lock_about_threat'
  | 'workspace';

export function App() {
  // Review Toolbar controls
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [isOffline, setIsOffline] = useState(false);
  const [fill24Contacts, setFill24Contacts] = useState(false);

  // Core App State
  const [topScreen, setTopScreen] = useState<TopScreen>('boot');
  const [spaces, setSpaces] = useState<SpaceRecord[]>(() => createInitialSpaces());
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [hasLockedBeforeInSpace, setHasLockedBeforeInSpace] = useState<
    Record<string, boolean>
  >({});
  const [showReopenBar, setShowReopenBar] = useState(false);

  // S-01 Browser not supported state
  const [showSimdWhy, setShowSimdWhy] = useState(false);

  // S-03 & S-04 First run onboarding state
  const [setupCode1, setSetupCode1] = useState('');
  const [setupCode2, setSetupCode2] = useState('');
  const [setupLenError, setSetupLenError] = useState('');
  const [setupMatchError, setSetupMatchError] = useState('');
  const [setupOfflineFailed, setSetupOfflineFailed] = useState(false);

  // S-06 Existing account state
  const [existingUinInput, setExistingUinInput] = useState('');
  const [isLoadingExistingAccount, setIsLoadingExistingAccount] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState('');

  // S-05 Lock screen state
  const [lockCodeInput, setLockCodeInput] = useState('');
  const [isCheckingLock, setIsCheckingLock] = useState(false);
  const [lockError, setLockError] = useState(false);
  const [lockShake, setLockShake] = useState(false);

  // Workspace Navigation State (S-07 .. S-25)
  const [leftSubPage, setLeftSubPage] = useState<LeftSubPage>('chat_list');
  const [contactsHeaderTitle, setContactsHeaderTitle] = useState<
    'New Message' | 'Contacts'
  >('Contacts');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [rowContextMenu, setRowContextMenu] = useState<{
    contactId: string;
    x: number;
    y: number;
  } | null>(null);

  // S-08 Search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isSearchChecking, setIsSearchChecking] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // S-08a Seven-tap wordmark code sheet
  const wordmarkTapCountRef = useRef<number>(0);
  const wordmarkLastTapTimeRef = useRef<number>(0);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [sheetCodeInput, setSheetCodeInput] = useState('');
  const [isCheckingSheetCode, setIsCheckingSheetCode] = useState(false);
  const [sheetCodeError, setSheetCodeError] = useState(false);
  const [sheetShake, setSheetShake] = useState(false);

  // Drafts, Notifications, Toast, Clipboard, Object URLs
  const [draftsByContact, setDraftsByContact] = useState<Record<string, string>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastCopiedText, setLastCopiedText] = useState('');
  const toastTimerRef = useRef<number | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const chatListScrollRef = useRef<HTMLDivElement | null>(null);

  const isMobile = viewportMode === 'mobile';

  // Boot S-00 -> S-05 after 300ms
  useEffect(() => {
    if (topScreen === 'boot') {
      const timer = window.setTimeout(() => {
        setTopScreen('lock');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [topScreen]);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const handleCopyText = useCallback(
    (text: string, toastMsg: string) => {
      setLastCopiedText(text);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      } catch {
        // Fallback already stored in lastCopiedText
      }
      showToast(toastMsg);
    },
    [showToast]
  );

  const registerObjectUrl = useCallback((url: string) => {
    objectUrlsRef.current.push(url);
  }, []);

  // LOCK NOW: instant swap, no animation, clears drafts, search, menus, dialogs, toasts, and unknown senders
  const triggerLockNow = useCallback(() => {
    document.title = 'Khong';
    // Revoke any object URLs created for attachments
    for (const url of objectUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    objectUrlsRef.current = [];

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    if (openSpaceId) {
      setHasLockedBeforeInSpace((prev) => ({ ...prev, [openSpaceId]: true }));
    }

    setOpenSpaceId(null);
    setSelectedContactId(null);
    setContactInfoOpen(false);
    setLeftSubPage('chat_list');
    setHamburgerOpen(false);
    setRowContextMenu(null);
    setSearchFocused(false);
    setSearchText('');
    setIsSearchChecking(false);
    setCodeSheetOpen(false);
    setSheetCodeInput('');
    setSheetCodeError(false);
    setDraftsByContact({});
    setToastMessage(null);
    setLockCodeInput('');
    setLockError(false);
    setIsCheckingLock(false);
    setTopScreen('lock');
  }, [openSpaceId]);

  // 120s inactivity auto-lock when workspace is open
  useEffect(() => {
    if (topScreen !== 'workspace') return;
    let inactivityTimer = window.setTimeout(() => {
      triggerLockNow();
    }, 120000);

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        triggerLockNow();
      }, 120000);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('pointermove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('pointermove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [topScreen, triggerLockNow]);

  // Desktop keyboard shortcuts: Esc closes top layer, Ctrl/Cmd+F focuses search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (topScreen !== 'workspace') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setLeftSubPage('chat_list');
        setSearchFocused(true);
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (codeSheetOpen) {
          setCodeSheetOpen(false);
          return;
        }
        if (hamburgerOpen) {
          setHamburgerOpen(false);
          return;
        }
        if (rowContextMenu) {
          setRowContextMenu(null);
          return;
        }
        if (contactInfoOpen) {
          setContactInfoOpen(false);
          return;
        }
        if (searchFocused || searchText) {
          setSearchFocused(false);
          setSearchText('');
          return;
        }
        if (leftSubPage !== 'chat_list') {
          setLeftSubPage('chat_list');
          return;
        }
        if (selectedContactId) {
          setSelectedContactId(null);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    topScreen,
    codeSheetOpen,
    hamburgerOpen,
    rowContextMenu,
    contactInfoOpen,
    searchFocused,
    searchText,
    leftSubPage,
    selectedContactId,
  ]);

  const openMatchedSpace = useCallback(
    (spaceRecord: SpaceRecord) => {
      setOpenSpaceId(spaceRecord.id);
      setTopScreen('workspace');
      setLeftSubPage('chat_list');
      setSelectedContactId(null);
      setContactInfoOpen(false);
      setSearchFocused(false);
      setSearchText('');
      setCodeSheetOpen(false);
      setHamburgerOpen(false);

      // Show 2px indeterminate bar under chat-list header for 1s when reopening
      if (hasLockedBeforeInSpace[spaceRecord.id]) {
        setShowReopenBar(true);
        window.setTimeout(() => {
          setShowReopenBar(false);
        }, 1000);
      } else {
        setShowReopenBar(true);
        window.setTimeout(() => {
          setShowReopenBar(false);
        }, 1000);
      }
    },
    [hasLockedBeforeInSpace]
  );

  const findMatchingOpenableSpace = (codeCandidate: string): SpaceRecord | null => {
    const trimmed = codeCandidate.trim();
    if (trimmed.length < 6) return null;
    const found = spaces.find(
      (sp) => !sp.isRemoved && !sp.isHushed && sp.codeValue === trimmed
    );
    return found || null;
  };

  // S-05 Lock submit: ALWAYS waits 2000ms
  const handleLockSubmit = () => {
    if (!lockCodeInput || isCheckingLock) return;
    const attemptedCode = lockCodeInput;
    setIsCheckingLock(true);
    setLockError(false);
    setLockShake(false);

    window.setTimeout(() => {
      setIsCheckingLock(false);
      setLockCodeInput('');
      const matched = findMatchingOpenableSpace(attemptedCode);
      if (matched) {
        openMatchedSpace(matched);
      } else {
        setLockError(true);
        setLockShake(true);
        window.setTimeout(() => setLockShake(false), 300);
      }
    }, 2000);
  };

  // S-08a Code sheet submit: ALWAYS waits 2000ms
  const handleCodeSheetSubmit = () => {
    if (!sheetCodeInput || isCheckingSheetCode) return;
    const attemptedCode = sheetCodeInput;
    setIsCheckingSheetCode(true);
    setSheetCodeError(false);
    setSheetShake(false);

    window.setTimeout(() => {
      setIsCheckingSheetCode(false);
      setSheetCodeInput('');
      const matched = findMatchingOpenableSpace(attemptedCode);
      if (matched) {
        openMatchedSpace(matched);
      } else {
        setSheetCodeError(true);
        setSheetShake(true);
        window.setTimeout(() => setSheetShake(false), 300);
      }
    }, 2000);
  };

  // S-08 Search Enter: ALWAYS waits 2000ms
  const handleSearchEnter = () => {
    if (isSearchChecking) return;
    const candidate = searchText;
    setIsSearchChecking(true);
    window.setTimeout(() => {
      setIsSearchChecking(false);
      const matched = findMatchingOpenableSpace(candidate);
      if (matched) {
        openMatchedSpace(matched);
      }
    }, 2000);
  };

  // S-07 Wordmark tap handler (1 tap scrolls to top, 7 taps within 700ms each opens S-08a)
  const handleWordmarkTap = () => {
    if (chatListScrollRef.current) {
      chatListScrollRef.current.scrollTop = 0;
    }
    const now = Date.now();
    if (now - wordmarkLastTapTimeRef.current <= 700) {
      wordmarkTapCountRef.current += 1;
    } else {
      wordmarkTapCountRef.current = 1;
    }
    wordmarkLastTapTimeRef.current = now;

    if (wordmarkTapCountRef.current >= 7) {
      wordmarkTapCountRef.current = 0;
      setSheetCodeInput('');
      setSheetCodeError(false);
      setCodeSheetOpen(true);
    }
  };

  // Review Toolbar: Reset to first run
  const handleResetToFirstRun = () => {
    setSpaces(createInitialSpaces());
    setOpenSpaceId(null);
    setHasLockedBeforeInSpace({});
    setSelectedContactId(null);
    setContactInfoOpen(false);
    setLeftSubPage('chat_list');
    setSetupCode1('');
    setSetupCode2('');
    setSetupLenError('');
    setSetupMatchError('');
    setSetupOfflineFailed(false);
    setFill24Contacts(false);
    setTopScreen('welcome');
  };

  // Review Toolbar: Deliver sample message
  const handleDeliverSampleMessage = () => {
    if (!openSpaceId || topScreen !== 'workspace') return;
    setSpaces((prevSpaces) =>
      prevSpaces.map((sp) => {
        if (sp.id !== openSpaceId || sp.contacts.length === 0) return sp;
        const firstContact = sp.contacts[0];
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const newMsg: MessageItem = {
          id: `sample-in-${Date.now()}`,
          direction: 'in',
          text: 'Sample incoming message delivered at check.',
          time: timeStr,
          dayLabel: 'Today',
          minuteValue: parseTimeToMinutes(timeStr),
        };
        const isCurrentlyViewing = selectedContactId === firstContact.id;
        const updatedFirst: ContactEntry = {
          ...firstContact,
          unreadCount: isCurrentlyViewing
            ? 0
            : firstContact.unreadCount + 1,
          messages: [...firstContact.messages, newMsg],
        };
        return {
          ...sp,
          contacts: [updatedFirst, ...sp.contacts.slice(1)],
        };
      })
    );
  };

  // Review Toolbar: Fill to 24 contacts toggle
  const handleToggleFill24 = (checked: boolean) => {
    setFill24Contacts(checked);
    const targetSpaceId = openSpaceId || 'space-a';
    setSpaces((prevSpaces) =>
      prevSpaces.map((sp) => {
        if (sp.id !== targetSpaceId) return sp;
        if (checked) {
          return {
            ...sp,
            contacts: buildTwentyFourContacts(sp.contacts),
          };
        } else {
          return {
            ...sp,
            contacts: sp.contacts.filter((c) => !c.id.startsWith('sample-extra-')),
          };
        }
      })
    );
  };

  // Active space data
  const currentSpace = spaces.find((sp) => sp.id === openSpaceId) || null;
  const activeContacts = currentSpace ? currentSpace.contacts : [];
  const regularContacts = activeContacts.filter((c) => !c.isUnknownSender);
  const selectedContact =
    activeContacts.find((c) => c.id === selectedContactId) || null;

  // Message actions inside open space
  const handleSendMessage = (
    contactId: string,
    text: string,
    attachment?: AttachmentData
  ) => {
    if (!openSpaceId) return;
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timeStr = '09:32';
    const newMsg: MessageItem = {
      id: msgId,
      direction: 'out',
      text,
      time: timeStr,
      dayLabel: 'Today',
      minuteValue: parseTimeToMinutes(timeStr),
      status: 'sending',
      attachment,
    };

    setSpaces((prev) =>
      prev.map((sp) => {
        if (sp.id !== openSpaceId) return sp;
        return {
          ...sp,
          contacts: sp.contacts.map((c) =>
            c.id === contactId
              ? { ...c, messages: [...c.messages, newMsg] }
              : c
          ),
        };
      })
    );

    if (!isOffline) {
      const delay = attachment ? 2000 : 800;
      window.setTimeout(() => {
        setSpaces((prev) =>
          prev.map((sp) => {
            if (sp.id !== openSpaceId) return sp;
            return {
              ...sp,
              contacts: sp.contacts.map((c) =>
                c.id === contactId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === msgId
                          ? {
                              ...m,
                              status: 'sent',
                              attachment: m.attachment
                                ? { ...m.attachment, isUploading: false }
                                : undefined,
                            }
                          : m
                      ),
                    }
                  : c
              ),
            };
          })
        );
      }, delay);
    }
  };

  const handleRetryMessage = (contactId: string, messageId: string) => {
    if (!openSpaceId) return;
    setSpaces((prev) =>
      prev.map((sp) => {
        if (sp.id !== openSpaceId) return sp;
        return {
          ...sp,
          contacts: sp.contacts.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, status: 'sending' } : m
                  ),
                }
              : c
          ),
        };
      })
    );

    if (!isOffline) {
      window.setTimeout(() => {
        setSpaces((prev) =>
          prev.map((sp) => {
            if (sp.id !== openSpaceId) return sp;
            return {
              ...sp,
              contacts: sp.contacts.map((c) =>
                c.id === contactId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === messageId ? { ...m, status: 'sent' } : m
                      ),
                    }
                  : c
              ),
            };
          })
        );
      }, 800);
    }
  };

  const handleDeleteMessages = (contactId: string, messageIds: string[]) => {
    if (!openSpaceId) return;
    setSpaces((prev) =>
      prev.map((sp) => {
        if (sp.id !== openSpaceId) return sp;
        return {
          ...sp,
          contacts: sp.contacts.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  messages: c.messages.filter((m) => !messageIds.includes(m.id)),
                }
              : c
          ),
        };
      })
    );
  };

  const handleClearChatHistory = (contactId: string) => {
    if (!openSpaceId) return;
    setSpaces((prev) =>
      prev.map((sp) => {
        if (sp.id !== openSpaceId) return sp;
        return {
          ...sp,
          contacts: sp.contacts.map((c) =>
            c.id === contactId ? { ...c, messages: [], unreadCount: 0 } : c
          ),
        };
      })
    );
  };

  const handleClearSpaceHistory = () => {
    if (!openSpaceId) return;
    setSpaces((prev) =>
      prev.map((sp) => {
        if (sp.id !== openSpaceId) return sp;
        return {
          ...sp,
          contacts: sp.contacts.map((c) => ({
            ...c,
            messages: [],
            unreadCount: 0,
          })),
        };
      })
    );
    showToast('History cleared');
  };

  // Search filtering (S-08)
  const normalizedSearchQuery = searchText.trim().toLowerCase();
  const normalizedSearchNoSpaces = normalizedSearchQuery.replace(/\s+/g, '');

  const matchingContacts =
    normalizedSearchQuery.length > 0
      ? regularContacts.filter((c) => {
          const nameMatch = c.name.toLowerCase().includes(normalizedSearchQuery);
          const uinMatch = c.uinValue
            .toLowerCase()
            .includes(normalizedSearchNoSpaces);
          return nameMatch || uinMatch;
        })
      : [];

  const matchingMessages: Array<{ contact: ContactEntry; message: MessageItem }> =
    [];
  if (normalizedSearchQuery.length > 0) {
    for (const c of activeContacts) {
      for (const m of c.messages) {
        if (m.text.toLowerCase().includes(normalizedSearchQuery)) {
          matchingMessages.push({ contact: c, message: m });
        }
      }
    }
  }

  return (
    <div className="prototype-shell">
      {/* 1. REVIEW TOOLBAR (not part of the app) */}
      <div className="review-toolbar" role="region" aria-label="Review controls">
        <div className="review-toolbar-row">
          <span className="review-toolbar-title">
            Review controls (not part of the app)
          </span>

          <div className="review-control-group">
            <button
              type="button"
              className={`review-btn ${
                viewportMode === 'mobile' ? 'active-review-btn' : ''
              }`}
              onClick={() => setViewportMode('mobile')}
            >
              Mobile 390
            </button>
            <button
              type="button"
              className={`review-btn ${
                viewportMode === 'desktop' ? 'active-review-btn' : ''
              }`}
              onClick={() => setViewportMode('desktop')}
            >
              Desktop 1280
            </button>
          </div>

          <div className="review-control-group">
            <button
              type="button"
              className={`review-btn ${
                themeMode === 'light' ? 'active-review-btn' : ''
              }`}
              onClick={() => setThemeMode('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={`review-btn ${
                themeMode === 'dark' ? 'active-review-btn' : ''
              }`}
              onClick={() => setThemeMode('dark')}
            >
              Dark
            </button>
          </div>

          <label className="review-checkbox-label">
            <input
              type="checkbox"
              checked={isOffline}
              onChange={(e) => setIsOffline(e.target.checked)}
            />
            <span>Simulate offline</span>
          </label>

          <button
            type="button"
            className="review-btn"
            onClick={triggerLockNow}
          >
            Simulate leaving the app
          </button>

          <button
            type="button"
            className="review-btn"
            onClick={handleResetToFirstRun}
          >
            Reset to first run
          </button>

          <button
            type="button"
            className="review-btn"
            onClick={handleDeliverSampleMessage}
          >
            Deliver sample message
          </button>

          <label className="review-checkbox-label">
            <input
              type="checkbox"
              checked={fill24Contacts}
              onChange={(e) => handleToggleFill24(e.target.checked)}
            />
            <span>Fill to 24 contacts</span>
          </label>

          <button
            type="button"
            className="review-link-btn"
            onClick={() => {
              setShowSimdWhy(false);
              setTopScreen('browser_unsupported');
            }}
          >
            Show S-01
          </button>
        </div>

        <div className="review-toolbar-note">
          Sample codes: Space A code <code>blue river morning</code>, Space B code{' '}
          <code>green hill evening</code> (codes need at least 6 characters). Any other code fails.
        </div>
      </div>

      {/* APP FRAME */}
      <div className="frame-stage">
        <div
          className={`app-frame ${
            viewportMode === 'mobile' ? 'frame-mobile' : 'frame-desktop'
          }`}
          data-theme={themeMode}
        >
          {/* S-00 BOOT */}
          {topScreen === 'boot' && (
            <div className="full-surface-screen center-screen">
              <KhongLogo size={120} />
            </div>
          )}

          {/* S-01 BROWSER NOT SUPPORTED */}
          {topScreen === 'browser_unsupported' && (
            <div className="full-surface-screen center-screen">
              <div className="centered-card-content">
                <KhongLogo size={80} />
                <h1 className="page-heading">This browser isn't supported</h1>
                <p className="body-text">
                  Khong needs a recent version of Chrome, Edge, Firefox, or Safari. Update your browser or try another one.
                </p>
                {!showSimdWhy ? (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setShowSimdWhy(true)}
                  >
                    Why?
                  </button>
                ) : (
                  <p className="body-secondary-text">
                    Khong protects your code with a calculation that needs a modern browser feature (WebAssembly SIMD).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* S-02 WELCOME */}
          {topScreen === 'welcome' && (
            <div
              className={`onboarding-outer ${
                !isMobile ? 'desktop-wallpaper-bg' : 'full-surface-screen'
              }`}
            >
              <div className="onboarding-card">
                <div className="welcome-content">
                  <KhongLogo size={96} />
                  <h1 className="welcome-title">Khong</h1>
                  <p className="welcome-tagline">
                    A private messenger. No phone number. No email.
                  </p>

                  <div className="warning-card">
                    <div className="warning-card-header">
                      <Icon name="warning" size={20} />
                      <span>
                        Pre-alpha. Khong has not been audited. Don't rely on it for your safety yet.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-btn full-width-btn"
                    onClick={() => {
                      setSetupCode1('');
                      setSetupCode2('');
                      setSetupLenError('');
                      setSetupMatchError('');
                      setTopScreen('choose_code');
                    }}
                  >
                    Start Messaging
                  </button>

                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setExistingUinInput('');
                      setExistingAccountError('');
                      setIsLoadingExistingAccount(false);
                      setTopScreen('existing_account');
                    }}
                  >
                    Use an existing account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* S-03 CHOOSE A CODE */}
          {topScreen === 'choose_code' && (
            <div
              className={`onboarding-outer ${
                !isMobile ? 'desktop-wallpaper-bg' : 'full-surface-screen'
              }`}
            >
              <div className="onboarding-card with-header">
                <header className="khong-header">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setTopScreen('welcome')}
                    aria-label="Back"
                  >
                    <Icon name="arrow_back" />
                  </button>
                  <h1 className="header-title">Your code</h1>
                </header>
                <div className="subpage-scroll subpage-padded">
                  <h2 className="page-heading">Choose a code</h2>
                  <p className="body-text">
                    You'll type this code to open Khong. Use a phrase you can remember, a few words long.
                  </p>

                  <div className="form-field-block">
                    <MaskedCodeInput
                      value={setupCode1}
                      onChange={(val) => {
                        setSetupCode1(val);
                        setSetupLenError('');
                      }}
                      placeholder="Code"
                    />
                    {setupLenError && (
                      <div className="field-error-text">{setupLenError}</div>
                    )}
                  </div>

                  <div className="form-field-block">
                    <MaskedCodeInput
                      value={setupCode2}
                      onChange={(val) => {
                        setSetupCode2(val);
                        setSetupMatchError('');
                      }}
                      placeholder="Repeat code"
                    />
                    {setupMatchError && (
                      <div className="field-error-text">{setupMatchError}</div>
                    )}
                  </div>

                  <p className="small-helper-text">
                    There's no way to recover a forgotten code. If you forget it, everything in this space is lost.
                  </p>
                  <p className="small-helper-text">
                    Some keyboards remember what you type. Turn on your keyboard's incognito mode before typing a code.
                  </p>

                  <button
                    type="button"
                    className="primary-btn full-width-btn"
                    disabled={!setupCode1 || !setupCode2}
                    onClick={() => {
                      setSetupLenError('');
                      setSetupMatchError('');
                      if (setupCode1.length < 6) {
                        setSetupLenError('Use at least 6 characters.');
                        return;
                      }
                      if (setupCode1 !== setupCode2) {
                        setSetupMatchError("The codes don't match.");
                        return;
                      }
                      if (isOffline) {
                        setSetupOfflineFailed(true);
                        setTopScreen('setting_up');
                        return;
                      }
                      setSetupOfflineFailed(false);
                      setTopScreen('setting_up');
                      window.setTimeout(() => {
                        setSpaces((prev) =>
                          prev.map((sp) =>
                            sp.id === 'space-a'
                              ? { ...sp, codeValue: setupCode1.trim() }
                              : sp
                          )
                        );
                        setOpenSpaceId('space-a');
                        setTopScreen('workspace');
                      }, 4000);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* S-04 SETTING UP */}
          {topScreen === 'setting_up' && (
            <div className="full-surface-screen center-screen">
              {setupOfflineFailed ? (
                <div className="centered-card-content">
                  <Icon name="cloud_off" size={48} className="danger-icon" />
                  <h1 className="page-heading">Couldn't set up your account</h1>
                  <p className="body-text">
                    Check your connection and try again.
                  </p>
                  <button
                    type="button"
                    className="primary-btn full-width-btn"
                    onClick={() => setTopScreen('choose_code')}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="centered-card-content">
                  <Spinner size={40} />
                  <h1 className="page-heading">Setting up your account…</h1>
                  <p className="body-secondary-text">
                    This can take up to a minute on some phones. Keep Khong open.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* S-06 EXISTING ACCOUNT */}
          {topScreen === 'existing_account' && (
            <div
              className={`onboarding-outer ${
                !isMobile ? 'desktop-wallpaper-bg' : 'full-surface-screen'
              }`}
            >
              <div className="onboarding-card with-header">
                <header className="khong-header">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setTopScreen('welcome')}
                    aria-label="Back"
                  >
                    <Icon name="arrow_back" />
                  </button>
                  <h1 className="header-title">Existing account</h1>
                </header>
                <div className="subpage-scroll subpage-padded">
                  <p className="body-text">
                    Enter your account's UIN. You'll find it in Settings → My ID on your other device.
                  </p>
                  <div className="form-field-block">
                    <textarea
                      rows={3}
                      className="khong-textarea mono-textarea"
                      placeholder="UIN (64 characters)"
                      value={existingUinInput}
                      onChange={(e) => {
                        setExistingUinInput(e.target.value);
                        setExistingAccountError('');
                      }}
                      disabled={isLoadingExistingAccount}
                    />
                  </div>
                  {existingAccountError && (
                    <div className="field-error-text">
                      {existingAccountError}
                    </div>
                  )}
                  {isLoadingExistingAccount ? (
                    <div className="status-inline-row">
                      <Spinner size={18} />
                      <span>Loading account…</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="primary-btn full-width-btn"
                      disabled={
                        !isValidUin(normalizeUinInput(existingUinInput))
                      }
                      onClick={() => {
                        if (isOffline) {
                          setExistingAccountError(
                            "Couldn't load this account. Check the UIN and your connection."
                          );
                          return;
                        }
                        setIsLoadingExistingAccount(true);
                        window.setTimeout(() => {
                          setIsLoadingExistingAccount(false);
                          setTopScreen('lock');
                        }, 1500);
                      }}
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* S-05 LOCK SCREEN (same at every width, surface background, no wallpaper) */}
          {topScreen === 'lock' && (
            <div className="lock-screen">
              <div className="lock-main-box">
                <KhongLogo size={96} />
                <h1 className="lock-title">Khong</h1>

                <div
                  className={`lock-form-row ${
                    lockShake ? 'shake-horizontal' : ''
                  }`}
                >
                  <div className="lock-input-holder">
                    <MaskedCodeInput
                      value={lockCodeInput}
                      onChange={(v) => {
                        setLockCodeInput(v);
                        if (lockError) setLockError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLockSubmit();
                        }
                      }}
                      placeholder="Enter your code"
                      disabled={isCheckingLock}
                    />
                  </div>
                  <button
                    type="button"
                    className="lock-submit-circle"
                    disabled={!lockCodeInput || isCheckingLock}
                    onClick={handleLockSubmit}
                    aria-label="Open"
                  >
                    <Icon name="arrow_forward" />
                  </button>
                </div>

                <div className="lock-helper-area">
                  {isCheckingLock ? (
                    <span className="lock-checking-inline">
                      <Spinner size={16} />
                      <span>Checking…</span>
                    </span>
                  ) : lockError ? (
                    <span className="danger-text">Wrong code</span>
                  ) : null}
                </div>
              </div>

              <div className="lock-footer">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setTopScreen('lock_about')}
                >
                  About Khong
                </button>
              </div>
            </div>
          )}

          {/* S-25 ABOUT KHONG FROM LOCK SCREEN (without space data) */}
          {(topScreen === 'lock_about' ||
            topScreen === 'lock_about_verify' ||
            topScreen === 'lock_about_threat') && (
            <div className="full-surface-screen">
              <div className="centered-subpage-wrapper">
                <SettingsPages
                  subPage={
                    topScreen === 'lock_about_verify'
                      ? 'about_verify'
                      : topScreen === 'lock_about_threat'
                      ? 'about_threat'
                      : 'about'
                  }
                  onNavigate={(p) => {
                    if (p === 'about_verify') setTopScreen('lock_about_verify');
                    else if (p === 'about_threat')
                      setTopScreen('lock_about_threat');
                    else setTopScreen('lock_about');
                  }}
                  onBack={() => setTopScreen('lock')}
                  regularContactCount={0}
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotifications={setNotificationsEnabled}
                  onLockNow={triggerLockNow}
                  onClearSpaceHistory={() => {}}
                  onHushCurrentSpace={() => {}}
                  onRemoveCurrentSpace={() => {}}
                  onCreateNewSpace={() => {}}
                  allSpaces={spaces}
                  isOffline={isOffline}
                  onShowToast={showToast}
                  onCopyText={handleCopyText}
                />
              </div>
            </div>
          )}

          {/* WORKSPACE (S-07 through S-25) */}
          {topScreen === 'workspace' && currentSpace && (
            <div className="workspace-layout">
              {/* LEFT COLUMN (420px on Desktop, full width on Mobile when no chat/info open) */}
              {(!isMobile || (!selectedContact && !contactInfoOpen)) && (
                <div className="left-column">
                  {leftSubPage === 'chat_list' && (
                    <div className="chat-list-container">
                      {/* S-07 / S-08 Header */}
                      <header className="khong-header chat-list-header">
                        {isMobile && (searchFocused || searchText.length > 0) ? (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              setSearchFocused(false);
                              setSearchText('');
                            }}
                            aria-label="Close search"
                          >
                            <Icon name="arrow_back" />
                          </button>
                        ) : (
                          <div className="header-menu-anchor">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setHamburgerOpen((v) => !v)}
                              aria-label="Main menu"
                            >
                              <Icon name="menu" />
                            </button>
                            {hamburgerOpen && (
                              <>
                                <div
                                  className="menu-click-catcher"
                                  onClick={() => setHamburgerOpen(false)}
                                />
                                <div className="khong-menu left-menu" role="menu">
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                      setHamburgerOpen(false);
                                      setContactsHeaderTitle('Contacts');
                                      setLeftSubPage('contacts');
                                    }}
                                  >
                                    <Icon name="person" size={20} />
                                    <span>Contacts</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                      setHamburgerOpen(false);
                                      setLeftSubPage('settings');
                                    }}
                                  >
                                    <Icon name="settings" size={20} />
                                    <span>Settings</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                      setHamburgerOpen(false);
                                      triggerLockNow();
                                    }}
                                  >
                                    <Icon name="lock" size={20} />
                                    <span>Lock now</span>
                                  </button>
                                  <div className="menu-divider" />
                                  <div className="menu-footer-small">
                                    Khong 0.0.0 · pre-alpha
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div
                          className={`search-pill-box ${
                            searchFocused || searchText.length > 0
                              ? 'search-expanded'
                              : ''
                          }`}
                        >
                          <Icon
                            name="search"
                            size={18}
                            className="search-box-icon"
                          />
                          <input
                            ref={searchInputRef}
                            type="text"
                            className="search-pill-input"
                            placeholder="Search"
                            aria-label="Search"
                            value={searchText}
                            readOnly={isSearchChecking}
                            onFocus={() => setSearchFocused(true)}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchEnter();
                              }
                            }}
                          />
                          {isSearchChecking ? (
                            <Spinner size={16} />
                          ) : searchText.length > 0 ? (
                            <button
                              type="button"
                              className="icon-btn search-clear-btn"
                              onClick={() => setSearchText('')}
                              aria-label="Clear search"
                            >
                              <Icon name="close" size={18} />
                            </button>
                          ) : null}
                        </div>

                        {!(isMobile && (searchFocused || searchText.length > 0)) && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={triggerLockNow}
                              aria-label="Lock now"
                            >
                              <Icon name="lock" />
                            </button>
                            <button
                              type="button"
                              className="wordmark-hit-btn"
                              onClick={handleWordmarkTap}
                            >
                              Khong
                            </button>
                          </>
                        )}
                      </header>

                      {/* 2px indeterminate bar under chat-list header for 1s on reopen */}
                      {showReopenBar && (
                        <div className="reopen-indeterminate-bar" />
                      )}

                      {/* Offline banner */}
                      {isOffline && (
                        <div className="offline-banner">
                          <Icon name="cloud_off" size={18} />
                          <span>Waiting for network…</span>
                        </div>
                      )}

                      {/* S-08 Search Results View vs S-07 Chat List */}
                      {searchFocused && searchText.trim().length > 0 ? (
                        <div className="chat-list-scroll">
                          {matchingContacts.length === 0 &&
                          matchingMessages.length === 0 ? (
                            <div className="search-no-results">No results</div>
                          ) : (
                            <>
                              {matchingContacts.length > 0 && (
                                <div className="search-section">
                                  <div className="search-section-header">
                                    Contacts
                                  </div>
                                  {matchingContacts.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      className="chat-row"
                                      onClick={() => {
                                        setSelectedContactId(entry.id);
                                        setSearchFocused(false);
                                        setSearchText('');
                                      }}
                                    >
                                      <AvatarView
                                        uinValue={entry.uinValue}
                                        size={54}
                                      />
                                      <div className="chat-row-body">
                                        <div className="chat-row-top">
                                          <span className="chat-row-title">
                                            {getContactDisplayTitle(entry)}
                                          </span>
                                        </div>
                                        <div className="chat-row-bottom">
                                          <span className="chat-row-preview">
                                            {formatShortUin(entry.uinValue)}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {matchingMessages.length > 0 && (
                                <div className="search-section">
                                  <div className="search-section-header">
                                    Messages
                                  </div>
                                  {matchingMessages.map(({ contact, message }) => (
                                    <button
                                      key={message.id}
                                      type="button"
                                      className="chat-row"
                                      onClick={() => {
                                        setSelectedContactId(contact.id);
                                        setSearchFocused(false);
                                        setSearchText('');
                                      }}
                                    >
                                      <AvatarView
                                        uinValue={contact.uinValue}
                                        size={54}
                                        isUnknownSender={contact.isUnknownSender}
                                      />
                                      <div className="chat-row-body">
                                        <div className="chat-row-top">
                                          <span className="chat-row-title">
                                            {getContactDisplayTitle(contact)}
                                          </span>
                                          <span className="chat-row-time">
                                            {message.time}
                                          </span>
                                        </div>
                                        <div className="chat-row-bottom">
                                          <span className="chat-row-preview">
                                            {message.text}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : activeContacts.length === 0 ? (
                        /* Empty state when space has no contacts */
                        <div className="empty-chatlist-state">
                          <PaperPlaneIllustration />
                          <h2 className="page-heading">No chats yet</h2>
                          <p className="body-secondary-text">
                            Add a contact with their UIN and key code to start a conversation.
                          </p>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => setLeftSubPage('new_contact')}
                          >
                            Add contact
                          </button>
                          <div className="settings-footnote">
                            Khong checks for new messages every 15 minutes.
                          </div>
                        </div>
                      ) : (
                        <div
                          className="chat-list-scroll"
                          ref={chatListScrollRef}
                        >
                          {activeContacts.map((entry) => {
                            const isSelected =
                              !isMobile && selectedContactId === entry.id;
                            const title = getContactDisplayTitle(entry);
                            const { previewText, timeText, outgoingStatus } =
                              getChatLastPreview(entry);

                            return (
                              <button
                                key={entry.id}
                                type="button"
                                className={`chat-row ${
                                  isSelected ? 'active-chat-row' : ''
                                }`}
                                onClick={() => {
                                  setSelectedContactId(entry.id);
                                  // Clear unread badge when opening chat
                                  setSpaces((prev) =>
                                    prev.map((sp) => {
                                      if (sp.id !== openSpaceId) return sp;
                                      return {
                                        ...sp,
                                        contacts: sp.contacts.map((c) =>
                                          c.id === entry.id
                                            ? { ...c, unreadCount: 0 }
                                            : c
                                        ),
                                      };
                                    })
                                  );
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (!entry.isUnknownSender) {
                                    setRowContextMenu({
                                      contactId: entry.id,
                                      x: e.clientX,
                                      y: e.clientY,
                                    });
                                  }
                                }}
                              >
                                <AvatarView
                                  uinValue={entry.uinValue}
                                  size={54}
                                  isUnknownSender={entry.isUnknownSender}
                                />
                                <div className="chat-row-body">
                                  <div className="chat-row-top">
                                    <span className="chat-row-title">
                                      {title}
                                    </span>
                                    <span className="chat-row-meta">
                                      {outgoingStatus === 'sending' && (
                                        <Icon
                                          name="schedule"
                                          size={15}
                                          className="row-status-icon"
                                        />
                                      )}
                                      {outgoingStatus === 'sent' && (
                                        <Icon
                                          name="done"
                                          size={15}
                                          className="row-status-icon"
                                        />
                                      )}
                                      {outgoingStatus === 'not_sent' && (
                                        <Icon
                                          name="error"
                                          size={15}
                                          className="row-status-icon danger-icon"
                                        />
                                      )}
                                      <span className="chat-row-time">
                                        {timeText}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="chat-row-bottom">
                                    <span className="chat-row-preview">
                                      {previewText}
                                    </span>
                                    {entry.unreadCount > 0 && (
                                      <span className="unread-badge">
                                        {entry.unreadCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* FAB Edit -> S-13 New Message */}
                      <button
                        type="button"
                        className="fab-compose"
                        onClick={() => {
                          setContactsHeaderTitle('New Message');
                          setLeftSubPage('contacts');
                        }}
                        aria-label="New Message"
                      >
                        <Icon name="edit" />
                      </button>
                    </div>
                  )}

                  {leftSubPage === 'contacts' && (
                    <ContactsListView
                      headerTitle={contactsHeaderTitle}
                      contacts={activeContacts}
                      onBack={() => setLeftSubPage('chat_list')}
                      onSelectContact={(contactId) => {
                        setSelectedContactId(contactId);
                        setLeftSubPage('chat_list');
                      }}
                      onOpenNewContact={() => setLeftSubPage('new_contact')}
                    />
                  )}

                  {leftSubPage === 'new_contact' && (
                    <NewContactView
                      existingContacts={activeContacts}
                      isOffline={isOffline}
                      onBack={() => setLeftSubPage('contacts')}
                      lastCopiedText={lastCopiedText}
                      onAddContactSuccess={(newEntry) => {
                        setSpaces((prev) =>
                          prev.map((sp) =>
                            sp.id === openSpaceId
                              ? { ...sp, contacts: [newEntry, ...sp.contacts] }
                              : sp
                          )
                        );
                        showToast('Contact added');
                        setSelectedContactId(newEntry.id);
                        setLeftSubPage('chat_list');
                      }}
                    />
                  )}

                  {leftSubPage !== 'chat_list' &&
                    leftSubPage !== 'contacts' &&
                    leftSubPage !== 'new_contact' && (
                      <SettingsPages
                        subPage={leftSubPage}
                        onNavigate={setLeftSubPage}
                        onBack={() => {
                          if (leftSubPage === 'settings') {
                            setLeftSubPage('chat_list');
                          } else if (leftSubPage === 'hush') {
                            setLeftSubPage('privacy');
                          } else {
                            setLeftSubPage('settings');
                          }
                        }}
                        regularContactCount={regularContacts.length}
                        notificationsEnabled={notificationsEnabled}
                        onToggleNotifications={setNotificationsEnabled}
                        onLockNow={triggerLockNow}
                        onClearSpaceHistory={handleClearSpaceHistory}
                        onHushCurrentSpace={() => {
                          setSpaces((prev) =>
                            prev.map((sp) =>
                              sp.id === openSpaceId
                                ? { ...sp, isHushed: true }
                                : sp
                            )
                          );
                          triggerLockNow();
                        }}
                        onRemoveCurrentSpace={() => {
                          setSpaces((prev) =>
                            prev.map((sp) =>
                              sp.id === openSpaceId
                                ? { ...sp, isRemoved: true }
                                : sp
                            )
                          );
                          triggerLockNow();
                        }}
                        onCreateNewSpace={(newCode) => {
                          const newSpace: SpaceRecord = {
                            id: `space-${Date.now()}`,
                            codeValue: newCode.trim(),
                            isHushed: false,
                            isRemoved: false,
                            contacts: [],
                          };
                          setSpaces((prev) => [...prev, newSpace]);
                        }}
                        allSpaces={spaces}
                        isOffline={isOffline}
                        onShowToast={showToast}
                        onCopyText={handleCopyText}
                      />
                    )}
                </div>
              )}

              {/* RIGHT PANE (Desktop always visible; Mobile visible when a chat is selected and contact info is not covering it) */}
              {(!isMobile || (selectedContact && !contactInfoOpen)) && (
                <div className="right-pane">
                  {selectedContact ? (
                    <ChatPane
                      contact={selectedContact}
                      isMobile={isMobile}
                      isOffline={isOffline}
                      draftText={draftsByContact[selectedContact.id] || ''}
                      onDraftChange={(val) =>
                        setDraftsByContact((prev) => ({
                          ...prev,
                          [selectedContact.id]: val,
                        }))
                      }
                      onBackMobile={() => setSelectedContactId(null)}
                      onOpenContactInfo={() => setContactInfoOpen(true)}
                      onClearChatHistory={handleClearChatHistory}
                      onSendMessage={handleSendMessage}
                      onRetryMessage={handleRetryMessage}
                      onDeleteMessages={handleDeleteMessages}
                      onCancelAttachmentUpload={(cId, mId) =>
                        handleDeleteMessages(cId, [mId])
                      }
                      onConvertUnknownToContact={(cId, uinVal, newName) => {
                        setSpaces((prev) =>
                          prev.map((sp) => {
                            if (sp.id !== openSpaceId) return sp;
                            return {
                              ...sp,
                              contacts: sp.contacts.map((c) =>
                                c.id === cId
                                  ? {
                                      ...c,
                                      uinValue: uinVal,
                                      name: newName,
                                      isUnknownSender: false,
                                    }
                                  : c
                              ),
                            };
                          })
                        );
                        showToast('Contact added');
                      }}
                      onCopyText={handleCopyText}
                      onRegisterObjectUrl={registerObjectUrl}
                    />
                  ) : (
                    <div className="empty-right-wallpaper">
                      <div className="service-pill">
                        Select a chat to start messaging
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* THIRD COLUMN / CONTACT INFO (S-16) */}
              {contactInfoOpen && selectedContact && (
                <ContactInfoPane
                  contactEntry={selectedContact}
                  onClose={() => setContactInfoOpen(false)}
                  onSaveName={(cId, newName) => {
                    setSpaces((prev) =>
                      prev.map((sp) => {
                        if (sp.id !== openSpaceId) return sp;
                        return {
                          ...sp,
                          contacts: sp.contacts.map((c) =>
                            c.id === cId ? { ...c, name: newName } : c
                          ),
                        };
                      })
                    );
                    showToast('Name saved');
                  }}
                  onCopyText={handleCopyText}
                />
              )}

              {/* Long-press / right-click row context menu -> View contact */}
              {rowContextMenu && (
                <div
                  className="dialog-backdrop transparent-backdrop"
                  onClick={() => setRowContextMenu(null)}
                >
                  <div
                    className="khong-menu floating-menu"
                    style={{
                      top: `${Math.min(rowContextMenu.y, 600)}px`,
                      left: `${Math.min(rowContextMenu.x, 260)}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                  >
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        setSelectedContactId(rowContextMenu.contactId);
                        setContactInfoOpen(true);
                        setRowContextMenu(null);
                      }}
                    >
                      <Icon name="person" size={20} />
                      <span>View contact</span>
                    </button>
                  </div>
                </div>
              )}

              {/* S-08a WORDMARK CODE SHEET */}
              {codeSheetOpen && (
                <div
                  className="dialog-backdrop"
                  onClick={() => {
                    if (!isCheckingSheetCode) setCodeSheetOpen(false);
                  }}
                >
                  <div
                    className={`code-sheet-modal ${
                      isMobile ? 'mobile-bottom-sheet' : 'desktop-code-dialog'
                    } ${sheetShake ? 'shake-horizontal' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                  >
                    <div className="code-sheet-header">
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={isCheckingSheetCode}
                        onClick={() => setCodeSheetOpen(false)}
                        aria-label="Close"
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                    <div className="code-sheet-body">
                      <KhongLogo size={48} />
                      <div className="lock-form-row">
                        <div className="lock-input-holder">
                          <MaskedCodeInput
                            value={sheetCodeInput}
                            onChange={(v) => {
                              setSheetCodeInput(v);
                              if (sheetCodeError) setSheetCodeError(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCodeSheetSubmit();
                              }
                            }}
                            placeholder="Enter your code"
                            disabled={isCheckingSheetCode}
                          />
                        </div>
                        <button
                          type="button"
                          className="lock-submit-circle"
                          disabled={!sheetCodeInput || isCheckingSheetCode}
                          onClick={handleCodeSheetSubmit}
                          aria-label="Submit code"
                        >
                          <Icon name="arrow_forward" />
                        </button>
                      </div>
                      <div className="lock-helper-area">
                        {isCheckingSheetCode ? (
                          <span className="lock-checking-inline">
                            <Spinner size={16} />
                            <span>Checking…</span>
                          </span>
                        ) : sheetCodeError ? (
                          <span className="danger-text">Wrong code</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOAST */}
          {toastMessage && (
            <div className="khong-toast" role="status">
              {toastMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
