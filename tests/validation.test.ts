import { validateAppearance } from '../src/validation';

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});
test('all 24 public appearance options map without changing valid values', () => {
  const value = {
    accentColor: '#ff8800',
    onAccentColor: '#ffffff80',
    title: '',
    welcomeTitle: 'Hello',
    welcomeText: 'Welcome',
    showsCloseButton: true,
    chatBackground: null,
    incomingBackground: '#eeeeee',
    incomingForeground: '#000000',
    preferredColorScheme: 'dark',
    closeIcon: 'chevron.down',
    closeImage: 'Close',
    fontDesign: 'rounded',
    fontFamily: null,
    fadesOlderMessages: false,
    welcomeIcon: { symbol: 'star' },
    welcomeIconColor: '#aa00bb',
    welcomeIconSize: 80,
    welcomeIconCornerRadius: 20,
    welcomeIconOffset: { x: 3, y: -5 },
    hidesTitle: true,
    hidesWelcomeTitle: false,
    hidesWelcomeText: true,
    hidesPushStatus: true,
  };
  expect(Object.keys(value)).toHaveLength(24);
  expect(validateAppearance(value, {})).toEqual(value);
});
test.each([
  { accentColor: 'red' },
  { accentColor: '#fff' },
  { onAccentColor: '#gggggg' },
  { welcomeIconSize: Number.NaN },
  { welcomeIconSize: 161 },
  { welcomeIconSize: 15 },
  { welcomeIconCornerRadius: -1 },
  { welcomeIconOffset: { x: Infinity, y: 0 } },
  { preferredColorScheme: 'system' },
  { fontDesign: 'comic' },
  { closeIcon: 'unknown' },
  { welcomeIcon: { symbol: 'star', hidden: true } },
  { showsCloseButton: 'yes' },
])('invalid appearance fields are logged and ignored: %p', (value) => {
  expect(validateAppearance(value, {})).toEqual({});
  expect(console.warn).toHaveBeenCalledTimes(1);
});
test('invalid replacement retains that field while omitted fields reset', () => {
  expect(
    validateAppearance(
      { accentColor: 'bad' },
      { accentColor: '#112233', title: 'Old' },
    ),
  ).toEqual({ accentColor: '#112233' });
  expect(validateAppearance({}, { title: 'Old' })).toEqual({});
  expect(validateAppearance(null, {})).toBeNull();
});
test('prototype keys never count as supported appearance fields', () => {
  expect(
    validateAppearance(JSON.parse('{"__proto__":{},"toString":"private"}'), {}),
  ).toEqual({});
});

test('all six color options accept light/dark hex pairs', () => {
  const pair = { light: '#123456', dark: '#abcdef80' };
  const value = {
    accentColor: pair,
    onAccentColor: pair,
    chatBackground: pair,
    incomingBackground: pair,
    incomingForeground: pair,
    welcomeIconColor: pair,
  };
  expect(validateAppearance(value, {})).toEqual(value);
});

test.each([
  { light: '#112233' },
  { dark: '#445566' },
  { light: '#112233', dark: 'red' },
  { light: '#112233', dark: '#445566', extra: true },
  { light: null, dark: '#445566' },
])('invalid dynamic color retains the previous complete pair: %p', (pair) => {
  const previous = { accentColor: { light: '#abcdef', dark: '#123456' } };
  expect(validateAppearance({ accentColor: pair }, previous)).toEqual(previous);
  expect(console.warn).toHaveBeenCalledTimes(1);
});
