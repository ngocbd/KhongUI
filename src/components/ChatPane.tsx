import React, { useEffect, useRef, useState } from 'react';
import {
  AttachmentData,
  ContactEntry,
  MAX_FILENAME_BYTES,
  MAX_FILE_BYTES,
  MAX_MESSAGE_BYTES,
  MAX_NAME_BYTES,
  MessageItem,
  REMAINING_BYTES_WARN_THRESHOLD,
  SAMPLE_PHOTO_DATA_URL,
  computeBubbleGrouping,
  formatShortUin,
  getByteLength,
  getContactDisplayTitle,
  isValidUin,
  normalizeUinInput,
} from '../utils/rules';
import { AvatarView, Spinner } from './CommonUI';
import { Icon } from './Icon';

const SYSTEM_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '❤️', '🔥',
];

interface ChatPaneProps {
  contact: ContactEntry;
  isMobile: boolean;
  isOffline: boolean;
  draftText: string;
  onDraftChange: (val: string) => void;
  onBackMobile: () => void;
  onOpenContactInfo: () => void;
  onClearChatHistory: (contactId: string) => void;
  onSendMessage: (contactId: string, text: string, attachment?: AttachmentData) => void;
  onRetryMessage: (contactId: string, messageId: string) => void;
  onDeleteMessages: (contactId: string, messageIds: string[]) => void;
  onCancelAttachmentUpload: (contactId: string, messageId: string) => void;
  onConvertUnknownToContact: (contactId: string, uinValue: string, name: string) => void;
  onCopyText: (text: string, toastMsg: string) => void;
  onRegisterObjectUrl: (url: string) => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  contact,
  isMobile,
  isOffline,
  draftText,
  onDraftChange,
  onBackMobile,
  onOpenContactInfo,
  onClearChatHistory,
  onSendMessage,
  onRetryMessage,
  onDeleteMessages,
  onCancelAttachmentUpload,
  onConvertUnknownToContact,
  onCopyText,
  onRegisterObjectUrl,
}) => {
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [confirmClearChatOpen, setConfirmClearChatOpen] = useState(false);

  // S-10 Message menu & Selection mode
  const [activeBubbleMenu, setActiveBubbleMenu] = useState<{
    message: MessageItem;
    x: number;
    y: number;
  } | null>(null);
  const [notSentMenuMessage, setNotSentMenuMessage] = useState<MessageItem | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Link dialog
  const [pendingLinkUrl, setPendingLinkUrl] = useState<string | null>(null);

  // Emoji & Attach
  const [emojiGridOpen, setEmojiGridOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // S-11 Preview dialog/sheet
  const [pendingAttachment, setPendingAttachment] = useState<{
    kind: 'photo' | 'file';
    fileName: string;
    fileSizeLabel: string;
    previewUrl?: string;
  } | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [fileAlertDialog, setFileAlertDialog] = useState<{
    title: string;
    body: string;
  } | null>(null);

  // S-12 Fullscreen photo viewer
  const [viewerPhotoMessage, setViewerPhotoMessage] = useState<MessageItem | null>(
    null
  );

  // S-15 Add this sender
  const [addSenderModalOpen, setAddSenderModalOpen] = useState(false);
  const [senderNameInput, setSenderNameInput] = useState('');
  const [senderUinInput, setSenderUinInput] = useState('');
  const [senderError, setSenderError] = useState('');

  // Scroll & Jump to latest
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const [showJumpDown, setShowJumpDown] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedIds([]);
    setActiveBubbleMenu(null);
    setNotSentMenuMessage(null);
    setEmojiGridOpen(false);
    setAttachMenuOpen(false);
  }, [contact.id]);

  const scrollToBottom = () => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
      setShowJumpDown(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [contact.id, contact.messages.length]);

  const handleScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpDown(distanceFromBottom > 120);
  };

  const title = getContactDisplayTitle(contact);
  const subtitle = isOffline ? 'Waiting for network…' : 'end-to-end encrypted';
  const groupMetas = computeBubbleGrouping(contact.messages);

  const currentBytes = getByteLength(draftText);
  const remainingBytes = MAX_MESSAGE_BYTES - currentBytes;
  const showBytesCounter = remainingBytes < REMAINING_BYTES_WARN_THRESHOLD;

  const handleDraftInput = (nextVal: string) => {
    if (getByteLength(nextVal) <= MAX_MESSAGE_BYTES) {
      onDraftChange(nextVal);
    }
  };

  const handleSendText = () => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    onSendMessage(contact.id, trimmed);
    onDraftChange('');
    setEmojiGridOpen(false);
  };

  const handleFilePicked = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'file'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (getByteLength(file.name) > MAX_FILENAME_BYTES) {
      setFileAlertDialog({
        title: 'File name too long',
        body: 'This file name is too long. Rename the file and try again.',
      });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileAlertDialog({
        title: 'File too large',
        body: 'Khong can send files up to 16 MB.',
      });
      return;
    }

    const kb = Math.max(1, Math.round(file.size / 1024));
    const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    let previewUrl: string | undefined;
    if (kind === 'photo') {
      previewUrl = URL.createObjectURL(file);
      onRegisterObjectUrl(previewUrl);
    }

    setAttachmentCaption('');
    setPendingAttachment({
      kind,
      fileName: file.name,
      fileSizeLabel: sizeLabel,
      previewUrl: previewUrl || (kind === 'photo' ? SAMPLE_PHOTO_DATA_URL : undefined),
    });
  };

  const renderMessageTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        return (
          <span
            key={idx}
            className="message-link"
            onClick={(e) => {
              e.stopPropagation();
              setPendingLinkUrl(part);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                setPendingLinkUrl(part);
              }
            }}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const toggleSelectMessage = (msgId: string) => {
    setSelectedIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const normalizedSenderUin = normalizeUinInput(senderUinInput);
  const senderUinValid = isValidUin(normalizedSenderUin);

  return (
    <div className="chat-pane">
      {/* Chat Header or Selection Header */}
      {selectedIds.length > 0 ? (
        <header className="khong-header selection-header">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSelectedIds([])}
            aria-label="Cancel selection"
          >
            <Icon name="close" />
          </button>
          <div className="header-title">{selectedIds.length} selected</div>
          <div className="selection-header-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Copy selected messages"
              onClick={() => {
                const selectedTexts = contact.messages
                  .filter((m) => selectedIds.includes(m.id))
                  .map((m) => m.text)
                  .join('\n');
                onCopyText(selectedTexts, 'Copied to clipboard');
                setSelectedIds([]);
              }}
            >
              <Icon name="content_copy" />
            </button>
            <button
              type="button"
              className="icon-btn danger-icon"
              aria-label="Delete selected messages"
              onClick={() => setConfirmDeleteIds(selectedIds)}
            >
              <Icon name="delete" />
            </button>
          </div>
        </header>
      ) : (
        <header className="khong-header chat-header">
          {isMobile && (
            <button
              type="button"
              className="icon-btn"
              onClick={onBackMobile}
              aria-label="Back to chats"
            >
              <Icon name="arrow_back" />
            </button>
          )}
          <div
            className="chat-header-peer"
            onClick={() => {
              if (!contact.isUnknownSender) onOpenContactInfo();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !contact.isUnknownSender) {
                onOpenContactInfo();
              }
            }}
          >
            <AvatarView
              uinValue={contact.uinValue}
              size={40}
              isUnknownSender={contact.isUnknownSender}
            />
            <div className="chat-header-titles">
              <div className="chat-header-title">{title}</div>
              <div className="chat-header-subtitle">{subtitle}</div>
            </div>
          </div>
          <div className="header-menu-anchor">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              aria-label="More options"
            >
              <Icon name="more_vert" />
            </button>
            {headerMenuOpen && (
              <>
                <div
                  className="menu-click-catcher"
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div className="khong-menu right-menu" role="menu">
                  {!contact.isUnknownSender && (
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        onOpenContactInfo();
                      }}
                    >
                      <Icon name="person" size={20} />
                      <span>View contact</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="menu-item danger-text"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setConfirmClearChatOpen(true);
                    }}
                  >
                    <Icon name="delete" size={20} />
                    <span>Clear history</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Unknown sender action bar */}
      {contact.isUnknownSender && (
        <div className="unknown-action-bar">
          <button
            type="button"
            className="text-btn unknown-add-btn"
            onClick={() => {
              setSenderNameInput('');
              setSenderUinInput('');
              setSenderError('');
              setAddSenderModalOpen(true);
            }}
          >
            ADD CONTACT
          </button>
        </div>
      )}

      {/* Messages area */}
      <div
        className="chat-messages-viewport"
        ref={messagesScrollRef}
        onScroll={handleScroll}
      >
        <div className="chat-content-column">
          <div className="service-pill-row">
            <div className="service-pill">
              {contact.isUnknownSender
                ? 'You can add this sender only while this space stays open. After Khong locks, this chat is gone.'
                : "Messages are end-to-end encrypted. Your history is stored encrypted and opens only with this space's code."}
            </div>
          </div>

          {contact.messages.length === 0 ? (
            <div className="empty-chat-card-wrap">
              <div className="empty-chat-card">
                <div className="empty-chat-title">No messages here yet</div>
                <div className="empty-chat-body">
                  Messages are end-to-end encrypted. Your history is stored encrypted and opens only with this space's code. New messages are checked every 15 minutes.
                </div>
              </div>
            </div>
          ) : (
            contact.messages.map((msg, pos) => {
              const prev = pos > 0 ? contact.messages[pos - 1] : null;
              const showDaySeparator = !prev || prev.dayLabel !== msg.dayLabel;
              const groupMeta = groupMetas[pos];
              const isSelected = selectedIds.includes(msg.id);

              const bubbleClasses = [
                'chat-bubble',
                msg.direction === 'in' ? 'bubble-in' : 'bubble-out',
                !groupMeta.isFirstInGroup ? 'grouped-top' : '',
                !groupMeta.isLastInGroup ? 'grouped-bottom' : '',
                groupMeta.isLastInGroup ? 'has-tail' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <React.Fragment key={msg.id}>
                  {showDaySeparator && (
                    <div className="date-separator-row">
                      <span className="date-separator-pill">{msg.dayLabel}</span>
                    </div>
                  )}

                  <div
                    className={`message-row ${
                      msg.direction === 'in' ? 'row-in' : 'row-out'
                    } ${ !groupMeta.isFirstInGroup ? 'compact-gap' : 'group-gap' } ${
                      selectedIds.length > 0 ? 'selection-mode-row' : ''
                    }`}
                    onClick={() => {
                      if (selectedIds.length > 0) {
                        toggleSelectMessage(msg.id);
                      }
                    }}
                  >
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        className={`selection-check-circle ${
                          isSelected ? 'checked' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMessage(msg.id);
                        }}
                        aria-label={`Select message ${msg.time}`}
                      >
                        {isSelected && <Icon name="done" size={14} />}
                      </button>
                    )}

                    <div className="bubble-stack">
                      <div
                        className={bubbleClasses}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActiveBubbleMenu({
                            message: msg,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          longPressTimerRef.current = window.setTimeout(() => {
                            setActiveBubbleMenu({
                              message: msg,
                              x: touch.clientX,
                              y: touch.clientY,
                            });
                          }, 500);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onClick={(e) => {
                          if (selectedIds.length > 0) return;
                          if (msg.status === 'not_sent') {
                            e.stopPropagation();
                            setNotSentMenuMessage(msg);
                          }
                        }}
                      >
                        {/* Attachment rendering */}
                        {msg.attachment && (
                          <div className="bubble-attachment">
                            {msg.attachment.isLoadingIncoming ? (
                              <div className="incoming-loading-card">
                                <div className="status-inline-row">
                                  <Spinner size={16} />
                                  <span>Loading…</span>
                                </div>
                                <div className="incoming-loading-note">
                                  Keep Khong open until this finishes. Files that haven't finished loading are lost when Khong locks.
                                </div>
                              </div>
                            ) : msg.attachment.hasLoadError ? (
                              <div className="attachment-error-card">
                                <Icon name="error" size={20} className="danger-icon" />
                                <span>Couldn't open this file.</span>
                              </div>
                            ) : msg.attachment.kind === 'photo' ? (
                              <div
                                className="bubble-photo-wrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewerPhotoMessage(msg);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    setViewerPhotoMessage(msg);
                                  }
                                }}
                              >
                                <img
                                  src={
                                    msg.attachment.previewUrl ||
                                    SAMPLE_PHOTO_DATA_URL
                                  }
                                  alt={msg.attachment.caption || 'Photo'}
                                  className="bubble-photo-img"
                                />
                                {msg.attachment.isUploading && (
                                  <div className="upload-progress-overlay">
                                    <div className="progress-ring-wrap">
                                      <Spinner size={28} />
                                      <button
                                        type="button"
                                        className="cancel-upload-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onCancelAttachmentUpload(
                                            contact.id,
                                            msg.id
                                          );
                                        }}
                                        aria-label="Cancel upload"
                                      >
                                        <Icon name="close" size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bubble-file-card">
                                <div className="file-card-icon">
                                  {msg.attachment.isUploading ? (
                                    <button
                                      type="button"
                                      className="cancel-upload-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCancelAttachmentUpload(
                                          contact.id,
                                          msg.id
                                        );
                                      }}
                                      aria-label="Cancel upload"
                                    >
                                      <Icon name="close" size={18} />
                                    </button>
                                  ) : (
                                    <Icon name="description" size={24} />
                                  )}
                                </div>
                                <div className="file-card-meta">
                                  <div className="file-card-name">
                                    {msg.attachment.fileName} ·{' '}
                                    {msg.attachment.fileSizeLabel}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bubble-text-wrap">
                          <span className="bubble-text">
                            {msg.attachment?.caption
                              ? renderMessageTextWithLinks(msg.attachment.caption)
                              : renderMessageTextWithLinks(msg.text)}
                          </span>
                          <span
                            className={`bubble-meta ${
                              msg.direction === 'in' ? 'meta-in' : 'meta-out'
                            }`}
                          >
                            <span className="bubble-time">{msg.time}</span>
                            {msg.direction === 'out' && msg.status === 'sending' && (
                              <Icon
                                name="schedule"
                                size={16}
                                className="status-icon"
                              />
                            )}
                            {msg.direction === 'out' && msg.status === 'sent' && (
                              <Icon
                                name="done"
                                size={16}
                                className="status-icon"
                              />
                            )}
                            {msg.direction === 'out' &&
                              msg.status === 'not_sent' && (
                                <Icon
                                  name="error"
                                  size={16}
                                  className="status-icon danger-icon"
                                />
                              )}
                          </span>
                        </div>

                        {groupMeta.isLastInGroup && (
                          <svg
                            width="9"
                            height="16"
                            viewBox="0 0 9 16"
                            className={`bubble-tail ${
                              msg.direction === 'in' ? 'tail-in' : 'tail-out'
                            }`}
                            focusable="false"
                          >
                            {msg.direction === 'in' ? (
                              <path
                                d="M9 0v16H0c3.5-2 6.5-6 9-16z"
                                fill="currentColor"
                              />
                            ) : (
                              <path
                                d="M0 0v16h9c-3.5-2-6.5-6-9-16z"
                                fill="currentColor"
                              />
                            )}
                          </svg>
                        )}
                      </div>

                      {msg.direction === 'out' && msg.status === 'not_sent' && (
                        <button
                          type="button"
                          className="not-sent-subtext"
                          onClick={() => setNotSentMenuMessage(msg)}
                        >
                          Not sent. Khong will try again while this space is open.
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Jump to latest button */}
      {showJumpDown && (
        <button
          type="button"
          className="jump-down-fab"
          onClick={scrollToBottom}
          aria-label="Jump to latest"
        >
          <Icon name="arrow_downward" />
          {contact.unreadCount > 0 && (
            <span className="jump-down-badge">{contact.unreadCount}</span>
          )}
        </button>
      )}

      {/* Composer or Unknown sender footer */}
      {contact.isUnknownSender ? (
        <div className="unknown-composer-bar">
          Add this sender as a contact to reply.
        </div>
      ) : (
        <div className="composer-outer-wrap">
          {emojiGridOpen && (
            <div className="emoji-popover">
              {SYSTEM_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="emoji-cell"
                  onClick={() => handleDraftInput(draftText + em)}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {attachMenuOpen && (
            <>
              <div
                className="menu-click-catcher"
                onClick={() => setAttachMenuOpen(false)}
              />
              <div className="khong-menu attach-popover" role="menu">
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setAttachmentCaption('');
                    setPendingAttachment({
                      kind: 'photo',
                      fileName: 'sample-attachment.svg',
                      fileSizeLabel: '18 KB',
                      previewUrl: SAMPLE_PHOTO_DATA_URL,
                    });
                    photoInputRef.current?.click();
                  }}
                >
                  <Icon name="image" size={20} />
                  <span>Photo or Video</span>
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setAttachmentCaption('');
                    setPendingAttachment({
                      kind: 'file',
                      fileName: 'sample-document.pdf',
                      fileSizeLabel: '120 KB',
                    });
                    fileInputRef.current?.click();
                  }}
                >
                  <Icon name="description" size={20} />
                  <span>File</span>
                </button>
              </div>
            </>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,video/*"
            className="file-picker-input"
            onChange={(e) => handleFilePicked(e, 'photo')}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="file-picker-input"
            onChange={(e) => handleFilePicked(e, 'file')}
          />

          <div className="chat-content-column composer-row">
            <div className="composer-box">
              <button
                type="button"
                className="icon-btn composer-icon-btn"
                onClick={() => setEmojiGridOpen((v) => !v)}
                aria-label="Emoji"
              >
                <Icon name="mood" />
              </button>
              <textarea
                rows={1}
                className="composer-textarea"
                placeholder="Message"
                aria-label="Message"
                value={draftText}
                onChange={(e) => handleDraftInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
              />
              <button
                type="button"
                className="icon-btn composer-icon-btn"
                onClick={() => setAttachMenuOpen((v) => !v)}
                aria-label="Attach file"
              >
                <Icon name="attach_file" />
              </button>
            </div>

            <div className="send-btn-column">
              {showBytesCounter && (
                <div className="bytes-left-counter">{remainingBytes} left</div>
              )}
              <button
                type="button"
                className={`composer-send-btn ${
                  !draftText.trim() ? 'dimmed-send' : ''
                }`}
                disabled={!draftText.trim()}
                onClick={handleSendText}
                aria-label="Send"
              >
                <Icon name="send" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S-10 Context menu on a bubble */}
      {activeBubbleMenu && (
        <div
          className="dialog-backdrop transparent-backdrop"
          onClick={() => setActiveBubbleMenu(null)}
        >
          <div
            className="khong-menu floating-menu"
            style={{
              top: `${Math.min(activeBubbleMenu.y, 600)}px`,
              left: `${Math.min(activeBubbleMenu.x, 300)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onCopyText(activeBubbleMenu.message.text, 'Copied to clipboard');
                setActiveBubbleMenu(null);
              }}
            >
              <Icon name="content_copy" size={20} />
              <span>Copy</span>
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setSelectedIds([activeBubbleMenu.message.id]);
                setActiveBubbleMenu(null);
              }}
            >
              <Icon name="check_circle" size={20} />
              <span>Select</span>
            </button>
            <button
              type="button"
              className="menu-item danger-text"
              onClick={() => {
                setConfirmDeleteIds([activeBubbleMenu.message.id]);
                setActiveBubbleMenu(null);
              }}
            >
              <Icon name="delete" size={20} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Not-sent message menu */}
      {notSentMenuMessage && (
        <div
          className="dialog-backdrop"
          onClick={() => setNotSentMenuMessage(null)}
        >
          <div
            className="khong-menu centered-menu"
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onRetryMessage(contact.id, notSentMenuMessage.id);
                setNotSentMenuMessage(null);
              }}
            >
              <Icon name="send" size={20} />
              <span>Try again now</span>
            </button>
            <button
              type="button"
              className="menu-item danger-text"
              onClick={() => {
                const targetId = notSentMenuMessage.id;
                setNotSentMenuMessage(null);
                setConfirmDeleteIds([targetId]);
              }}
            >
              <Icon name="delete" size={20} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete message dialog */}
      {confirmDeleteIds && (
        <div
          className="dialog-backdrop"
          onClick={() => setConfirmDeleteIds(null)}
        >
          <div
            className="khong-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">Delete message?</div>
            <div className="dialog-body">
              It will be removed from your history. The other person keeps their copy.
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setConfirmDeleteIds(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn danger-text"
                onClick={() => {
                  onDeleteMessages(contact.id, confirmDeleteIds);
                  setConfirmDeleteIds(null);
                  setSelectedIds([]);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear chat history dialog */}
      {confirmClearChatOpen && (
        <div
          className="dialog-backdrop"
          onClick={() => setConfirmClearChatOpen(false)}
        >
          <div
            className="khong-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">Clear history with this contact?</div>
            <div className="dialog-body">
              Messages in this chat will be removed from your history on every device.
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setConfirmClearChatOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn danger-text"
                onClick={() => {
                  setConfirmClearChatOpen(false);
                  onClearChatHistory(contact.id);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open link dialog */}
      {pendingLinkUrl && (
        <div
          className="dialog-backdrop"
          onClick={() => setPendingLinkUrl(null)}
        >
          <div
            className="khong-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">Open this link in your browser?</div>
            <div className="dialog-body">{pendingLinkUrl}</div>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setPendingLinkUrl(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setPendingLinkUrl(null)}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S-11 Attachment preview dialog/sheet */}
      {pendingAttachment && (
        <div
          className="dialog-backdrop"
          onClick={() => setPendingAttachment(null)}
        >
          <div
            className={`attachment-preview-modal ${
              isMobile ? 'mobile-sheet' : 'desktop-preview-dialog'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">
              {pendingAttachment.kind === 'photo' ? 'Send photo' : 'Send file'}
            </div>

            {pendingAttachment.kind === 'photo' ? (
              <img
                src={pendingAttachment.previewUrl || SAMPLE_PHOTO_DATA_URL}
                alt="Preview"
                className="attachment-preview-image"
              />
            ) : (
              <div className="bubble-file-card preview-file-card">
                <Icon name="description" size={28} />
                <div>
                  {pendingAttachment.fileName} ·{' '}
                  {pendingAttachment.fileSizeLabel}
                </div>
              </div>
            )}

            <input
              type="text"
              className="khong-input"
              placeholder="Add a caption…"
              value={attachmentCaption}
              onChange={(e) => setAttachmentCaption(e.target.value)}
            />

            <div className="review-note-box">
              Open item O-17: on many phones the system file chooser locks Khong.
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setPendingAttachment(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => {
                  onSendMessage(
                    contact.id,
                    attachmentCaption.trim() ||
                      (pendingAttachment.kind === 'photo' ? 'Photo' : 'File'),
                    {
                      kind: pendingAttachment.kind,
                      fileName: pendingAttachment.fileName,
                      fileSizeLabel: pendingAttachment.fileSizeLabel,
                      caption: attachmentCaption.trim() || undefined,
                      previewUrl: pendingAttachment.previewUrl,
                      isUploading: true,
                    }
                  );
                  setPendingAttachment(null);
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File validation error dialog */}
      {fileAlertDialog && (
        <div
          className="dialog-backdrop"
          onClick={() => setFileAlertDialog(null)}
        >
          <div
            className="khong-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">{fileAlertDialog.title}</div>
            <div className="dialog-body">{fileAlertDialog.body}</div>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setFileAlertDialog(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S-12 Fullscreen photo viewer */}
      {viewerPhotoMessage && (
        <div
          className="photo-viewer-overlay"
          onClick={() => setViewerPhotoMessage(null)}
        >
          <div className="photo-viewer-topbar">
            <div className="photo-viewer-meta">
              <span>{formatShortUin(contact.uinValue)}</span>
              <span> · </span>
              <span>{viewerPhotoMessage.time}</span>
            </div>
            <button
              type="button"
              className="icon-btn viewer-close-btn"
              onClick={() => setViewerPhotoMessage(null)}
              aria-label="Close viewer"
            >
              <Icon name="close" />
            </button>
          </div>
          <div
            className="photo-viewer-body"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={
                viewerPhotoMessage.attachment?.previewUrl ||
                SAMPLE_PHOTO_DATA_URL
              }
              alt={viewerPhotoMessage.attachment?.caption || 'Photo'}
              className="photo-viewer-img"
            />
            {viewerPhotoMessage.attachment?.caption && (
              <div className="photo-viewer-caption">
                {viewerPhotoMessage.attachment.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* S-15 Add this sender dialog/sheet */}
      {addSenderModalOpen && (
        <div
          className="dialog-backdrop"
          onClick={() => setAddSenderModalOpen(false)}
        >
          <div
            className={`khong-dialog wide-dialog ${
              isMobile ? 'mobile-sheet' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-title">Add this sender</div>
            <div className="form-field-block">
              <input
                type="text"
                className="khong-input"
                placeholder="Name (optional)"
                value={senderNameInput}
                onChange={(e) => {
                  setSenderNameInput(e.target.value);
                  setSenderError('');
                }}
              />
            </div>
            <div className="form-field-block">
              <textarea
                rows={3}
                className="khong-textarea mono-textarea"
                placeholder="UIN"
                value={senderUinInput}
                onChange={(e) => {
                  setSenderUinInput(e.target.value);
                  setSenderError('');
                }}
              />
            </div>

            {senderUinValid && (
              <div className="info-card">
                <div className="section-caption-inline">Key code</div>
                <div className="mono-block">{contact.keyCode}</div>
              </div>
            )}

            {senderError && (
              <div className="field-error-text">{senderError}</div>
            )}

            <p className="small-helper-text">
              Messages don't include the sender's UIN. Ask them for it, and check that the key code matches the one in their My ID.
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn primary-text"
                onClick={() => setAddSenderModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn primary-text"
                disabled={!senderUinValid}
                onClick={() => {
                  if (getByteLength(senderNameInput) > MAX_NAME_BYTES) {
                    setSenderError('This name is too long.');
                    return;
                  }
                  onConvertUnknownToContact(
                    contact.id,
                    normalizedSenderUin,
                    senderNameInput.trim()
                  );
                  setAddSenderModalOpen(false);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
