// The shapes of the app's own records, as they live on the device (Dexie)
// and in StoreContext. Written down once so the type checker (npm run
// typecheck, see jsconfig.json) can hold the logic to them: a wrong field
// name — audioPath for audio_path, storagePath for storage_path — is the
// mistake several sync bugs came from, and it is the kind a checker sees
// before anyone runs anything.
//
// Times are epoch milliseconds; days are local "YYYY-MM-DD" keys (lib/dates).
// The server's snake_case rows are mapped to these in lib/remote.js.

/**
 * A hobby, drawn as a tree.
 * @typedef {object} Interest
 * @property {string} id
 * @property {string} name
 * @property {string} [nameZh]
 * @property {string} [why]
 * @property {string} [color]
 * @property {number[]} [days]       weekdays it is planned for, 0 = Sunday
 * @property {string|null} [species]
 * @property {string|null} [leafColor]
 * @property {number} [revivedAt]
 * @property {number} [deletedAt]    set while it is in Recently Deleted
 * @property {number} createdAt
 * @property {number} [updatedAt]    when it was last edited (newest edit wins)
 */

/**
 * One journal log.
 * @typedef {object} Entry
 * @property {string} id
 * @property {string} interestId
 * @property {string} date           the day it is for, "YYYY-MM-DD"
 * @property {string} [text]         may be empty: a log can be just its time
 * @property {number} [minutes]
 * @property {"private"|"public"} [visibility]
 * @property {boolean} [isPinned]
 * @property {boolean} [sharedToFeed]
 * @property {Blob|null} [audio]     the recording, on this device only
 * @property {string|null} [audioPath] where the recording is in Storage
 * @property {number} [audioMs]
 * @property {number} [deletedAt]
 * @property {number} createdAt
 * @property {number} [updatedAt]
 */

/**
 * A photo.
 * @typedef {object} Photo
 * @property {string} id
 * @property {string} interestId
 * @property {Blob} [blob]           the image, on this device only
 * @property {string|null} [storagePath] where the image is in Storage
 * @property {string} [caption]
 * @property {"private"|"public"} [visibility]
 * @property {boolean} [isPinned]
 * @property {number} [deletedAt]
 * @property {number} createdAt
 * @property {number} [updatedAt]
 */

/**
 * A hobby idea: [English name, Chinese name, palette index, category,
 * English description, Chinese description].
 * @typedef {[string, string, number, string, string, string]} Idea
 */

export {};
