import Annotation from "./components/Annotation";
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
import {getTheme} from "./styles";

const App = () => {
    const [mode, setMode] = useState<PaletteMode>('light');
    const [actions, setActions] = useState<Object[]>([
        {icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'},
    ])

    const theme = useMemo(() => createTheme(getTheme(mode)), [mode]);
    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode: PaletteMode) =>
                    prevMode === 'light' ? 'dark' : 'light',
                );
                const currentActions = actions
                currentActions.pop()
                if (mode === "dark") {
                    currentActions.push({icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'})
                } else {
                    currentActions.push({icon: <LightModeOutlinedIcon/>, name: 'Light mode'})
                }
                setActions(currentActions)
            }
        }),
        [mode, actions]);

    const handleStartAnnotation = () => {
        const additonalActions = [
            {icon: <RestartAltOutlinedIcon/>, name: "Restart annotation"},
            {icon: <DeleteSweepOutlinedIcon/>, name: "Clear table"}
        ]
        additonalActions.push(actions.pop())
        setActions(additonalActions)
    }

    const handleSpeedDialClick = (key: string) => {
        switch (key) {
            case "Dark mode":
                colorMode.toggleColorMode();
                break;
            case "Light mode":
                colorMode.toggleColorMode();
                break;
            case "Restart annotation":
                break;
            case "Clear table":
                break;
        }
    }

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{marginLeft: "10px", marginTop: "10px", marginRight: "10px"}}>
                <CssBaseline/>
                <Annotation handleStartAnnotation={handleStartAnnotation}/>
                <SpeedDial
                    ariaLabel="SpeedDial"
                    direction={"right"}
                    sx={{position: 'absolute', bottom: 16, left: 16}}
                    icon={<SettingsOutlinedIcon/>}
                >
                    {actions.map((action) => (
                        <SpeedDialAction
                            key={action.name}
                            icon={action.icon}
                            tooltipTitle={action.name}
                            onClick={() => handleSpeedDialClick(action.name)}
                        />
                    ))}
                </SpeedDial>
            </Box>
        </ThemeProvider>
    )
}

export default App;