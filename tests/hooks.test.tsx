import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { initial, mockNative } from './mockNative';

const mock = mockNative();
jest.mock('expo', () => ({ requireOptionalNativeModule: () => mock.native }));
import { useReceptionChatOpen, useReceptionUnreadCount } from '../src/hooks';
import '../src/callbacks';

function Status() {
  return (
    <>
      {useReceptionUnreadCount()}:{String(useReceptionChatOpen())}
    </>
  );
}

test('hooks hydrate, update, and unmount without retaining a React subscription', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(<Status />);
  });
  expect(tree?.toJSON()).toEqual(['0', ':', 'false']);
  await act(async () => {
    await mock.emit('onState', {
      ...initial,
      revision: 4,
      unreadCount: 2,
      isChatOpen: true,
    });
  });
  expect(tree?.toJSON()).toEqual(['2', ':', 'true']);
  await act(async () => {
    tree?.unmount();
  });
  await act(async () => {
    await mock.emit('onState', { ...initial, revision: 5 });
  });
  expect(
    errors.mock.calls.every(
      ([message]) =>
        typeof message === 'string' &&
        message.includes('react-test-renderer is deprecated'),
    ),
  ).toBe(true);
  errors.mockRestore();
});
