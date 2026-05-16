<script>
    import '../styles/global.scss';
</script>

<svelte:head>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>US Military Projection Overseas</title>
</svelte:head>

<slot />

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
</style>
