<script lang="ts">
    import { MeshBasicMaterial } from 'three';
    import Globe from 'globe.gl';
    import { onMount, tick } from 'svelte';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import {
        UGNglobe,
        UGNhoveredEntry,
        UGNclickedEntry,
        UGNglobeClicked,
        UGNaltOffset,
        UGNgoHome,
        UGNgotoEntry
    } from '../store/military-store';
    import type { CountryEntry } from '../routes/military/data';
    import countries from '$lib/globe-countries.json';
    import Plus from '$lib/SVGs/UGN-plus.svelte';
    import Minus from '$lib/SVGs/UGN-minus.svelte';
    import UpIndicactor from '$lib/SVGs/UGN-upIndicactor.svelte';
    import Info from '$lib/SVGs/UGN-info.svelte';
    import Close from '$lib/SVGs/UGN-close.svelte';

    export let entries: CountryEntry[];
    export let origin: { lat: number; lng: number };

    let globeContainer: HTMLElement;
    let globeViz: HTMLElement;
    let controlsEl: HTMLElement;
    let scrollToTopObserver: HTMLElement;

    let curAlt = 0;
    let aboutOpen = false;
    let canInteract = false;
    let globeMoved = false;
    let isResetting = false;

    $: globeInteracted = $UGNclickedEntry !== null || (canInteract && curAlt < 2.0);

    let animRAF: number | null = null;
    let animStart: number | null = null;
    const ANIM_STAGGER = 0; // ms between each arc starting
    const ANIM_DURATION = 1300; // ms for each arc to fully draw

    let entriesByFlagCode: Map<string, CountryEntry> = new Map();

    /** three-globe default when `polygonAltitude` is not set in the init chain */
    const POLYGON_BASE_ALTITUDE = 0.01;

    $: if ($UGNglobe) $UGNglobe.arcsData(entries);
    $: entriesByFlagCode = new Map(entries.map((e) => [e.flagCode, e]));

    $: activeEntry = $UGNhoveredEntry ?? $UGNclickedEntry;

    $: if ($UGNglobe) {
        $UGNglobe.arcColor((arc: any) => getArcColorForHover(arc as CountryEntry, activeEntry));
        $UGNglobe.polygonCapColor((feature: any) =>
            getPolygonCapColor(feature as CountryPolygonFeature, activeEntry)
        );
    }

    /** Match globe.gl size to the mount box (same box as the visible canvas). */
    function globeLayoutSize(): { w: number; h: number } {
        const r = globeViz?.getBoundingClientRect();
        return {
            w: Math.max(1, Math.round(r?.width ?? 1)),
            h: Math.max(1, Math.round(r?.height ?? 1))
        };
    }

    function resizeGlobe() {
        if (!browser || !$UGNglobe || !globeViz) return;

        const { w, h } = globeLayoutSize();
        $UGNglobe.width(w).height(h);
    }

    function hexToRgba(hex: string, alpha: number): string {
        const h = hex.replace('#', '');
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getArcColorForHover(arc: CountryEntry, active: CountryEntry | null): string {
        if (!active) return arc.color;
        return arc.flagCode === active.flagCode ? arc.color : hexToRgba(arc.color, 0.25);
    }

    type CountryPolygonFeature = { properties?: { ISO_A2?: string } };

    function getPolygonCapColor(feature: CountryPolygonFeature, active: CountryEntry | null): string {
        const iso = feature.properties?.ISO_A2?.toLowerCase();
        if (!iso) return '#d1d1d1';
        if (active && iso === active.flagCode) return active.color;
        return '#d1d1d1';
    }

    /** Same angular distance as d3-geo `geoDistance` for [lng, lat] in radians (unit sphere). */
    function geoDistanceRadians(a: [number, number], b: [number, number]): number {
        const [l0, p0] = a;
        const [l1, p1] = b;
        return (
            2 *
            Math.asin(
                Math.sqrt(
                    Math.sin((p1 - p0) / 2) ** 2 +
                        Math.cos(p0) * Math.cos(p1) * Math.sin((l1 - l0) / 2) ** 2
                )
            )
        );
    }

    function getPolygonAltitude(): number {
        return POLYGON_BASE_ALTITUDE;
    }

    function fanOrigin(orig: { lat: number; lng: number }, dest: { lat: number; lng: number }, radiusDeg = 1) {
        const oLat = orig.lat * Math.PI / 180;
        const oLng = orig.lng * Math.PI / 180;
        const dLat = dest.lat * Math.PI / 180;
        const dLng = dest.lng * Math.PI / 180;
        const bearing = Math.atan2(
            Math.sin(dLng - oLng) * Math.cos(dLat),
            Math.cos(oLat) * Math.sin(dLat) - Math.sin(oLat) * Math.cos(dLat) * Math.cos(dLng - oLng)
        );
        return {
            lat: orig.lat + radiusDeg * Math.cos(bearing),
            lng: orig.lng + radiusDeg * Math.sin(bearing)
        };
    }

    function easeOut(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    function startArcAnimation() {
        if (!$UGNglobe) return;
        if (animRAF) cancelAnimationFrame(animRAF);

        const sorted = [...entries]
            .map((e) => ({
                e,
                dist: Math.hypot(e.lat - origin.lat, e.lng - origin.lng)
            }))
            .sort((a, b) => a.dist - b.dist)
            .map(({ e }, i) => ({ e, delay: i * ANIM_STAGGER }));

        const progressMap = new Map<string, number>(entries.map((e) => [e.id, 0]));

        animStart = null;

        function frame(ts: number) {
            if (!animStart) animStart = ts;
            const elapsed = ts - animStart;
            let allDone = true;

            sorted.forEach(({ e, delay }) => {
                const t = Math.max(0, Math.min(1, (elapsed - delay) / ANIM_DURATION));
                const p = easeOut(t);
                progressMap.set(e.id, p);
                if (t < 1) allDone = false;
            });

            if ($UGNglobe) {
                $UGNglobe
                    .arcDashLength((arc: any) => progressMap.get((arc as CountryEntry).id) ?? 0)
                    .arcDashGap(2)
                    .arcDashInitialGap((arc: any) => {
                        const p = progressMap.get((arc as CountryEntry).id) ?? 0;
                        return 1 - p;
                    })
                    .arcDashAnimateTime(0);
            }

            if (!allDone) {
                animRAF = requestAnimationFrame(frame);
            } else {
                // Freeze solid
                if ($UGNglobe) {
                    $UGNglobe
                        .arcDashLength(1)
                        .arcDashGap(0)
                        .arcDashInitialGap(0)
                        .arcDashAnimateTime(0);
                }
                animRAF = null;
            }
        }

        animRAF = requestAnimationFrame(frame);
    }

    $: rankMap = (() => {
        const orig = origin;
        function bearing(dest: CountryEntry) {
            const oLat = orig.lat * Math.PI / 180;
            const oLng = orig.lng * Math.PI / 180;
            const dLat = dest.lat * Math.PI / 180;
            const dLng = dest.lng * Math.PI / 180;
            return Math.atan2(
                Math.sin(dLng - oLng) * Math.cos(dLat),
                Math.cos(oLat) * Math.sin(dLat) - Math.sin(oLat) * Math.cos(dLat) * Math.cos(dLng - oLng)
            );
        }
        const sorted = [...entries].map((e) => ({ e, b: bearing(e) })).sort((a, b) => a.b - b.b);
        const m = new Map<string, number>();
        sorted.forEach(({ e }, i) => m.set(e.id, i));
        return m;
    })();

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
        globeMoved = true;
    }

    function zoom(type: 'in' | 'out'): void {
        if (!$UGNglobe) return;

        const altChange = type === 'in' ? -0.3 : 0.3;
        $UGNglobe.pointOfView({ altitude: curAlt + altChange }, 200);
    }

    function resetView(): void {
        if ($UGNglobe) $UGNglobe.pointOfView({ lat: 30, lng: -60, altitude: 2.2 }, 700);
        UGNgoHome.update((n) => n + 1);
        globeMoved = false;
        isResetting = true;
        setTimeout(() => {
            isResetting = false;
        }, 750);
    }

    /** globe.gl ignores raycast misses (`if (!obj) return`) so `onGlobeClick` never runs for empty canvas. */
    let suppressGlobeVizBackdropClear = false;

    function beginGlobeOverlayClick(): void {
        suppressGlobeVizBackdropClear = true;
        queueMicrotask(() => {
            suppressGlobeVizBackdropClear = false;
        });
    }

    function clearSelectionStores(): void {
        $UGNclickedEntry = null;
        $UGNhoveredEntry = null;
        $UGNglobeClicked = null;
    }

    $: if (browser && $UGNglobe && globeViz) {
        queueMicrotask(() => resizeGlobe());
    }

    function handleGlobeVizBackdropClick(): void {
        if (suppressGlobeVizBackdropClear) return;
        clearSelectionStores();
    }

    onMount(async () => {
        await tick();
        const { w: w0, h: h0 } = globeLayoutSize();

        $UGNglobe = Globe()
            .width(w0)
            .height(h0)
            .backgroundColor('#ffffff')
            .globeMaterial(new MeshBasicMaterial({ color: '#f2f2f2' }))
            .showAtmosphere(false)
            .onGlobeReady(() => {
                setTimeout(() => startArcAnimation(), 800);
                setTimeout(() => {
                    canInteract = true;
                    $UGNglobe?.controls().addEventListener('start', () => {
                        if (!isResetting) globeMoved = true;
                    });
                }, 800 + 1200 + 400);
            })
            .polygonsData(countries.features)
            .polygonCapColor((feature: any) =>
                getPolygonCapColor(feature as CountryPolygonFeature, null)
            )
            .polygonSideColor(() => '#a3a3a3')
            .polygonStrokeColor(() => '#a3a3a3')
            .polygonAltitude(() => getPolygonAltitude())
            .onPolygonHover((feature: any) => {
                if (feature === null) {
                    $UGNhoveredEntry = null;
                    $UGNglobeClicked = null;
                    return;
                }
                const iso = (feature as CountryPolygonFeature).properties?.ISO_A2?.toLowerCase();
                const entry = iso ? entriesByFlagCode.get(iso) ?? null : null;
                $UGNhoveredEntry = entry;
                $UGNglobeClicked = entry;
            })
            .onPolygonClick((feature: any) => {
                beginGlobeOverlayClick();
                const iso = (feature as CountryPolygonFeature | null)?.properties?.ISO_A2?.toLowerCase();
                const entry = iso ? entriesByFlagCode.get(iso) ?? null : null;
                if (!entry) {
                    clearSelectionStores();
                    return;
                }
                const cur = get(UGNclickedEntry);
                if (cur?.id === entry.id) {
                    UGNgoHome.update((n) => n + 1);
                    $UGNglobeClicked = null;
                } else {
                    $UGNgotoEntry = entry;
                    $UGNglobeClicked = entry;
                    flyToEntry(entry);
                }
            })
            .arcStartLat((arc: any) => fanOrigin(origin, arc as CountryEntry).lat)
            .arcStartLng((arc: any) => fanOrigin(origin, arc as CountryEntry).lng)
            .arcEndLat((arc: any) => (arc as CountryEntry).lat)
            .arcEndLng((arc: any) => (arc as CountryEntry).lng)
            .arcAltitude((arc: any) => {
                const e = arc as CountryEntry;
                const fo = fanOrigin(origin, e);
                const startLng = (fo.lng * Math.PI) / 180;
                const startLat = (fo.lat * Math.PI) / 180;
                const endLng = (e.lng * Math.PI) / 180;
                const endLat = (e.lat * Math.PI) / 180;
                const altAutoScale = 0.5;
                const baseAlt = (geoDistanceRadians([startLng, startLat], [endLng, endLat]) / 2) * altAutoScale;
                const rank = rankMap.get(e.id) ?? 0;
                const n = entries.length;
                return baseAlt + (n ? (rank / n) * 0.15 : 0);
            })
            .arcLabel(
                (arc: any) => {
                    const e = arc as CountryEntry;
                    return `<div style="font-family:'Manrope',sans-serif; display:inline-flex; flex-direction:column; gap:8px; padding:10px 10px; background:#fff; border-radius:0; border:1px solid rgba(0,0,0,0.1); box-shadow:0 1px 4px rgba(0,0,0,0.12); white-space:nowrap">
  <div style="display:flex; align-items:center; gap:6px">
    <img src="https://flagicons.lipis.dev/flags/4x3/${e.flagCode}.svg" alt="" style="width:16px; height:12px; object-fit:cover; flex-shrink:0" />
    <span style="font-weight:700; font-size:12px; color:#1a1a1a">${e.country.replace(/\s*\(.*?\)/g, '')}</span>
  </div>
  <div style="display:flex; gap:8px">
    <span style="background:#bd2147; color:#fff; padding:1px 0; font-size:12px; line-height:1.4; font-weight:600; width:3.5rem; text-align:center; display:inline-block">${e.persistentBases}</span>
    <span style="background:#2563eb; color:#fff; padding:1px 0; font-size:12px; line-height:1.4; font-weight:600; width:3.5rem; text-align:center; display:inline-block">${e.troops.toLocaleString()}</span>
  </div>
</div>`;
                }
            )
            .arcStroke(0.8)
            .arcDashLength(0)
            .arcDashGap(1)
            .arcDashInitialGap(0)
            .arcDashAnimateTime(0)
            .arcCurveResolution(32)
            .arcsTransitionDuration(0)
            .arcColor((arc: any) => getArcColorForHover(arc as CountryEntry, null))
            .onArcHover((arc: any) => {
                const a = arc as CountryEntry | null;
                $UGNhoveredEntry = a;
                $UGNglobeClicked = a;
            })
            .onArcClick((arc: any) => {
                beginGlobeOverlayClick();
                const e = arc as CountryEntry;
                const cur = get(UGNclickedEntry);
                if (cur?.id === e.id) {
                    UGNgoHome.update((n) => n + 1);
                    $UGNglobeClicked = null;
                } else {
                    $UGNgotoEntry = e;
                    $UGNglobeClicked = e;
                    flyToEntry(e);
                }
            })
            .onGlobeClick(() => {
                clearSelectionStores();
            })(globeViz);

        if ($UGNglobe) {
            $UGNglobe.arcsData(entries);
            $UGNglobe.pointOfView({ lat: 30, lng: -60, altitude: 2.2 }, 0);
            curAlt = 2.2;
        }

        const { w: cw, h: ch } = globeLayoutSize();
        if (cw <= ch) $UGNaltOffset = 0.6;

        $UGNglobe.onZoom((pov) => {
            curAlt = pov.altitude;
            if (canInteract) {
                globeInteracted = $UGNclickedEntry !== null || curAlt < 2.0;
                if (!isResetting) globeMoved = true;
            }
        });

        const intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                globeContainer.classList.toggle('offScreen', entry.isIntersecting);
            });
        }, { rootMargin: '0px 0px -100% 0px' });

        intersectionObserver.observe(scrollToTopObserver);

        const resizeObserver = new ResizeObserver(() => resizeGlobe());
        resizeObserver.observe(globeContainer);

        return () => {
            if (animRAF) cancelAnimationFrame(animRAF);
            intersectionObserver.unobserve(scrollToTopObserver);
            resizeObserver.unobserve(globeContainer);
            const g = get(UGNglobe);
            if (g) {
                g._destructor();
            }
            $UGNglobe = null;
            $UGNglobeClicked = null;
        };
    });
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=my_location"
    />
