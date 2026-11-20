// What every group of store actions is handed (see StoreContext).
/**
 * @typedef {object} StoreCtx
 * @property {(fn: any) => void} setProfileState
 * @property {(fn: any) => void} setInterests
 * @property {(fn: any) => void} setPhotos
 * @property {(fn: any) => void} setEntries
 * @property {(v: any) => void} setProfileCheck
 * @property {(fn: any) => void} setProfileCheckTick
 * @property {{ current: any }} profileRef
 * @property {{ current: any }} userRef
 * @property {ReturnType<typeof import("./syncEngine").createSyncEngine>} sync
 */
export {};
