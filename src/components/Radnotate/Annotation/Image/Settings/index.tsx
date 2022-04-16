import { Stack, Divider, Tooltip, FormGroup, FormControlLabel, Switch, Button, Box, Slider, Typography, FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material"
import { ReactElement, useEffect, useState } from "react"
import Variable, { VariableType } from "../../../Form/variable"
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useRadnotateStore, RadnotateState, ImageStack } from "../../..";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";
import { ImageState, useImageStore } from "..";


type SettingsProps = {
    imageStack: ImageStack
}

export const Settings = (props: SettingsProps): ReactElement => {
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)

    const [openTooltip, setOpenTooltip] = useState(false)
    const correctionMode = useImageStore((state: ImageState) => state.correctionMode)
    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const setReset = useImageStore((state: ImageState) => state.setReset)
    const segmentationTransparency = useImageStore((state: ImageState) => state.segmentationTransparency)
    const setSegmentationTransparency = useImageStore((state: ImageState) => state.setSegmentationTransparency)
    const setCorrectionMode = useImageStore((state: ImageState) => state.setCorrectionMode)

    const activeSeries = useImageStore((state: ImageState) => state.activeSeries)
    const setActiveImageID = useImageStore((state: ImageState) => state.setActiveImageID)
    const [modeLabel, setModeLabel] = useState(() => {
        if (activeVariable.type === VariableType.segmentation) {
            return "Correction mode"
        } else {
            return "Deletion mode"
        }
    })

    useEffect(() => {
        if (activeVariable !== null && activeVariable.type === VariableType.segmentation) {
            setModeLabel("Correction mode")
        } else {
            setModeLabel("Deletion mode")
        }
    }, [activeVariable])

    return (
        <Stack direction={"row"} sx={{marginBottom: 1}}
                   justifyContent={"flex-start"}
                   alignItems={"center"}
                   spacing={1}
                   divider={<Divider orientation="vertical" flexItem/>}>
            <Tooltip title={"Select series by series description"} followCursor={true} disableTouchListener={true}
                    disableFocusListener={true} disableInteractive={true} open={openTooltip}>
                <FormControl sx={{width: 250}} size={"small"}>
                    <Select value={activeSeries}
                            onOpen={() => setOpenTooltip(true)}
                            onChange={event => setActiveImageID(props.imageStack.seriesDescriptions.get(event.target.value)[0])}
                            onClose={() => {
                                setOpenTooltip(false)
                                setTimeout(() => {
                                    document.activeElement.blur();
                                }, 0);
                            }}>
                        {props.imageStack.seriesDescriptions.keys().map((seriesDescription: string) => (
                            <MenuItem key={seriesDescription} value={seriesDescription}>
                                {seriesDescription}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Tooltip>

            <Tooltip title={"Enable by pressing Control key"}>
                <FormGroup sx={{minWidth: 100}}>
                    <FormControlLabel control={<Switch checked={correctionMode}
                                                        value={correctionMode}
                                                        onChange={() => {
                                                            if (correctionMode) {
                                                                setCorrectionMode(false)
                                                            } else {
                                                                setCorrectionMode(true)
                                                            }
                                                        }}/>}
                                        label={modeLabel}/>
                </FormGroup>
            </Tooltip>
            <Button sx={{minWidth: 80}} onClick={() => setUndo(true)} color="primary" variant="outlined"
                    startIcon={<UndoIcon/>}>
                Undo
            </Button>
            <Button sx={{minWidth: 80}} onClick={() => setRedo(true)} color="primary" variant="outlined"
                    startIcon={<RedoIcon/>}>
                Redo
            </Button>
            <Button sx={{minWidth: 80}} onClick={() => setReset(true)} color="primary" variant="outlined"
                    startIcon={<RestartAltIcon/>}>
                Reset
            </Button>
            {activeVariable !== null && activeVariable.type === VariableType.segmentation ?
                <Box sx={{minWidth: 250, paddingLeft: 1}}>
                    <Stack direction={"row"} alignItems={"center"} justifyContent={"flex-start"}>
                        <Slider aria-label="segmentation-transparency" track={false}
                                value={segmentationTransparency} max={100}
                                onChange={event => setSegmentationTransparency(event.target.value)}
                                />
                        <Typography sx={{marginLeft: 2.5}} id="segmentation-transparency-slider">
                            Segmentation transparency
                        </Typography>
                    </Stack>
                </Box>
                :
                <div></div>
            }
        </Stack>
    )
}