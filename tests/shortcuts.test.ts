import { describe, it, expect } from 'vitest';
import { useUIStore } from '../src/store/uiStore';

describe('Keyboard Shortcuts & Modal Store', () => {
  it('toggles shortcuts modal state in uiStore', () => {
    useUIStore.getState().setShortcutsModalOpen(true);
    expect(useUIStore.getState().isShortcutsModalOpen).toBe(true);
    expect(useUIStore.getState().isHelpModalOpen).toBe(true);

    useUIStore.getState().setShortcutsModalOpen(false);
    expect(useUIStore.getState().isShortcutsModalOpen).toBe(false);
    expect(useUIStore.getState().isHelpModalOpen).toBe(false);
  });

  it('keeps isHelpModalOpen and isShortcutsModalOpen in sync', () => {
    useUIStore.getState().setHelpModalOpen(true);
    expect(useUIStore.getState().isShortcutsModalOpen).toBe(true);

    useUIStore.getState().setHelpModalOpen(false);
    expect(useUIStore.getState().isShortcutsModalOpen).toBe(false);
  });
});
