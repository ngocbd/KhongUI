export interface AttachmentData {
  kind: 'photo' | 'file';
  fileName: string;
  fileSizeLabel: string;
  caption?: string;
  previewUrl?: string;
  isUploading?: boolean;
  isLoadingIncoming?: boolean;
  hasLoadError?: boolean;
}

export type OutgoingStatus = 'sending' | 'sent' | 'not_sent';

export interface MessageItem {
  id: string;
  direction: 'in' | 'out';
  text: string;
  time: string;
  dayLabel: 'Today' | 'Yesterday';
  minuteValue: number;
  status?: OutgoingStatus;
  attachment?: AttachmentData;
}

export interface ContactEntry {
  id: string;
  uinValue: string;
  keyCode: string;
  name: string;
  unreadCount: number;
  isUnknownSender?: boolean;
  messages: MessageItem[];
}

export interface SpaceRecord {
  id: string;
  codeValue: string;
  isHushed: boolean;
  isRemoved: boolean;
  contacts: ContactEntry[];
}

export function uin(prefix: string, suffix: string): string {
  const cleanPrefix = prefix.toLowerCase().replace(/[^0-9a-f]/g, '');
  const cleanSuffix = suffix.toLowerCase().replace(/[^0-9a-f]/g, '').padStart(4, '0').slice(0, 4);
  const paddedPrefix = cleanPrefix.padEnd(60, '0').slice(0, 60);
  return paddedPrefix + cleanSuffix;
}

export const ACCOUNT_UIN = uin('c0ffee00', '0000');
export const ACCOUNT_KEY_CODE = 'ZZZZ YYYY XXXX WWWW VVVV TTTT SSSS RRRR';

export function formatUinGroups(fullUin: string): string {
  const clean = fullUin.toLowerCase().replace(/[^0-9a-f]/g, '');
  const parts: string[] = [];
  for (let pos = 0; pos < clean.length; pos += 4) {
    parts.push(clean.slice(pos, pos + 4));
  }
  return parts.join(' ');
}

export function formatUinFourLines(fullUin: string): string[] {
  const clean = fullUin.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(64, '0').slice(0, 64);
  const lines: string[] = [];
  for (let lineNum = 0; lineNum < 4; lineNum++) {
    const chunk = clean.slice(lineNum * 16, (lineNum + 1) * 16);
    const groups: string[] = [];
    for (let g = 0; g < 16; g += 4) {
      groups.push(chunk.slice(g, g + 4));
    }
    lines.push(groups.join(' '));
  }
  return lines;
}

export function formatShortUin(fullUin: string): string {
  const clean = fullUin.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (clean.length < 12) return clean;
  const g1 = clean.slice(0, 4);
  const g2 = clean.slice(4, 8);
  const last = clean.slice(-4);
  return `${g1} ${g2} … ${last}`;
}

export interface AvatarGradient {
  top: string;
  bottom: string;
  label: string;
}

const AVATAR_GRADIENTS: Array<{ top: string; bottom: string }> = [
  { top: '#FF885E', bottom: '#FF516A' }, // red
  { top: '#FFCD6A', bottom: '#FFA85C' }, // orange
  { top: '#82B1FF', bottom: '#665FFF' }, // violet
  { top: '#A0DE7E', bottom: '#54CB68' }, // green
  { top: '#53EDD6', bottom: '#28C9B7' }, // cyan
  { top: '#72D5FD', bottom: '#2A9EF1' }, // blue
  { top: '#E0A2F3', bottom: '#D669ED' }, // pink
];

export function getAvatarGradient(fullUin: string): AvatarGradient {
  const firstTwo = (fullUin || '00').slice(0, 2);
  const parsed = parseInt(firstTwo, 16);
  const bucket = Number.isNaN(parsed) ? 0 : parsed % 7;
  const pair = AVATAR_GRADIENTS[bucket] || AVATAR_GRADIENTS[0];
  return {
    top: pair.top,
    bottom: pair.bottom,
    label: firstTwo.toUpperCase(),
  };
}

export function normalizeUinInput(raw: string): string {
  return raw.replace(/[\s-]/g, '').toLowerCase();
}

export function isValidUin(normalized: string): boolean {
  return /^[0-9a-f]{64}$/.test(normalized);
}

