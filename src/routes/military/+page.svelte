<script lang="ts">
    import { tick } from 'svelte';
    import { fly } from 'svelte/transition';
    import { get } from 'svelte/store';
    import {
        UGNglobe,
        UGNaltOffset,
        UGNhoveredEntry,
        UGNclickedEntry,
        UGNglobeClicked,
        UGNgoHome
    } from '../../store/military-store';
    import { ENTRIES, TOTAL_BASES, TOTAL_TROOPS } from './data';
    import type { CountryEntry, Base } from './data';
    import LeftArrow from '$lib/SVGs/UGN-leftArrow.svelte';

    $: activeEntry = $UGNhoveredEntry ?? $UGNclickedEntry;

    $: sortedEntries = [...ENTRIES].sort((a, b) => b.persistentBases - a.persistentBases);

    let listContainer: HTMLDivElement;
    let visibleEntries: CountryEntry[] = [];

    async function startCascade() {
        visibleEntries = [];
        await tick();
        const total = sortedEntries.length;
        const maxDuration = 1000;
        const baseDelay = 60;
        const stagger = total > 1 ? Math.min(50, (maxDuration - baseDelay) / (total - 1)) : 0;
        sortedEntries.forEach((entry, i) => {
            setTimeout(() => {
                visibleEntries = [...visibleEntries, entry];
            }, baseDelay + i * stagger);
        });
    }

    $: if ($UGNclickedEntry === null) startCascade();

    let visibleBases: Base[] = [];

    let sidebarEl: HTMLElement;
    let viewWrapperEl: HTMLElement;
    let animating = false;
    let lastEntry: CountryEntry | null = null;
    let lastHandledGoHome = 0;

    let ghostVisible = false;
    let ghostFlagSrc = '';
    let ghostName = '';
    let ghostY = 0;
    let ghostScale = 1;

    let ghostBarsVisible = false;
    let ghostBarShift = 0;
    let ghostBarLabel1 = 'Overseas bases';
    let ghostBarVal1 = String(TOTAL_BASES);
    let ghostBarLabel2 = 'Overseas troops';
    let ghostBarVal2 = TOTAL_TROOPS.toLocaleString();

    let measuredEndY = 43;
    let measuredBarsShift = 104;
    let ghostFlagWidth = 1.8;
    let ghostFontSize = 1.1;
    let ghostGap = 10;
    let ghostPaddingTop = 12;

    async function startBaseCascade(bases: Base[]) {
        visibleBases = [];
        await tick();
        const total = bases.length;
        const baseDelay = 60;
        const stagger = total > 1 ? Math.min(50, 400 / Math.max(1, bases.length - 1)) : 0;
        bases.forEach((base, i) => {
            setTimeout(() => {
                visibleBases = [...visibleBases, base];
            }, baseDelay + i * stagger);
        });
    }

    $: if ($UGNclickedEntry !== null) startBaseCascade($UGNclickedEntry.bases);

    $: if ($UGNgoHome > lastHandledGoHome) {
        lastHandledGoHome = $UGNgoHome;
        if ($UGNclickedEntry !== null) animateBack();
    }

    /**
     * Prefer the inner list (`.listScroll`) when it actually scrolls; otherwise the layout
     * `.sidebar` often owns overflow when `main` grew with content and `body` scrolled instead.
     */
    function listScrollPort(list: HTMLDivElement): HTMLElement {
        if (list.scrollHeight > list.clientHeight + 1) return list;
        const sidebar = list.closest<HTMLElement>('.sidebar');
        if (sidebar && sidebar.scrollHeight > sidebar.clientHeight + 1) return sidebar;
        return list;
    }

    function easeInOut(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    /** List autoscroll only for globe arc/polygon hover or click (`UGNglobeClicked`), never list hover. */
    $: {
        const globe = $UGNglobeClicked;
        if (!globe || !listContainer) {
            /* null on globe hover leave, list pointerenter, or before bind */
        } else {
            const entryId = globe.id;
            void tick().then(() => {
                if (!listContainer) return;
                const root = listScrollPort(listContainer);
                const el = root.querySelector<HTMLElement>(`[data-entry-id="${entryId}"]`);
                if (!el) return;
                const containerRect = root.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const outside = elRect.top < containerRect.top || elRect.bottom > containerRect.bottom;
                if (!outside) return;
                const offset =
                    elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
                const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
                const nextTop = Math.max(0, Math.min(maxScroll, root.scrollTop + offset));
                root.scrollTo({ top: nextTop, behavior: 'smooth' });
            });
        }
    }

    function flyToEntry(e: CountryEntry) {
        const g = get(UGNglobe);
        if (!g) return;
        const pov = g.pointOfView();
        const altOffset = get(UGNaltOffset);
        g.pointOfView(
            {
                lat: e.lat,
                lng: e.lng,
                altitude: Math.min(Math.max(pov.altitude, 0.55), 1.35) + altOffset
            },
            700
        );
    }

    async function animateForward(entry: CountryEntry) {
        if (animating) return;
        animating = true;
        lastEntry = entry;

        const clickedBtn = listContainer?.querySelector(`[data-entry-id="${entry.id}"]`);
        const sidebarRect = sidebarEl.getBoundingClientRect();
        const rowRect = clickedBtn?.getBoundingClientRect();
        const startY = rowRect ? rowRect.top - sidebarRect.top + rowRect.height / 2 - 14 : 80;

        const END_Y = measuredEndY;
        const BARS_SHIFT = measuredBarsShift;
        const DUR = 360;

        ghostFlagSrc = `https://flagicons.lipis.dev/flags/4x3/${entry.flagCode}.svg`;
        ghostName = entry.country.replace(/\s*\(.*?\)/g, '');
        ghostY = startY;
        ghostFlagWidth = 1.8;
        ghostFontSize = 1.1;
        ghostGap = 10;
        ghostPaddingTop = 12;
        ghostVisible = true;

        ghostBarLabel1 = 'Overseas bases';
        ghostBarVal1 = String(TOTAL_BASES);
        ghostBarLabel2 = 'Overseas troops';
        ghostBarVal2 = TOTAL_TROOPS.toLocaleString();
        ghostBarShift = 0;
        ghostBarsVisible = true;

        if (viewWrapperEl) viewWrapperEl.style.opacity = '0';
        await tick();

        let textSwapped = false;
        await new Promise<void>((resolve) => {
            let start: number | null = null;
            function frame(ts: number) {
                if (!start) start = ts;
                const t = Math.min(1, (ts - start) / DUR);
                const p = easeInOut(t);
                ghostY = startY + (END_Y - startY) * p;
                ghostFlagWidth = 1.8 + (3 - 1.8) * p;
                ghostFontSize = 1.1 + (1.2 - 1.1) * p;
                ghostGap = 10 + (12 - 10) * p;
                ghostPaddingTop = 12 + (15 - 12) * p;
                ghostBarShift = BARS_SHIFT * p;
                if (t > 0.5 && !textSwapped) {
                    textSwapped = true;
                    ghostBarLabel1 = 'Overseas bases';
                    ghostBarVal1 = String(entry.persistentBases);
                    ghostBarLabel2 = 'Overseas troops';
                    ghostBarVal2 = entry.troops.toLocaleString();
                }
                if (t < 1) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });

        $UGNclickedEntry = entry;
        $UGNglobeClicked = null;
        flyToEntry(entry);
        await tick();

        const detailFlagEl = sidebarEl.querySelector('.detailFlag');
        const detailBarEl = sidebarEl.querySelector('.statBar--bases');
        if (detailFlagEl && detailBarEl) {
            const sr = sidebarEl.getBoundingClientRect();
            measuredEndY = detailFlagEl.getBoundingClientRect().top - sr.top - 15;
            measuredBarsShift = detailBarEl.getBoundingClientRect().top - sr.top;
        }

        ghostVisible = false;
        ghostBarsVisible = false;
        if (viewWrapperEl) viewWrapperEl.style.removeProperty('opacity');
        animating = false;
    }

    async function animateBack() {
        if (animating || !lastEntry) {
            $UGNclickedEntry = null;
            $UGNhoveredEntry = null;
            $UGNglobeClicked = null;
            return;
        }
        animating = true;

        const detailFlagEl = sidebarEl.querySelector('.detailFlag');
        const detailBarEl = sidebarEl.querySelector('.statBar--bases');
        if (detailFlagEl && detailBarEl) {
            const sr = sidebarEl.getBoundingClientRect();
            measuredEndY = detailFlagEl.getBoundingClientRect().top - sr.top - 15;
            measuredBarsShift = detailBarEl.getBoundingClientRect().top - sr.top;
        }

        const BARS_SHIFT = measuredBarsShift;
        const DUR = 320;

        ghostVisible = false;

        ghostBarLabel1 = 'Overseas bases';
        ghostBarVal1 = String(lastEntry.persistentBases);
        ghostBarLabel2 = 'Overseas troops';
        ghostBarVal2 = lastEntry.troops.toLocaleString();
        ghostBarShift = BARS_SHIFT;
        ghostBarsVisible = true;

        if (viewWrapperEl) viewWrapperEl.style.opacity = '0';
        $UGNclickedEntry = null;
        $UGNhoveredEntry = null;
        $UGNglobeClicked = null;
        await tick();

        let textSwapped = false;
        await new Promise<void>((resolve) => {
            let start: number | null = null;
            function frame(ts: number) {
                if (!start) start = ts;
                const t = Math.min(1, (ts - start) / DUR);
                const p = easeInOut(t);
                ghostBarShift = BARS_SHIFT * (1 - p);
                if (t > 0.45 && !textSwapped) {
                    textSwapped = true;
                    ghostBarLabel1 = 'Overseas bases';
                    ghostBarVal1 = String(TOTAL_BASES);
                    ghostBarLabel2 = 'Overseas troops';
                    ghostBarVal2 = TOTAL_TROOPS.toLocaleString();
                }
                if (t < 1) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });

        ghostBarsVisible = false;
        if (viewWrapperEl) viewWrapperEl.style.removeProperty('opacity');
        animating = false;
    }

    function onRowClick(e: CountryEntry) {
        $UGNglobeClicked = null;
        if (get(UGNclickedEntry)?.id === e.id) {
            $UGNclickedEntry = null;
        } else {
            animateForward(e);
        }
    }

    function backToCountryList() {
        $UGNclickedEntry = null;
        $UGNhoveredEntry = null;
        $UGNglobeClicked = null;
    }
</script>
<svelte:head>
    <title>U.S. overseas persistent military bases</title>
    <meta
        name="description"
        content="Interactive globe of U.S. overseas persistent military bases: installation counts and permanently assigned personnel."
    />
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap"
    />
</svelte:head>

<div class="sidebarInner" bind:this={sidebarEl}>
    {#if ghostBarsVisible}
        <div class="ghostBars" style:transform="translateY({ghostBarShift}px)">
            <div class="statBar statBar--bases">
                <span>{ghostBarLabel1}</span><span>{ghostBarVal1}</span>
            </div>
            <div class="statBar statBar--troops">
                <span>{ghostBarLabel2}</span><span>{ghostBarVal2}</span>
            </div>
        </div>
    {/if}

    {#if ghostVisible}
        <div
            class="ghostHeader"
            style:top="{ghostY}px"
            style:transform="scale({ghostScale})"
            style:gap="{ghostGap}px"
            style:padding-top="{ghostPaddingTop}px"
        >
            <img class="ghostFlag" src={ghostFlagSrc} alt="" style:width="{ghostFlagWidth}rem" />
            <span class="ghostName" style:font-size="{ghostFontSize}rem">{ghostName}</span>
        </div>
    {/if}

    <div
        class="viewWrapper"
        bind:this={viewWrapperEl}
        style:pointer-events="{animating ? 'none' : 'auto'}"
    >
        {#if $UGNclickedEntry}
        {@const d = $UGNclickedEntry}
        <div class="detailView">
            <button type="button" class="back backBtn" on:click={animateBack}>
                <LeftArrow />
                <span>All Countries</span>
            </button>

            <div class="detailHeader">
                <img
                    class="detailFlag"
                    src={`https://flagicons.lipis.dev/flags/4x3/${d.flagCode}.svg`}
                    alt={d.country}
                />
                <h2 class="detailCountry">{d.country.replace(/\s*\(.*?\)/g, '')}</h2>
            </div>

            <div class="statBar statBar--bases">
                <span class="statLabel">Overseas bases</span>
                <span class="statValue">{d.persistentBases}</span>
            </div>
            <div class="statBar statBar--troops">
                <span class="statLabel">Overseas troops</span>
                <span class="statValue">{d.troops.toLocaleString()}</span>
            </div>

            <div class="detailListScroll">
                <div class="baseListHeader" aria-hidden="true">
                    <span>Base Name</span>
                    <span>Location</span>
                </div>
                <ul class="baseList">
                    {#each visibleBases as base (base.id)}
                        <li class="baseRow" in:fly={{ y: 10, duration: 280 }}>
                            <span class="baseName">{base.name}</span>
                            <span class="baseCity">{base.city}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    {:else}
        <div class="statBar statBar--bases">
            <span class="statLabel">Overseas bases</span>
            <span class="statValue">{TOTAL_BASES}</span>
        </div>
        <div class="statBar statBar--troops">
            <span class="statLabel">Overseas troops</span>
            <span class="statValue">{TOTAL_TROOPS.toLocaleString()}</span>
        </div>

        <div class="listScroll" bind:this={listContainer}>
            <ul class="rows">
                {#each visibleEntries as e (e.id)}
                    <li in:fly={{ y: 10, duration: 280 }}>
                        <button
                            type="button"
                            class="row"
                            data-entry-id={e.id}
                            class:hover={activeEntry?.id === e.id}
                            class:dim={activeEntry !== null && activeEntry.id !== e.id}
                            on:pointerenter={() => {
                                $UGNglobeClicked = null;
                                $UGNhoveredEntry = e;
                            }}
                            on:pointerleave={() => ($UGNhoveredEntry = null)}
                            on:click={() => onRowClick(e)}
                        >
                            <img
                                src={`https://flagicons.lipis.dev/flags/4x3/${e.flagCode}.svg`}
                                alt={e.country}
                                class="flag"
                            />
                            <span class="name">{e.country.replace(/\s*\(.*?\)/g, '')}</span>
                            <span class="badges">
                                <span class="badge badge--bases">{e.persistentBases}</span>
                                <span class="badge badge--troops">{e.troops.toLocaleString()}</span>
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .sidebarInner {
        position: relative;
    }

    .viewWrapper {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .ghostBars {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9;
        pointer-events: none;
    }

    .ghostHeader {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        gap: var(--_pad-md);
        padding: var(--_pad-lg) 0;
        z-index: 10;
        pointer-events: none;
        transform-origin: left center;
    }

    .ghostFlag {
        width: 1.8rem;
        height: auto;
        aspect-ratio: 4 / 3;
        flex-shrink: 0;
        display: block;
    }

    .ghostName {
        font-size: var(--_font-md);
        font-weight: 700;
        color: var(--_clr-900);
        white-space: nowrap;
        line-height: 1.1;
    }

    .sidebarInner {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
        min-height: 0;
        height: 100%;
    }

    .listScroll {
        flex: 1 1 0%;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .detailView {
        display: flex;
        flex-direction: column;
        flex: 1 1 0%;
        min-height: 0;
        width: 100%;
        overflow: hidden;
    }

    .detailListScroll {
        flex: 1 1 0%;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    /* Matches uganglobe `[slug]/+page.svelte` `.back` (flex, icon, type) ù no pill background here. */
    .detailView .back.backBtn {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        gap: var(--_pad-sm);
        width: 100%;
        margin: 0;
        padding: var(--_pad-lg) 0;
        text-align: left;
        font: inherit;
        font-size: var(--_font-sm);
        font-weight: 600;
        color: var(--_clr-700);
        background: none;
        border: none;
        border-radius: 0;
        cursor: pointer;
        transition: color var(--_trans-fast);

        :global(.icon) {
            display: block;
            width: 15px;
            height: 14px;
            flex-shrink: 0;
        }

        &:hover {
            color: var(--_clr-900);
        }

        &:focus,
        &:active {
            color: var(--_clr-1000);
        }

        &:focus-visible {
            outline: var(--_focus-outline);
            outline-offset: calc(-1 * var(--_focus-outline-width));
        }
    }

    .detailHeader {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        gap: var(--_pad-lg);
        padding: var(--_pad-xl) 0;
    }

    .detailFlag {
        width: 3rem;
        flex-shrink: 0;
        border-radius: 0;
    }

    .detailCountry {
        margin: 0;
        font-family: 'Manrope', sans-serif;
        font-size: var(--_font-lg);
        font-weight: 700;
        color: var(--_clr-900);
        line-height: 1.1;
    }

    .baseListHeader {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--_pad-md);
        margin-top: var(--_pad-xl);
        padding: 0 0 var(--_pad-sm);
        font-size: var(--_font-sm);
        color: var(--_clr-600);
    }

    .baseListHeader span:first-child {
        flex: 1;
        min-width: 0;
    }

    .baseListHeader span:last-child {
        text-align: right;
    }

    .baseList {
        list-style: none;
        margin: 0;
        padding: 0 0 var(--_pad-4xl);
    }

    .baseRow {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--_pad-md);
        padding: var(--_pad-lg) 0;
        border-bottom: 1px solid var(--_clr-200);
        font-size: var(--_font-sm);
    }

    .baseName {
        flex: 1;
        font-weight: 700;
        color: var(--_clr-900);
        min-width: 0;
    }

    .baseCity {
        flex: 0 1 auto;
        color: var(--_clr-600);
        text-align: right;
        min-width: 0;
    }

    .statBar {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        box-sizing: border-box;

        color: var(--_clr-0);
        font-size: var(--_font-sm);
        font-weight: 600;

        padding: var(--_pad-lg) var(--_pad-xl);
        margin-bottom: var(--_pad-md);
    }

    .statBar--bases {
        background-color: #bd2147;
    }

    .statBar--troops {
        background-color: #2563eb;
        margin-bottom: var(--_pad-lg);
    }

    .detailView .statBar--troops {
        margin-bottom: 0;
    }

    .statLabel {
        font-weight: 600;
    }

    .statValue {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
    }

    .rows {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--_pad-4xl);

        .row {
            display: flex;
            flex-flow: row nowrap;
            align-items: center;
            gap: var(--_pad-md);
            width: 100%;
            text-align: left;

            color: var(--_clr-800);
            font: inherit;

            padding: var(--_pad-lg) 0;
            border: none;
            border-bottom: solid 1px var(--_clr-200);
            background: transparent;
            cursor: pointer;

            transition:
                color var(--_trans-fast),
                opacity var(--_trans-normal),
                border-color var(--_trans-fast);

            &:hover,
            &.hover,
            &:focus {
                color: var(--_clr-1000);
                border-color: var(--_clr-500);
            }

            &:focus-visible {
                outline: var(--_focus-outline);
            }

            &.dim {
                opacity: 0.55;
            }

            .flag {
                width: 1.8rem;
                flex-shrink: 0;
            }

            .name {
                flex: 1;
                font-size: var(--_font-md);
                font-weight: 700;
                line-height: 1.15em;
                min-width: 0;
            }

            .badges {
                display: flex;
                flex-flow: row nowrap;
                align-items: center;
                gap: var(--_pad-md);
                flex-shrink: 0;
            }

            .badge {
                color: var(--_clr-0);
                font-size: var(--_font-sm);
                font-weight: 400;
                padding: 0 var(--_pad-sm);
                white-space: nowrap;
            }

            .badge--bases {
                width: 3.8rem;
                text-align: center;
                border-radius: 0;
                box-sizing: border-box;
                display: inline-block;
                background-color: #bd2147;
            }

            .badge--troops {
                width: 3.8rem;
                text-align: center;
                border-radius: 0;
                box-sizing: border-box;
                display: inline-block;
                background-color: #2563eb;
            }
        }
    }
</style>