</svelte:head>

<div class="globeContainer" tabindex="-1" bind:this={globeContainer}>
    <div
        id="globeViz-military"
        class="globeVizMount"
        bind:this={globeViz}
        on:click={handleGlobeVizBackdropClick}
    ></div>
    <div class="globeProjectTitleClip">
        <div
            class="globeProjectTitle"
            style:transform={globeInteracted ? 'translateY(-100%)' : 'translateY(0)'}
        >
            <h1 class="projectTitle" aria-label="US Military Projection Overseas">
                <img
                    class="flag"
                    src="https://flagicons.lipis.dev/flags/4x3/us.svg"
                    alt=""
                    aria-hidden="true"
                />
                <span class="projectTitleText">Military Projection Overseas</span>
            </h1>
        </div>
    </div>
    <div class="controls" bind:this={controlsEl}>
        {#if globeMoved}
            <button class="zoom zoomHome" type="button" on:click={resetView}>
                <span class="visuallyHidden">reset view</span>
                <span class="myLocationIcon" aria-hidden="true">my_location</span>
            </button>
        {/if}
        <button
            class="zoom"
            type="button"
            disabled={curAlt <= 0.5}
            on:click={() => zoom('in')}
        >
            <span class="visuallyHidden">zoom in</span>
            <Plus />
        </button>
        <button
            class="zoom"
            type="button"
            disabled={curAlt >= 4}
            on:click={() => zoom('out')}
        >
            <span class="visuallyHidden">zoom out</span>
            <Minus />
        </button>
    </div>

    <div class="aboutWrap">
        {#if aboutOpen}
            <div class="aboutPanel">
                <p>Data sourced from the <a href="https://dwp.dmdc.osd.mil/dwp/app/main" target="_blank" rel="noopener">Defense Manpower Data Center (DMDC)</a> and the <a href="https://crsreports.congress.gov/product/pdf/R/R48123" target="_blank" rel="noopener">Congressional Research Service Report R48123</a>.</p>
                <p>Inspired by and built on the work of <a href="https://www.richardfxr.com/" target="_blank" rel="noopener">Richard Fu</a>. Designed and developed by <a href="https://shrumezuo.com/" target="_blank" rel="noopener">Shrume Zuo</a>. <a href="https://www.khronos.org/webgl/" target="_blank" rel="noopener">WebGL</a> globe powered by <a href="https://globe.gl/" target="_blank" rel="noopener">globe.gl</a>.</p>
                <p>A term project for <em>Propaganda</em> at RISD, taught by <a href="https://www.risd.edu/academics/history-philosophy-and-social-sciences/faculty/tom-roberts" target="_blank" rel="noopener">Tom Roberts</a> in his final semester after 43 years of teaching.</p>
            </div>
        {/if}
        <button class="zoom" type="button" on:click={() => (aboutOpen = !aboutOpen)}>
            <span class="visuallyHidden">{aboutOpen ? 'close about' : 'about this project'}</span>
            <span class="aboutIcon">
                {#if aboutOpen}
                    <Close />
                {:else}
                    <Info />
                {/if}
            </span>
        </button>
    </div>

    <div class="scrollToTop-observer" bind:this={scrollToTopObserver}></div>
    <button
        class="scrollToTop"
        type="button"
        tabindex="-1"
        on:click={() => {
            globeContainer.focus();
            setTimeout(function () {
                window.scrollTo(0, 0);
            }, 2);
        }}
    >
        <span class="visuallyHidden">back to top</span>
        <UpIndicactor />
    </button>
</div>

<style lang="scss">
    :global {
        body {
            --_scrollToTop-height: calc(2 * var(--_pad-xl) + 15px);
        }
    }

    .globeContainer {
        position: sticky;
        top: var(--_pad-border);
        /* Top / left / bottom gutter; flush to the sidebar on the right (no column gap). */
        width: calc(100% - var(--_pad-border));
        height: calc(100vh - 2 * var(--_pad-border));
        margin: var(--_pad-border) 0 0 var(--_pad-border);
        padding: 0;
        box-sizing: border-box;
        background-color: #ffffff;
        border-radius: 0;
        /* Clip WebGL under the mount only; overlays (title, controls) stay visible. */
        overflow: visible;
    }
    .globeVizMount {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
    }

    .globeProjectTitleClip {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        overflow: hidden;
    }

    .globeProjectTitle {
        z-index: 1;
        pointer-events: none;
        box-sizing: border-box;
        transition: transform 0.35s ease;
    }

    /* Match `.statBar` / `.statBar--bases` in `military/+page.svelte` (padding, type scale, weight). */
    .projectTitle {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        gap: var(--_pad-md);
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        padding: var(--_pad-md) var(--_pad-lg);
        background-color: #2d3436;
        color: var(--_clr-0);
        font-size: var(--_font-sm);
        font-weight: 600;
    }

    .projectTitle .flag {
        width: 1.8rem;
        height: auto;
        aspect-ratio: 4 / 3;
        flex-shrink: 0;
        display: block;
    }

    .projectTitleText {
        flex-shrink: 0;
        font-family: 'Manrope', sans-serif;
        font-weight: 600;
        color: inherit;
        white-space: nowrap;
    }

    .controls {
        display: flex;
        flex-flow: column nowrap;
        align-items: flex-end;
        gap: 0;
        position: absolute;
        bottom: var(--_pad-border);
        right: var(--_pad-border);
        z-index: 2;

        /* Transparent wrapper so flex `gap` shows the WebGL canvas, not the tile gray. */
        background: transparent;

        .zoom {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--_clr-800);
            position: relative;
            width: 44px;
            height: 44px;
            padding: 0;
            background-color: var(--_clr-100);
            border: none;
            border-radius: 0;
            cursor: pointer;
            font: inherit;

            transition:
                color var(--_trans-fast),
                background-color var(--_trans-fast);

            :global(.icon) {
                display: block;
                width: 15px;
            }

            &:hover,
            &:focus {
                color: var(--_clr-900);
                background-color: var(--_clr-150);
            }

            &:focus-visible {
                outline-offset: calc(-1 * var(--_focus-outline-width));
                outline: var(--_focus-outline);
                z-index: 50;
            }

            &:active {
                color: var(--_clr-1000);
                background-color: var(--_clr-300);
            }

            &:disabled {
                cursor: not-allowed;
                color: var(--_clr-400);
                background-color: var(--_clr-100);
            }
        }
    }

    .zoomHome {
        margin-bottom: var(--_pad-md);
    }

    .myLocationIcon {
        font-family: 'Material Symbols Outlined';
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        font-size: 20px;
        line-height: 1;
        display: block;
        color: inherit;
    }

    .aboutWrap {
        position: absolute;
        bottom: var(--_pad-border);
        left: var(--_pad-border);
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
    }

    .aboutWrap .zoom {
        width: 44px;
        height: 44px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--_clr-800);
        background-color: var(--_clr-100);
        border: none;
        border-radius: 0;
        cursor: pointer;
        font: inherit;
        transition:
            color var(--_trans-fast),
            background-color var(--_trans-fast);

        :global(.icon) {
            display: block;
            width: 20px;
        }

        &:hover,
        &:focus {
            color: var(--_clr-900);
            background-color: var(--_clr-150);
        }

        &:focus-visible {
            outline-offset: calc(-1 * var(--_focus-outline-width));
            outline: var(--_focus-outline);
            z-index: 50;
        }

        &:active {
            color: var(--_clr-1000);
            background-color: var(--_clr-300);
        }
    }

    .aboutIcon {
        display: flex;
        align-items: center;
        justify-content: center;

        :global(.icon) {
            display: block;
            width: 15px;
        }
    }

    .aboutPanel {
        background: var(--_clr-50);
        border-radius: 0;
        padding: var(--_pad-border);
        margin-bottom: var(--_pad-md);
        font-size: var(--_font-sm);
        color: var(--_clr-800);
        max-width: 480px;
        line-height: 1.6;

        p {
            margin: 0 0 var(--_pad-lg);

            &:last-child {
                margin-bottom: 0;
            }
        }

        a {
            color: inherit;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
    }

    .scrollToTop-observer {
        display: none;
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;

        height: var(--_scrollToTop-height);
    }

    :global {
        .scrollToTop {
            display: none;
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            color: var(--_clr-700);

            padding: var(--_pad-xl);
            background-color: var(--_clr-0);

            transition:
                color var(--_trans-fast),
                background-color var(--_trans-fast),
                transform var(--_trans-fast);

            .icon {
                display: block;
                width: 15px;
            }
        }
    }

    @media (max-width: $UGNbp-tablet) and (orientation: portrait), (max-width: $UGNbp-mobile) {
        .globeContainer {
            --_height: 120vw;

            position: sticky;
            top: calc(-1 * var(--_height) + var(--_scrollToTop-height));
            width: calc(100% - var(--_pad-border));
            height: var(--_height);

            margin:
                calc(var(--_pad-border) / 2)
                calc(var(--_pad-border) / 2)
                calc(-1 * var(--_scrollToTop-height))
                calc(var(--_pad-border) / 2);
            background-color: #ffffff;
            border-radius: 0;
            overflow: hidden;
        }

        .scrollToTop-observer {
            display: block;
        }

        .controls {
            bottom: calc(var(--_pad-border) + var(--_scrollToTop-height));
        }

        :global {
            .scrollToTop {
                display: flex;
                justify-content: center;
                transform: translateY(var(--_scrollToTop-height));
            }

            .offScreen .scrollToTop {
                transform: translateY(0px);
            }
        }
    }
</style>
