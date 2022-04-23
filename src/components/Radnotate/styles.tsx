import {PaletteMode, Tooltip, tooltipClasses} from "@mui/material";
import {styled} from "@mui/styles";
import Modelica from "../../Bw_Modelica_SS01_Regular.woff2"

export const getTheme = (mode: PaletteMode) => ({
    typography: {
      fontSize: 12,
      fontFamily: "Modelica"
    },
    palette: {
        mode,
        ...(mode === 'light'
            ? {
                primary: {
                    main: '#00376d',
                },
                secondary: {
                    main: '#e85818',
                },
            }
            : {
                primary: {
                    main: '#e85818',//'#de751a'
                },
                secondary: {
                    main: '#e85818',
                },
            }),
    },
    components: {
        MuiSpeedDial: {
            defaultProps: {
                transitionDuration: 0
            }
        },
        MuiCssBaseline: {
            styleOverrides: `
              @font-face {
                font-family: 'Modelica';'*.woff2'
                font-style: normal;
                font-display: swap;
                font-weight: 400;
                src: local('Modelica'), local('Bw_Modelica_SS01_Regular'), url(${Modelica}) format('woff2');
                unicodeRange: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF;
            }`,
        },
    }
});

export const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 200,
    },
});