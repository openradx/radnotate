import Radnnotate from "./components/Radnnotate";
import {
    Box,
    createTheme,
    CssBaseline,
    PaletteMode,
    ThemeProvider, useMediaQuery
} from "@mui/material";
import {useMemo, useState} from "react";
import {getTheme} from "./components/Radnnotate/styles";

const App = () => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<PaletteMode>(prefersDarkMode? "dark" : "light");

    const theme = useMemo(() => createTheme(getTheme(mode)), [mode]);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode: PaletteMode) =>
                    prevMode === 'light' ? 'dark' : 'light',
                );            }
        }),
        [mode]);

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{marginLeft: "10px", marginTop: "10px", marginRight: "10px"}}>
                <CssBaseline/>
                <Radnnotate colorMode={colorMode}/>
            </Box>
        </ThemeProvider>
    )
}

export default App;