import {createTheme, ThemeOptions} from "@mui/material";

export const themeOptions: ThemeOptions = {
    palette: {
        type: 'light',
        primary: {
            main: '#00376d',
        },
        secondary: {
            main: '#de751a',
        },
    },
};

export const theme = createTheme(themeOptions);