export function normalizeKeyCodeInput(raw: string): string {
  return raw
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

export function formatKeyCodeGroups(cleanKey: string): string {
  const trimmed = cleanKey.slice(0, 32);
  const parts: string[] = [];
  for (let pos = 0; pos < trimmed.length; pos += 4) {
    parts.push(trimmed.slice(pos, pos + 4));
  }
  return parts.join(' ');
}

export function isValidKeyCode(cleanKey: string): boolean {
  return /^[A-Z0-9]{32}$/.test(cleanKey);
}

export function parseKhongPasteString(raw: string): { uinValue: string; keyCodeValue: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('khong:')) return null;
  const body = trimmed.slice(6);
  const dotPos = body.indexOf('.');
  if (dotPos === -1) return null;
  const rawUin = body.slice(0, dotPos);
  const rawKey = body.slice(dotPos + 1);
  return {
    uinValue: normalizeUinInput(rawUin),
    keyCodeValue: formatKeyCodeGroups(normalizeKeyCodeInput(rawKey)),
  };
}

export function getByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export const MAX_MESSAGE_BYTES = 65233;
export const REMAINING_BYTES_WARN_THRESHOLD = 1233;
export const MAX_FILE_BYTES = 16776996;
export const MAX_FILENAME_BYTES = 128;
export const MAX_NAME_BYTES = 24;
export const MAX_CONTACTS_PER_SPACE = 24;

