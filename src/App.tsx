import Radnnotate from "./components/Radnnotate";
import {
    Box,
    createTheme,
    CssBaseline,
    PaletteMode,
    SpeedDial,
    SpeedDialAction,
    ThemeProvider
} from "@mui/material";
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import {useMemo, useState} from "react";
import {getTheme} from "./components/Radnnotate/styles";

const App = () => {
    const [mode, setMode] = useState<PaletteMode>('light');

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