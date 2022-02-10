import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    SpeedDial,
    SpeedDialAction
} from "@mui/material";
import {useEffect, useState} from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import StartIcon from '@mui/icons-material/Start';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {helpAnnotationMode, helpStartPage} from "./help";

type SettingsPropsType = {
    clearTable: Function
    colorMode: Function
    restartWorkflow: Function
    restartAnnotating: Function
    annotationMode: boolean
}

export const Settings = (props: SettingsPropsType) => {
    const [actions, setActions] = useState([
            {icon: <HelpOutlineIcon/>, name: "Help"},
            {icon: <LightModeOutlinedIcon/>, name: 'Light mode'}
        ]
    )
    const [alertDialogOpen, setAlertDialogOpen] = useState(false)
    const [alertDialogText, setAlertDialogText] = useState<string>()
    const [alertDialogType, setAlertDialogType] = useState<string>()

    const [helpDialogOpen, setHelpDialogOpen] = useState(false)
    const [helpDialogText, setHelpDialogText] = useState<string>()

    useEffect(() => {
        if (props.annotationMode) {
            const additonalActions = [
                {icon: <RestartAltOutlinedIcon/>, name: "Restart from variable definition"},
                {icon: <StartIcon/>, name: "Restart from beginning"},
                {icon: <DeleteSweepOutlinedIcon/>, name: "Clear table"}
            ]
            additonalActions.push(...actions)
            setActions(additonalActions)
            setHelpDialogText(helpAnnotationMode)
        } else {
            if (actions.length > 2) {
                setActions([...actions.slice(3,5)])
            } else {
                setActions([...actions.slice(0,2)])
            }
            setHelpDialogText(helpStartPage)
        }
    }, [props.annotationMode]);

    const _changeColorModeIcon = () => {
        if (actions.pop().name === "Light mode") {
            actions.push({icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'})
        } else {
            actions.push({icon: <LightModeOutlinedIcon/>, name: 'Light mode'})
        }
        setActions(actions)
    }

    const _handleSpeedDialClick = (key: string) => {
        switch (key) {
            case "Dark mode":
                props.colorMode.toggleColorMode();
                _changeColorModeIcon()
                break;
            case "Light mode":
                props.colorMode.toggleColorMode();
                _changeColorModeIcon()
                break;
            case "Restart from variable definition":
                setAlertDialogOpen(true)
                setAlertDialogType("restart")
                setAlertDialogText("If you proceed, your annotation data and definitions will be lost. Be sure to " +
                    "export your annotation data before you proceed. Always export your annotations as CSV. Are you sure you want to proceed?")
                break;
            case "Clear table":
                setAlertDialogOpen(true)
                setAlertDialogType("clear")
                setAlertDialogText("If you proceed, your annotation data will be lost. Be sure to export your " +
                    "annotation data before you proceed. Always export your annotations as CSV. Are you sure you want to proceed?")
                break;
            case "Restart from beginning":
                props.restartAnnotating()
                break;
            case "Help":
                setHelpDialogOpen(true)
                break;
        }
    }

    const _handleAlertDialogClose = () => {
        switch (alertDialogType) {
            case "restart":
                props.restartWorkflow()
                break;
            case "clear":
                props.clearTable()
                break;
        }
        setAlertDialogOpen(false)
    }

    let sx
    if (props.annotationMode) {
        sx = {position: 'absolute', left: 5, bottom: 8}
    } else {
        sx = {position: 'absolute', left: 5, top: 8}
    }
    return (
        <div>
            <SpeedDial
                ariaLabel="SpeedDial"
                direction={props.annotationMode?"right":"down"}
                sx={sx}
                icon={<SettingsOutlinedIcon/>}>
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={() => _handleSpeedDialClick(action.name)}
                    />
                ))}
            </SpeedDial>
            <Dialog
                open={alertDialogOpen}
                onClose={() => setAlertDialogOpen(false)}>
                <DialogTitle id="alert-dialog-title">
                    Possible data loss
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {alertDialogText}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAlertDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => _handleAlertDialogClose()} autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={helpDialogOpen}
                onClose={() => setHelpDialogOpen(false)}>
                <DialogTitle id="help-dialog-title">
                    How to use Radnotate
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="help-dialog-description">
                        {helpDialogText}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHelpDialogOpen(false)}>Ok</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}