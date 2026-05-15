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
        UGNaltOffset
    } from '../store/military-store';
    import type { CountryEntry } from '../routes/military/data';
    import countries from '$lib/globe-countries.json';
    import Plus from '$lib/SVGs/UGN-plus.svelte';
    import Minus from '$lib/SVGs/UGN-minus.svelte';
    import UpIndicactor from '$lib/SVGs/UGN-upIndicactor.svelte';
    import EnterFullscreen from '$lib/SVGs/UGN-enterFullscreen.svelte';
    import ExitFullscreen from '$lib/SVGs/UGN-exitFullscreen.svelte';

    export let entries: CountryEntry[];
    export let origin: { lat: number; lng: number };

    let globeContainer: HTMLElement;
    let globeViz: HTMLElement;
    let controlsEl: HTMLElement;
    let scrollToTopObserver: HTMLElement;

    let curAlt = 0;
    let allowFullscreen = false;
    let isFullscreen = false;

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
    }

    function zoom(type: 'in' | 'out'): void {
        if (!$UGNglobe) return;

        const altChange = type === 'in' ? -0.3 : 0.3;
        $UGNglobe.pointOfView({ altitude: curAlt + altChange }, 200);
    }

    function checkFullscreen(): void {
        const d = document as Document & Record<string, unknown>;
        isFullscreen = !!(
            document.fullscreenElement ||
            d.mozFullScreenElement ||
            d.webkitFullscreenElement ||
            d.msFullscreenElement
        );
    }

    function toggleFullscreen(): void {
        if (!allowFullscreen) return;

        const doc = document as Document & Record<string, (...args: unknown[]) => unknown>;
        const docEl = document.documentElement as HTMLElement & Record<string, (...args: unknown[]) => unknown>;

        if (isFullscreen) {
            const cancelFullScreen =
                doc.exitFullscreen ||
                doc.mozCancelFullScreen ||
                doc.webkitExitFullscreen ||
                doc.msExitFullscreen;
            (cancelFullScreen as () => void).call(document);
            isFullscreen = false;
        } else {
            const requestFullScreen =
                docEl.requestFullscreen ||
                docEl.mozRequestFullScreen ||
                docEl.webkitRequestFullScreen ||
                docEl.msRequestFullscreen;
            (requestFullScreen as () => void).call(docEl);
            isFullscreen = true;
        }
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
                    $UGNclickedEntry = null;
                    $UGNglobeClicked = null;
                } else {
                    $UGNclickedEntry = entry;
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
                    return `<div style="font-family:'Manrope',sans-serif; display:inline-flex; flex-direction:column; gap:4px; padding:8px 10px; background:#fff; border-radius:0; border:1px solid rgba(0,0,0,0.1); box-shadow:0 1px 4px rgba(0,0,0,0.12); white-space:nowrap">
  <div style="display:flex; align-items:center; gap:6px">
    <img src="https://flagicons.lipis.dev/flags/4x3/${e.flagCode}.svg" alt="" style="width:16px; height:12px; object-fit:cover; flex-shrink:0" />
    <span style="font-weight:700; font-size:12px; color:#1a1a1a">${e.country.replace(/\s*\(.*?\)/g, '')}</span>
  </div>
  <div style="display:flex; gap:4px">
    <span style="background:#1a1a1a; color:#fff; padding:1px 0; font-size:12px; line-height:1.4; font-weight:600; width:3.5rem; text-align:center; display:inline-block">${e.persistentBases}</span>
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
                    $UGNclickedEntry = null;
                    $UGNglobeClicked = null;
                } else {
                    $UGNclickedEntry = e;
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

        $UGNglobe.onZoom((pov) => (curAlt = pov.altitude));

        const intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                globeContainer.classList.toggle('offScreen', entry.isIntersecting);
            });
        }, { rootMargin: '0px 0px -100% 0px' });

        intersectionObserver.observe(scrollToTopObserver);

        const resizeObserver = new ResizeObserver(() => resizeGlobe());
        resizeObserver.observe(globeContainer);

        allowFullscreen = !!document.fullscreenEnabled;
        checkFullscreen();

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

<div class="globeContainer" tabindex="-1" bind:this={globeContainer}>
    <div
        id="globeViz-military"
        class="globeVizMount"
        bind:this={globeViz}
        on:click={handleGlobeVizBackdropClick}
    ></div>
    {#if !$UGNclickedEntry}
        <div class="globeProjectTitle">
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
    {/if}
    <div class="controls" bind:this={controlsEl}>
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
        <button
            class="fullscreen"
            type="button"
            on:click={toggleFullscreen}
            disabled={!allowFullscreen}
        >
            {#if isFullscreen}
                <span class="visuallyHidden">exit fullscreen</span>
                <ExitFullscreen />
            {:else}
                <span class="visuallyHidden">enter fullscreen</span>
                <EnterFullscreen />
            {/if}
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

    .globeProjectTitle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1;
        pointer-events: none;
        box-sizing: border-box;
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
        align-items: stretch;
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

            padding: var(--_pad-xl) var(--_pad-xl);
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

        .fullscreen {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: var(--_pad-md);
            color: var(--_clr-800);
            padding: var(--_pad-xl) var(--_pad-xl);
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
                display: none;
            }
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
