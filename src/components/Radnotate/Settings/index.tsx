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
import {ReactElement, useEffect, useState} from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import StartIcon from '@mui/icons-material/Start';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {helpAnnotationMode, helpStartPage} from "./help";

type SettingsProps = {
    clearTable: Function
    colorMode: {toggleColorMode: Function}
    restartWorkflow: Function
    restartAnnotating: Function
    annotationMode: boolean
}

export const Settings = (props: SettingsProps): ReactElement => {
    const [actions, setActions] = useState<{icon: ReactElement, name: string}[]>([
            {icon: <HelpOutlineIcon/>, name: "Help"},
            {icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'}
        ]
    )
    const [alertDialogOpen, setAlertDialogOpen] = useState(false)
    const [alertDialogText, setAlertDialogText] = useState<string>()
    const [alertDialogType, setAlertDialogType] = useState<string>()

    const [helpDialogOpen, setHelpDialogOpen] = useState(false)
    const [helpDialogText, setHelpDialogText] = useState<ReactElement>()

    useEffect(() => {
        if (props.annotationMode) {
            const additonalActions = [
                {icon: <RestartAltOutlinedIcon/>, name: "Restart from variable definition"},
                {icon: <StartIcon/>, name: "Restart from beginning"},
                // {icon: <DeleteSweepOutlinedIcon/>, name: "Clear table"}
            ]
            additonalActions.push(...actions)
            setActions(additonalActions)
            setHelpDialogText(helpAnnotationMode)
        } else {
            if (actions.length > 2) {
                setActions([...actions.slice(2, 4)])
            } else {
                setActions([...actions.slice(0, 2)])
            }
            setHelpDialogText(helpStartPage)
        }
    }, [props.annotationMode]);

    const _changeColorModeIcon = (): void => {
        const action = actions.pop()
        if (action !== undefined && action.name === "Light mode") {
            actions.push({icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'})
        } else {
            actions.push({icon: <LightModeOutlinedIcon/>, name: 'Light mode'})
        }
        setActions(actions)
    }

    const _handleSpeedDialClick = (key: string): void => {
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
            // case "Clear table":
            //     setAlertDialogOpen(true)
            //     setAlertDialogType("clear")
            //     setAlertDialogText("If you proceed, your annotation data will be lost. Be sure to export your " +
            //         "annotation data before you proceed. Always export your annotations as CSV. Are you sure you want to proceed?")
            //     break;
            case "Restart from beginning":
                props.restartAnnotating()
                break;
            case "Help":
                setHelpDialogOpen(true)
                break;
        }
    }

    const _handleAlertDialogClose = (): void => {
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

    return (
        <div>
            <SpeedDial
                ariaLabel="SpeedDial"
                direction={"right"}
                // @ts-ignore
                sx={{position: 'absolute', left: 5, bottom: 8}}
                icon={<SettingsOutlinedIcon/>}>
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={(): void => _handleSpeedDialClick(action.name)}
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
                    <Button onClick={(): void => setAlertDialogOpen(false)}>Cancel</Button>
                    <Button onClick={(): void => _handleAlertDialogClose()} autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={helpDialogOpen}
                onClose={(): void => setHelpDialogOpen(false)}>
                <DialogTitle id="help-dialog-title">
                    How to use Radnotate
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="help-dialog-description">
                        {helpDialogText}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={(): void => setHelpDialogOpen(false)}>Ok</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}