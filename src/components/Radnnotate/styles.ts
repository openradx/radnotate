import {PaletteMode} from "@mui/material";


export const getTheme = (mode: PaletteMode) => ({
    typography: {
      fontSize: 12
    },
    palette: {
        mode,
        ...(mode === 'light'
            ? {
                primary: {
                    main: '#00376d',
                },
                secondary: {
                    main: '#de751a',
                },
            }
            : {
                primary: {
                    main: '#de751a',
                },
                secondary: {
                    main: '#de751a',
                },
            }),
    },
    components: {
        MuiSpeedDial: {
            defaultProps: {
                transitionDuration: 0
            }
        }
    }
});
