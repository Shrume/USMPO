<script lang="ts">
    import Globe from '$lib/MIL-globe.svelte';
    import { ENTRIES, ORIGIN } from './data';
</script>

<svelte:head>
    <meta name="theme-color" content="#f2f2f2" />
</svelte:head>

<main>
    <div class="globeColumn">
        <Globe entries={ENTRIES} origin={ORIGIN} />
    </div>

    <div class="sidebar" tabindex="-1">
        <slot />
    </div>
</main>

<style lang="scss">
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800;900&family=Montserrat:wght@500&display=swap');

    :global {
        html {
            scroll-behavior: smooth;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }

        body {
            --_pad-border: 20px;
            --_pad-4xl: 35px;
            --_pad-2xl: 20px;
            --_pad-xl: 15px;
            --_pad-lg: 12px;
            --_pad-md: 10px;
            --_pad-sm: 6px;
            --_pad-xs: 4px;
            --_border-radius-md: 7px;
            --_border-radius-sm: 5px;
            --_focus-outline-width: 3px;
            --_focus-outline: solid var(--_focus-outline-width) var(--_clr-accent-700);

            --_font-2xl: 3rem;
            --_font-lg: 1.2rem;
            --_font-md: 1.1rem;
            --_font-sm: 1rem;
            --_trans-fast: 0.1s ease;
            --_trans-normal: 0.2s ease;

            --_clr-1000: #000000;
            --_clr-950: #222222;
            --_clr-900: #303030;
            --_clr-800: #474747;
            --_clr-700: #666666;
            --_clr-600: #7a7a7a;
            --_clr-500: #8d8d8d;
            --_clr-400: #a8a8a8;
            --_clr-300: #bebebe;
            --_clr-200: #d1d1d1;
            --_clr-150: #dbdbdb;
            --_clr-100: #e5e5e5;
            --_clr-50: #f2f2f2;
            --_clr-0: #ffffff;

            --_clr-accent-700: #eb6200;

            font-family: 'Manrope', sans-serif;
            background-color: var(--_clr-50);
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
    }

    main {
        display: flex;
        flex-flow: row nowrap;
        position: relative;
        width: 100%;
    }

    .globeColumn {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    .sidebar {
        flex-shrink: 0;
        display: flex;
        flex-flow: column nowrap;
        width: 460px;
        box-sizing: border-box;

        padding: var(--_pad-border);
        overflow: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    /* After base `.sidebar` so these win on cascade. Wide viewports: constrain `main` to the
       viewport so the list's `.listScroll` (or this column) can scroll instead of `body`. */
    @media (min-width: 601px) {
        main {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
            align-items: stretch;
            box-sizing: border-box;
        }

        .globeColumn {
            min-height: 0;
            overflow: hidden;
        }

        .sidebar {
            min-height: 0;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
    }

    @media (max-width: 800px) {
        .sidebar {
            width: 360px;
        }
    }

    @media (max-width: $UGNbp-tablet) and (orientation: portrait), (max-width: $UGNbp-mobile) {
        :global {
            body {
                --_pad-border: 25px;
                overflow-y: auto;
            }
            html {
                overflow: auto;
            }
        }

        main {
            flex-flow: column nowrap;
            align-items: center;
            justify-content: stretch;

            padding-bottom: env(safe-area-inset-bottom);

            height: auto;
            max-height: none;
            overflow: visible;
        }

        .globeColumn {
            width: 100%;
            max-width: 500px;
            min-height: unset;
            overflow: visible;
        }

        .sidebar {
            flex-shrink: unset;
            width: 100%;
            max-width: 500px;

            margin-left: 0;

            height: auto;
            min-height: unset;
            overflow: auto;

            padding:
                calc(var(--_pad-border) + 2 * var(--_pad-xl) + 15px)
                var(--_pad-border)
                var(--_pad-border)
                var(--_pad-border);
        }
    }

    @media (max-width: 350px) {
        :global {
            body {
                --_pad-border: 15px;
            }
        }
    }
</style>
