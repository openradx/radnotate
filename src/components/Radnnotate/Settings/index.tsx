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
import {useEffect, useMemo, useState} from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";

type SeetingsPropsType = {
    clearTable: Function
    colorMode: Function
    restartWorkflow: Function
    annotationMode: boolean
}

export const Settings = (props: SeetingsPropsType) => {
    const [actions, setActions] = useState([
            {icon: <DarkModeOutlinedIcon/>, name: 'Dark mode'},
        ]
    )
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogText, setDialogText] = useState<string>()
    const [dialogType, setDialogType] = useState<string>()

    useEffect(() => {
        if (props.annotationMode) {
            const additonalActions = [
                {icon: <RestartAltOutlinedIcon/>, name: "Restart workflow"},
                {icon: <DeleteSweepOutlinedIcon/>, name: "Clear table"}
            ]
            additonalActions.push(actions.pop())
            setActions(additonalActions)
        } else {
            setActions([actions.pop()])
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
            case "Restart workflow":
                setDialogOpen(true)
                setDialogType("restart")
                setDialogText("If you proceed, your annotation data and definitions will be lost. Be sure to " +
                    "export your annotation data before you proceed. Are you sure you want to proceed?")
                break;
            case "Clear table":
                setDialogOpen(true)
                setDialogType("clear")
                setDialogText("If you proceed, your annotation data will be lost. Be sure to export your " +
                    "annotation data before you proceed. Are you sure you want to proceed?")
                break;
        }
    }

    const _handleDialogClose = () => {
        switch (dialogType) {
            case "restart":
                setActions([actions.pop()])
                props.restartWorkflow()
                break;
            case "clear":
                props.clearTable()
                break;
        }
        setDialogOpen(false)
    }

    return (
        <div>
            <SpeedDial
                ariaLabel="SpeedDial"
                direction={"right"}
                sx={{position: 'absolute', bottom: 5, left: 5}}
                icon={<SettingsOutlinedIcon/>}
            >
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
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                // aria-labelledby="alert-dialog-title"
                // aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Possible data loss
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {dialogText}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => _handleDialogClose()} autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}