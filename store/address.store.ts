import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const addresses = {
  home: { label: '家 · 望京', location: '送至 · 望京', tag: '家', address: '北京市朝阳区望京街 10 号', room: '3 号楼 1202 室' },
  company: { label: '公司 · 中关村', location: '送至 · 中关村', tag: '公司', address: '北京市海淀区中关村东路 8 号', room: 'B 座 6 层前台' },
} as const;
export type AddressId = keyof typeof addresses;
type AddressState = {
  committed: AddressId;
  draft: AddressId;
  editing: boolean;
  fixtureNonce: string | null;
  initialDraft: AddressId | null;
  beginEditing: () => void;
  select: (id: AddressId) => void;
  confirm: () => boolean;
  cancel: () => void;
  loadFixture: (stateId: string, nonce: string) => void;
};
function assertAddress(id: string): asserts id is AddressId {
  if (id !== 'home' && id !== 'company') throw new Error(`Unknown address: ${id}`);
}
export function createAddressStore() {
  return createStore<AddressState>((set, get) => ({
    committed: 'home', draft: 'home', editing: false, fixtureNonce: null, initialDraft: null,
    beginEditing: () => {
      const state = get();
      set({ draft: state.initialDraft ?? state.committed, initialDraft: null, editing: true });
    },
    select: (id) => {
      assertAddress(id);
      if (get().editing) set({ draft: id });
    },
    confirm: () => {
      if (!get().editing) return false;
      set({ committed: get().draft, editing: false });
      return true;
    },
    cancel: () => set({ draft: get().committed, editing: false }),
    loadFixture: (stateId, nonce) => {
      if (!['address.default.fixture-v1', 'address.company.fixture-v1', 'home.default.fixture-v1'].includes(stateId)) {
        throw new Error(`Unknown address fixture: ${stateId}`);
      }
      if (!nonce) throw new Error('Fixture nonce is required');
      if (get().fixtureNonce === nonce) return;
      const draft = stateId === 'address.company.fixture-v1' ? 'company' : 'home';
      set({ committed: 'home', draft, initialDraft: draft, editing: false, fixtureNonce: nonce });
    },
  }));
}
export const addressStore = createAddressStore();
export function useAddressStore<T>(selector: (state: AddressState) => T): T {
  return useStore(addressStore, selector);
}
