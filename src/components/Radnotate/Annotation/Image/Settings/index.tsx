import { Stack, Divider, Tooltip, FormGroup, FormControlLabel, Switch, Button, Box, Slider, Typography, FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material"
import { ReactElement, useState } from "react"
import Variable, { VariableType } from "../../../Form/variable"
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import cornerstone from "cornerstone-core";
import { useRadnotateStore, RadnotateState } from "../../..";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";
import { ImageState, useImageStore } from "..";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

type SettingsProps = {}

// @ts-ignore
export const Settings = (props: SettingsProps): ReactElement => {
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    
    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const setReset = useImageStore((state: ImageState) => state.setReset)
    const segmentationTransparency = useImageStore((state: ImageState) => state.segmentationTransparency)
    const setSegmentationTransparency = useImageStore((state: ImageState) => state.setSegmentationTransparency)
    const correctionMode = useImageStore((state: ImageState) => state.correctionMode) 
    const setCorrectionMode = useImageStore((state: ImageState) => state.setCorrectionMode)
    const activeSeriesDescription = useImageStore((state: ImageState) => state.activeSeriesDescription)
    const setActiveImageID = useImageStore((state: ImageState) => state.setActiveImageID)
    const [openTooltip, setOpenTooltip] = useState(false)

    // const _handleMouse = async (event) => {
    //     if (event.type === "mousedown") {
    //         if (event.button === 1) { // Scroll button, enable
    //             this.setState({enableScrolling: true})
    //         }
    //     } else if (event.type === "mouseup") {
    //         if (event.button === 1) { // Scroll button, disable
    //             this.setState({enableScrolling: false})
    //         }
    //     } else {
    //         if (this.state.enableScrolling && event.ctrlKey) {
    //             const scrolled = event.movementY
    //             if (Math.abs(scrolled)) {
    //                 const currentDirection = scrolled > 0 ? 1 : -1
    //                 if (this.state.previousScrollingDirection !== currentDirection) {
    //                     this.imageIdQueue.clear()
    //                 }
    //                 this.imageIdQueue.enqueue(() => new Promise(resolve => {
    //                     let currentImageIdIndex = this.state.currentImageIdIndex
    //                     const threshold = 3
    //                     let movement = 0
    //                     if (scrolled > threshold) {
    //                         movement = Math.abs(scrolled) >= 15 ? 5 : 1
    //                         this.setState({previousScrollingDirection: 1})
    //                     } else if (scrolled < -1 * threshold) {
    //                         movement = Math.abs(scrolled) >= 15 ? -5 : -1
    //                         this.setState({previousScrollingDirection: -1})
    //                     }
    //                     currentImageIdIndex = currentImageIdIndex + movement
    //                     if (currentImageIdIndex >= 0 &&
    //                         currentImageIdIndex < this.props.imageStack.imageIDs.length) {
    //                         const currentImageId = this.props.imageStack.imageIDs[currentImageIdIndex]
    //                         this._setCurrentImage(currentImageId)
    //                     }
    //                     resolve(true)
    //                 }))
    //             }
    //         }
    //     }
    // }

    const handleSeriesSelection = (event: SelectChangeEvent) => {
        const activeSeriesDescription = event.target.value
        const activeImageID = imageStack.seriesDescriptions.get(activeSeriesDescription)[0]
        setActiveImageID(activeImageID)
        setOpenTooltip(false)
    }

    const handleSegmentationTransparencySlider = (event: Event | number) => {
        let segmentationTransparency: number
        if (typeof event === "number") {
            segmentationTransparency = event
        } else {
            segmentationTransparency = event.target.value
        }
        const {configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlpha = segmentationTransparency / 100;
        setSegmentationTransparency(segmentationTransparency)
    }

    const renderSeriesSelection = (): ReactElement => {
        return (
            <div>
                <Tooltip title={"Select series by series description"} followCursor={true} disableTouchListener={true}
                         disableFocusListener={true} disableInteractive={true} open={openTooltip}>
                    <FormControl sx={{width: 250}} size={"small"}>
                        <Select value={activeSeriesDescription}
                                onOpen={() => setOpenTooltip(true)}
                                onChange={event => handleSeriesSelection(event)}
                                onClose={() => {
                                    setOpenTooltip(false)
                                    setTimeout(() => {
                                        if (document !== null) {
                                            // @ts-ignore
                                            document.activeElement.blur()
                                        }
                                    }, 0);
                                }}>
                            {imageStack.seriesDescriptions.keys().map((seriesDescription: string) => (
                                <MenuItem key={seriesDescription} value={seriesDescription}>
                                    {seriesDescription}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Tooltip>
            </div>
        )
    }


    const renderIntegerBooleanControl = (): ReactElement => {
        return(
            <Stack direction={"row"} sx={{marginBottom: 1}}
                   justifyContent={"flex-start"}
                   alignItems={"center"}
                   spacing={1}
                   divider={<Divider orientation="vertical" flexItem/>}>
                {renderSeriesSelection()}
                <Tooltip title={"Enable by pressing Control key"}>
                    <FormGroup sx={{minWidth: 160}}>
                        <FormControlLabel control={<Switch checked={correctionMode}
                                                           value={correctionMode}
                                                           onChange={setCorrectionMode(true)}/>}
                                          label="Deletion mode"/>
                    </FormGroup>
                </Tooltip>
                <Button onClick={setReset(true)} sx={{minWidth: 80}} color="primary" variant="outlined"
                        startIcon={<RestartAltIcon/>}>
                    Reset
                </Button>
            </Stack>
        )
    }

    const renderSegmentationControl = (): ReactElement => {
        return (
            <Stack direction={"row"} sx={{marginBottom: 1}}
                   justifyContent={"flex-start"}
                   alignItems={"center"}
                   spacing={1}
                   divider={<Divider orientation="vertical" flexItem/>}>
                {renderSeriesSelection()}

                <Tooltip title={"Enable by pressing Control key"}>
                    <FormGroup sx={{minWidth: 160}}>
                        <FormControlLabel control={<Switch checked={correctionMode}
                                                           value={correctionMode}
                                                           onChange={setCorrectionMode(true)}/>}
                                          label="Correction mode"/>
                    </FormGroup>
                </Tooltip>
                <Button sx={{minWidth: 80}} onClick={setUndo(true)} color="primary" variant="outlined"
                        startIcon={<UndoIcon/>}>
                    Undo
                </Button>
                <Button sx={{minWidth: 80}} onClick={setRedo(true)} color="primary" variant="outlined"
                        startIcon={<RedoIcon/>}>
                    Redo
                </Button>
                <Button sx={{minWidth: 80}} onClick={setReset(true)} color="primary" variant="outlined"
                        startIcon={<RestartAltIcon/>}>
                    Reset
                </Button>
                <Box sx={{minWidth: 250, paddingLeft: 1}}>
                    <Stack direction={"row"} alignItems={"center"} justifyContent={"flex-start"}>
                        <Slider aria-label="segmentation-transparency" track={false}
                                value={segmentationTransparency} max={100}
                                onChange={event => handleSegmentationTransparencySlider(event)}/>
                        <Typography sx={{marginLeft: 2.5}} id="segmentation-transparency-slider">
                            Segmentation transparency
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        )
    }

    if (activeVariable.type === VariableType.segmentation) {
        renderSegmentationControl()
    } else if (activeVariable.type !== VariableType.boolean && activeVariable.type !== VariableType.integer) {
        renderIntegerBooleanControl()
    } else {
        return (
            <Box sx={{marginBottom: 1}} justifyContent={"flex-start"} alignItems={"center"}>
                {renderSeriesSelection()}
            </Box>
        )
    }
}