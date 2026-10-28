import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ACCOUNT_UIN,
  buildTwentyFourContacts,
  computeBubbleGrouping,
  createInitialSpaces,
  formatKeyCodeGroups,
  formatShortUin,
  formatUinFourLines,
  getAvatarGradient,
  isValidKeyCode,
  isValidUin,
  normalizeKeyCodeInput,
  normalizeUinInput,
  parseKhongPasteString,
  uin,
} from './rules';

test('uin generator and formatters work as specified', () => {
  const c1 = uin('a11ce000', '0001');
  assert.equal(c1.length, 64);
  assert.equal(formatShortUin(c1), 'a11c e000 … 0001');
  assert.equal(ACCOUNT_UIN.length, 64);
  assert.equal(formatShortUin(ACCOUNT_UIN), 'c0ff ee00 … 0000');

  const lines = formatUinFourLines(c1);
  assert.equal(lines.length, 4);
  assert.equal(lines[0], 'a11c e000 0000 0000');
  assert.equal(lines[3], '0000 0000 0000 0001');
});

test('avatar gradient chooses deterministic bucket by first two hex chars mod 7', () => {
  const g1 = getAvatarGradient(uin('a11ce000', '0001'));
  // 0xa1 = 161; 161 % 7 = 0 -> red (#FF885E -> #FF516A)
  assert.equal(g1.top, '#FF885E');
  assert.equal(g1.bottom, '#FF516A');
  assert.equal(g1.label, 'A1');
});

test('UIN and key code normalization and validation rules', () => {
  const rawUin = 'A11C-E000 ' + '0000 '.repeat(13) + '0001';
  const normUin = normalizeUinInput(rawUin);
  assert.equal(normUin.length, 64);
  assert.equal(isValidUin(normUin), true);

  // Key code: I and L read as 1, O as 0, 32 chars in 8 groups of 4
  const rawKey = 'iiii-llll-oooo-abcd-efgh-jklm-npqr-stuv';
  const normKey = normalizeKeyCodeInput(rawKey);
  assert.equal(normKey.slice(0, 12), '111111110000');
  assert.equal(isValidKeyCode(normKey), true);
  assert.equal(formatKeyCodeGroups(normKey).split(' ').length, 8);

  const pasted = parseKhongPasteString(`khong:${normUin}.${rawKey}`);
  assert.ok(pasted);
  assert.equal(pasted.uinValue, normUin);
});

test('bubble grouping groups consecutive same-direction messages within 5 minutes', () => {
  const spaces = createInitialSpaces();
  const c1Messages = spaces[0].contacts[0].messages;
  const groups = computeBubbleGrouping(c1Messages);
  assert.equal(groups.length, 4);
  // msg 0: in 09:12, msg 1: out 09:14, msg 2: in 09:20, msg 3: out 09:31
  assert.equal(groups[0].isLastInGroup, true);
  assert.equal(groups[1].isLastInGroup, true);
});

test('initial spaces and 24-contact builder match specification', () => {
  const spaces = createInitialSpaces();
  assert.equal(spaces.length, 2);
  assert.equal(spaces[0].codeValue, 'blue river morning');
  assert.equal(spaces[1].codeValue, 'green hill evening');
  assert.equal(spaces[0].contacts.filter((c) => !c.isUnknownSender).length, 3);
  assert.equal(spaces[0].contacts.filter((c) => c.isUnknownSender).length, 1);

  const filled = buildTwentyFourContacts(spaces[0].contacts);
  assert.equal(filled.filter((c) => !c.isUnknownSender).length, 24);
});

test('strict naming audit: no banned words in application source files', () => {
  const appFiles = [
    'index.html',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/utils/rules.ts',
    'src/components/Icon.tsx',
    'src/components/CommonUI.tsx',
    'src/components/SettingsPages.tsx',
    'src/components/ContactsPages.tsx',
    'src/components/ChatPane.tsx',
  ];

  const bannedWords = [
    'hidden',
    'secret',
    'secretSpace',
    'hiddenSpace',
    'stealth',
    'covert',
    'cloak',
    'stego',
    'decoy',
    'fake',
    'dummy',
    'cover',
    'coverSpace',
    'plausible',
    'deniable',
    'chaff',
    'garbage',
    'noise',
    'paddingBlob',
    'isReal',
    'isEmpty',
    'isUsed',
    'isActiveSlot',
    'realSlotCount',
    'usedSlots',
    'spaceCount',
    'duress',
    'panic',
    'panicMode',
    'lockdown',
    'blackout',
    'wipePin',
    'password',
    'passcode',
    'pin',
    'secretCode',
    'unlockPassphrase',
    'secondFactor',
    'vault',
    'safe',
    'secretFolder',
    'privateBox',
    'sandbox',
    'hiddenFolder',
    'knock',
    'slot',
    'primary space',
  ];

  for (const relPath of appFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    // Remove allowed CSS "overflow: hidden" and "env(safe-area-inset-top)" and allowed word "safety" before checking
    const cleaned = rawContent
      .replace(/overflow\s*:\s*hidden/g, 'overflow: allowed')
      .replace(/env\(safe-area-inset-top\)/g, 'env(allowed)')
      .replace(/safety/g, 'allowed_word');

    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      const match = cleaned.match(regex);
      assert.equal(
        Boolean(match),
        false,
        `Found banned word "${word}" in ${relPath}`
      );
    }
  }
});
