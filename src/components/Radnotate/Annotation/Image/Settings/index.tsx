import { Stack, Divider, Tooltip, FormGroup, FormControlLabel, Switch, Button, Box, Slider, Typography, FormControl, MenuItem, Select } from "@mui/material"
import { ReactElement } from "react"
import Variable, { VariableType } from "../../../Form/variable"
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import cornerstone from "cornerstone-core";
import { TSMap } from "typescript-map";
import { useRadnotateStore, RadnotateState } from "../../..";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

type SettingsProps = {}

export const Settings = (props: SettingsProps): ReactElement => {
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)


    const _handleMouse = async (event) => {
        if (event.type === "mousedown") {
            if (event.button === 1) { // Scroll button, enable
                this.setState({enableScrolling: true})
            }
        } else if (event.type === "mouseup") {
            if (event.button === 1) { // Scroll button, disable
                this.setState({enableScrolling: false})
            }
        } else {
            if (this.state.enableScrolling && event.ctrlKey) {
                const scrolled = event.movementY
                if (Math.abs(scrolled)) {
                    const currentDirection = scrolled > 0 ? 1 : -1
                    if (this.state.previousScrollingDirection !== currentDirection) {
                        this.imageIdQueue.clear()
                    }
                    this.imageIdQueue.enqueue(() => new Promise(resolve => {
                        let currentImageIdIndex = this.state.currentImageIdIndex
                        const threshold = 3
                        let movement = 0
                        if (scrolled > threshold) {
                            movement = Math.abs(scrolled) >= 15 ? 5 : 1
                            this.setState({previousScrollingDirection: 1})
                        } else if (scrolled < -1 * threshold) {
                            movement = Math.abs(scrolled) >= 15 ? -5 : -1
                            this.setState({previousScrollingDirection: -1})
                        }
                        currentImageIdIndex = currentImageIdIndex + movement
                        if (currentImageIdIndex >= 0 &&
                            currentImageIdIndex < this.props.imageStack.imageIDs.length) {
                            const currentImageId = this.props.imageStack.imageIDs[currentImageIdIndex]
                            this._setCurrentImage(currentImageId)
                        }
                        resolve(true)
                    }))
                }
            }
        }
    }

    const handleUndoClick = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                setters,
            } = cornerstoneTools.getModule("segmentation");
            setters.undo(this.state.cornerstoneElement);
        }
    }

    const handleRedoClick = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                setters,
            } = cornerstoneTools.getModule("segmentation");
            setters.redo(this.state.cornerstoneElement);
        }
    }

    const handleResetClick = () => {
        const variableType = this.props.activeVariable.type
        if (variableType === VariableType.segmentation) {
            const stackStartImageId = this.props.imageStack.imageIDs[0]
            const segmentationIndex = this.props.activeVariable.segmentationIndex
            this._deleteSegmentations(stackStartImageId, segmentationIndex)
        } else {
            this._deleteAnnotations(variableType, this.props.imageStack.imageIDs)
        }
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
        cornerstone.updateImage(this.state.cornerstoneElement);
        this.setState({segmentationTransparency: segmentationTransparency})
    }

    const renderSeriesSelection = (): ReactElement => {
        return (
            <div>
                <Tooltip title={"Select series by series description"} followCursor={true} disableTouchListener={true}
                         disableFocusListener={true} disableInteractive={true} open={this.state.openTooltip}>
                    <FormControl sx={{width: 250}} size={"small"}>
                        <Select value={this.state.currentSeriesDescription}
                                onOpen={() => this.setState({openTooltip: true})}
                                onChange={event => this.handleSeriesSelection(event)}
                                onClose={() => {
                                    this.setState({openTooltip: false})
                                    setTimeout(() => {
                                        document.activeElement.blur();
                                    }, 0);
                                }}>
                            {this.props.imageStack.seriesDescriptions.keys().map((seriesDescription) => (
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
                        <FormControlLabel control={<Switch checked={correctionModeEnabled}
                                                           value={correctionModeEnabled}
                                                           onChange={setCorrectionMode}/>}
                                          label="Deletion mode"/>
                    </FormGroup>
                </Tooltip>
                <Button onClick={handleResetClick} sx={{minWidth: 80}} color="primary" variant="outlined"
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
                        <FormControlLabel control={<Switch checked={correctionModeEnabled}
                                                           value={correctionModeEnabled}
                                                           onChange={setCorrectionMode}/>}
                                          label="Correction mode"/>
                    </FormGroup>
                </Tooltip>
                <Button sx={{minWidth: 80}} onClick={handleUndoClick} color="primary" variant="outlined"
                        startIcon={<UndoIcon/>}>
                    Undo
                </Button>
                <Button sx={{minWidth: 80}} onClick={handleRedoClick} color="primary" variant="outlined"
                        startIcon={<RedoIcon/>}>
                    Redo
                </Button>
                <Button sx={{minWidth: 80}} onClick={handleResetClick} color="primary" variant="outlined"
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