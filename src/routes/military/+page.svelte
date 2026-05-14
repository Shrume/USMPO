<script lang="ts">
    import { tick } from 'svelte';
    import { get } from 'svelte/store';
    import {
        UGNglobe,
        UGNaltOffset,
        UGNhoveredEntry,
        UGNclickedEntry,
        UGNglobeClicked
    } from '../../store/military-store';
    import { ENTRIES, TOTAL_BASES, TOTAL_TROOPS } from './data';
    import type { CountryEntry } from './data';
    import LeftArrow from '$lib/SVGs/UGN-leftArrow.svelte';

    $: activeEntry = $UGNhoveredEntry ?? $UGNclickedEntry;

    $: sortedEntries = [...ENTRIES].sort((a, b) => b.persistentBases - a.persistentBases);

    let listContainer: HTMLDivElement;

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

    function onRowClick(e: CountryEntry) {
        $UGNglobeClicked = null;
        if (get(UGNclickedEntry)?.id === e.id) {
            $UGNclickedEntry = null;
        } else {
            $UGNclickedEntry = e;
            flyToEntry(e);
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

<div class="sidebarInner">
    {#if $UGNclickedEntry}
        {@const d = $UGNclickedEntry}
        <div class="detailView">
            <button type="button" class="back backBtn" on:click={backToCountryList}>
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
                <span>US Bases</span>
                <span>{d.persistentBases}</span>
            </div>
            <div class="statBar statBar--troops">
                <span>US Personnel</span>
                <span>{d.troops.toLocaleString()}</span>
            </div>

            <div class="detailListScroll">
                <div class="baseListHeader" aria-hidden="true">
                    <span>Base Name</span>
                    <span>Location</span>
                </div>
                <ul class="baseList">
                    {#each d.bases as base (base.id)}
                        <li class="baseRow">
                            <span class="baseName">{base.name}</span>
                            <span class="baseCity">{base.city}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    {:else}
        <div class="statBar statBar--bases">
            <span class="statLabel">Persistent bases</span>
            <span class="statValue">{TOTAL_BASES}</span>
        </div>
        <div class="statBar statBar--troops">
            <span class="statLabel">Troops (DMDC)</span>
            <span class="statValue">{TOTAL_TROOPS.toLocaleString()}</span>
        </div>

        <div class="listScroll" bind:this={listContainer}>
            <ul class="rows">
                {#each sortedEntries as e (e.id)}
                    <li>
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

<style lang="scss">
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

    /* Matches uganglobe `[slug]/+page.svelte` `.back` (flex, icon, type) � no pill background here. */
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
        font-family: 'Montserrat', sans-serif;
        font-size: var(--_font-lg);
        font-weight: 700;
        color: var(--_clr-900);
        line-height: 1.1;
    }

    .detailView .statBar {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        box-sizing: border-box;
        padding: var(--_pad-lg) var(--_pad-xl);
        margin-bottom: var(--_pad-sm);
        color: var(--_clr-0);
        font-size: var(--_font-sm);
        font-weight: 600;
    }

    .detailView .statBar--bases {
        background: #bd2147;
    }

    .detailView .statBar--troops {
        background: #2563eb;
        margin-bottom: 0;
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

        padding: var(--_pad-md) var(--_pad-lg);
        margin-bottom: var(--_pad-sm);
    }

    .statBar--bases {
        background-color: #bd2147;
    }

    .statBar--troops {
        background-color: #2563eb;
        margin-bottom: var(--_pad-lg);
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
                gap: var(--_pad-sm);
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