export interface BubbleGroupMeta {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export function computeBubbleGrouping(messages: MessageItem[]): BubbleGroupMeta[] {
  return messages.map((msg, pos) => {
    const prev = pos > 0 ? messages[pos - 1] : null;
    const next = pos < messages.length - 1 ? messages[pos + 1] : null;

    const sameAsPrev =
      prev !== null &&
      prev.direction === msg.direction &&
      prev.dayLabel === msg.dayLabel &&
      prev.status !== 'not_sent' &&
      msg.status !== 'not_sent' &&
      Math.abs(msg.minuteValue - prev.minuteValue) <= 5;

    const sameAsNext =
      next !== null &&
      next.direction === msg.direction &&
      next.dayLabel === msg.dayLabel &&
      next.status !== 'not_sent' &&
      msg.status !== 'not_sent' &&
      Math.abs(next.minuteValue - msg.minuteValue) <= 5;

    return {
      isFirstInGroup: !sameAsPrev,
      isLastInGroup: !sameAsNext,
    };
  });
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map((part) => parseInt(part, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
}

export const SAMPLE_PHOTO_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3390EC"/>
          <stop offset="50%" stop-color="#53EDD6"/>
          <stop offset="100%" stop-color="#8774E1"/>
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill="url(#g)"/>
      <circle cx="370" cy="80" r="36" fill="rgba(255,255,255,0.35)"/>
      <path d="M0 240 L140 130 L260 220 L350 155 L480 250 L480 300 L0 300 Z" fill="rgba(255,255,255,0.22)"/>
      <text x="24" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="500">Sample photo</text>
    </svg>`
  );

export function createInitialSpaces(): SpaceRecord[] {
  const spaceA: SpaceRecord = {
    id: 'space-a',
    codeValue: 'blue river morning',
    isHushed: false,
    isRemoved: false,
    contacts: [
      {
        id: 'contact-1',
        uinValue: uin('a11ce000', '0001'),
        keyCode: 'AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH',
        name: 'Sample contact 1',
        unreadCount: 0,
        messages: [
          {
            id: 'm-a1-1',
            direction: 'in',
            text: 'Sample message: are we still on for six?',
            time: '09:12',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('09:12'),
          },
          {
            id: 'm-a1-2',
            direction: 'out',
            text: 'Sample reply: six works.',
            time: '09:14',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('09:14'),
            status: 'sent',
          },
          {
            id: 'm-a1-3',
            direction: 'in',
            text: 'Sample photo',
            time: '09:20',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('09:20'),
            attachment: {
              kind: 'photo',
              fileName: 'sample-photo.svg',
              fileSizeLabel: '18 KB',
              caption: 'Sample photo caption',
              previewUrl: SAMPLE_PHOTO_DATA_URL,
            },
          },
          {
            id: 'm-a1-4',
            direction: 'out',
            text: 'Sample message waiting for the other side',
            time: '09:31',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('09:31'),
            status: 'not_sent',
          },
        ],
      },
      {
        id: 'contact-2',
        uinValue: uin('b0b00000', '0002'),
        keyCode: 'BBBB CCCC DDDD EEEE FFFF GGGG HHHH JJJJ',
        name: 'Sample contact 2',
        unreadCount: 1,
        messages: [
          {
            id: 'm-a2-1',
            direction: 'in',
            text: 'Sample file attached',
            time: '18:02',
            dayLabel: 'Yesterday',
            minuteValue: parseTimeToMinutes('18:02'),
            attachment: {
              kind: 'file',
              fileName: 'sample-report.pdf',
              fileSizeLabel: '240 KB',
            },
          },
          {
            id: 'm-a2-2',
            direction: 'out',
            text: 'Thanks, sample received.',
            time: '18:05',
            dayLabel: 'Yesterday',
            minuteValue: parseTimeToMinutes('18:05'),
            status: 'sent',
          },
        ],
      },
      {
        id: 'contact-3',
        uinValue: uin('ca7ca700', '0003'),
        keyCode: 'CCCC DDDD EEEE FFFF GGGG HHHH JJJJ KKKK',
        name: '',
        unreadCount: 0,
        messages: [],
      },
      {
        id: 'unknown-1',
        uinValue: '',
        keyCode: 'DDDD EEEE FFFF GGGG HHHH JJJJ KKKK MMMM',
        name: 'Unknown sender',
        unreadCount: 0,
        isUnknownSender: true,
        messages: [
          {
            id: 'm-u1-1',
            direction: 'in',
            text: 'Sample message from someone not in your contacts.',
            time: '08:40',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('08:40'),
          },
        ],
      },
    ],
  };

  const spaceB: SpaceRecord = {
    id: 'space-b',
    codeValue: 'green hill evening',
    isHushed: false,
    isRemoved: false,
    contacts: [
      {
        id: 'contact-4',
        uinValue: uin('d00d0000', '0004'),
        keyCode: 'EEEE FFFF GGGG HHHH JJJJ KKKK MMMM NNNN',
        name: 'Sample contact 4',
        unreadCount: 0,
        messages: [
          {
            id: 'm-b1-1',
            direction: 'in',
            text: 'Sample message in another space.',
            time: '07:55',
            dayLabel: 'Today',
            minuteValue: parseTimeToMinutes('07:55'),
          },
        ],
      },
    ],
  };

  return [spaceA, spaceB];
}

export function buildTwentyFourContacts(baseContacts: ContactEntry[]): ContactEntry[] {
  const unknownEntries = baseContacts.filter((c) => c.isUnknownSender);
  const regularEntries = baseContacts.filter((c) => !c.isUnknownSender);
  const result = [...regularEntries];

  let num = result.length + 1;
  while (result.length < MAX_CONTACTS_PER_SPACE) {
    const hexNum = num.toString(16).padStart(4, '0');
    const prefixHex = ((num * 17) % 255).toString(16).padStart(2, '0') + 'aa0000';
    result.push({
      id: `sample-extra-${num}`,
      uinValue: uin(prefixHex, hexNum),
      keyCode: 'FFFF GGGG HHHH JJJJ KKKK MMMM NNNN PPPP',
      name: `Sample contact ${num}`,
      unreadCount: 0,
      messages: [],
    });
    num++;
  }

  return [...result, ...unknownEntries];
}

export function getContactDisplayTitle(entry: ContactEntry): string {
  if (entry.isUnknownSender) return 'Unknown sender';
  if (entry.name && entry.name.trim().length > 0) return entry.name;
  return formatShortUin(entry.uinValue);
}

export function getChatLastPreview(entry: ContactEntry): {
  previewText: string;
  timeText: string;
  outgoingStatus?: OutgoingStatus;
} {
  if (entry.messages.length === 0) {
    return { previewText: 'No messages yet', timeText: '' };
  }
  const last = entry.messages[entry.messages.length - 1];
  let previewText = last.text;
  if (last.attachment) {
    if (last.attachment.kind === 'photo') {
      previewText = last.attachment.caption ? `Photo, ${last.attachment.caption}` : 'Photo';
    } else {
      previewText = 'File';
    }
  }
  return {
    previewText,
    timeText: last.time,
    outgoingStatus: last.direction === 'out' ? last.status : undefined,
  };
}

export function formatHushUntilDate(hoursToAdd: number, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getTime() + hoursToAdd * 3600 * 1000);
  const weekday = target.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${weekday}, ${monthDay}, ${hh}:${mm}`;
}
