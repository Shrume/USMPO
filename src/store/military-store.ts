import { writable, type Writable } from 'svelte/store';
import type { GlobeInstance } from 'globe.gl';
import type { CountryEntry } from '../routes/military/data';

/** Temporary highlight (list row or globe arc/polygon hover). */
export const UGNhoveredEntry: Writable<CountryEntry | null> = writable(null);

/** Persistent selection (list or globe click). */
export const UGNclickedEntry: Writable<CountryEntry | null> = writable(null);

/**
 * Globe-only signal for list autoscroll: arc/polygon hover (incl. null on leave) and
 * arc/polygon click selection/deselection. List UI never writes this store.
 */
export const UGNglobeClicked: Writable<CountryEntry | null> = writable(null);

export const UGNglobe: Writable<GlobeInstance | null> = writable(null);
export const UGNaltOffset: Writable<number> = writable(0);

export const UGNgoHome: Writable<number> = writable(0);
