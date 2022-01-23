import React, {ChangeEvent, Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../AnnotationForm/DicomDropzone/dicomObject";
import cornerstone, {loadImage, pixelDataToFalseColorData} from "cornerstone-core";
import Variable, {VariableType} from "../AnnotationForm/variable";
import {TSMap} from "typescript-map"
import {
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    MenuItem,
    Select, SelectChangeEvent,
    Slider,
    Stack,
    Switch, Tooltip,
    Typography
} from "@mui/material";
import UndoIcon from '@mui/icons-material/Undo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: true,
    globalToolSyncEnabled: false,
    showSVGCursors: false
});

type ImagePropsType = {
    activePatient: Patient,
    activeVariable: Variable,
    nextVariable: Function,
    imageIds: string[],
    instanceNumbers: Map<string, number>,
    seriesDescriptions: TSMap<string, Array<string>>
    toolStates: [],
    stackIndices: Map<string, number>,
}

type ImageStateType = {
    activeViewportIndex: number,
    viewports: number[],
    tools: object[],
    imageIdIndex: number,
    isPlaying: boolean,
    frameRate: number,
    cornerstoneElement: any,
    correctionModeEnabled: boolean,
    segmentationTransparency: number,
    currentImageId: string,
    currentSeriesDescription: string,
    stackStartingImageIds: string[],
}

class Image extends Component<ImagePropsType, ImageStateType> {

    constructor(props: ImagePropsType) {
        super(props);

        const toolsList = [
            {name: 'Pan', mode: 'enabled', modeOptions: {mouseButtonMask: 1}},
            {name: "Probe", mode: 'enabled', modeOptions: {mouseButtonMask: 1}},
            {name: "RectangleRoi", mode: 'enabled', modeOptions: {mouseButtonMask: 1}},
            {name: "EllipticalRoi", mode: 'enabled', modeOptions: {mouseButtonMask: 1}},
            {name: "Length", mode: 'enabled', modeOptions: {mouseButtonMask: 1}},
            {
                name: "FreehandScissors",
                mode: 'enabled',
                modeOptions: {mouseButtonMask: 1},
                activeStrategy: "ERASE_INSIDE"
            },
            {name: 'Wwwc', mode: 'active', modeOptions: {mouseButtonMask: 4}},
            {name: 'Zoom', mode: 'active', modeOptions: {mouseButtonMask: 2}},
            {name: "CorrectionScissors", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "Eraser", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: 'StackScrollMouseWheel', mode: 'active'},
            {name: 'ZoomTouchPinch', mode: 'active'},
            {name: 'StackScrollMultiTouch', mode: 'active'}
        ]

        const segmentationTransparency = 0
        const { configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlpha = segmentationTransparency;

        let currentSeriesDescription: string = ""
        this.props.seriesDescriptions.keys().forEach(seriesDescription => {
            this.props.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                if (imageId === this.props.imageIds[0]) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })

        this.props.toolStates.forEach(annotationToolState => {
            if (annotationToolState.length === 3) {
                const [imageId, tool, data] = annotationToolState
                data.activate = true
                toolStateManager.addImageIdToolState(imageId, tool, data)
            }
        })

        const stackStartingImageIds = []
        stackStartingImageIds.push(this.props.imageIds[0])

        this.state = {
            activeViewportIndex: 0,
            viewports: [0],
            tools: toolsList,
            imageIdIndex: 0,
            isPlaying: false,
            frameRate: 22,
            correctionModeEnabled: false,
            segmentationTransparency: segmentationTransparency,
            currentSeriesDescription: currentSeriesDescription,
            stackStartingImageIds: stackStartingImageIds,
        };

    }

    _setInitialTools = async () => {
        setTimeout(() => {
            const {getters, setters} = cornerstoneTools.getModule("segmentation");
            this.props.toolStates.forEach(annotationToolState => {
                if (annotationToolState.length === 4) {
                    const [imageId, height, width, pixelData] = annotationToolState
                    let imageIdIndex
                    this.props.imageIds.forEach((currentImageId, index) => {
                        if (currentImageId === imageId) {
                            imageIdIndex = index
                        }
                    })
                    if (imageIdIndex !== undefined) {
                        setters.activeLabelmapIndex(this.state.cornerstoneElement, 0);
                        const {labelmap3D} = getters.labelmap2D(this.state.cornerstoneElement);
                        const l2dforImageIdIndex = getters.labelmap2DByImageIdIndex(
                            labelmap3D,
                            imageIdIndex,
                            width,
                            height
                        );
                        l2dforImageIdIndex.pixelData = pixelData
                        setters.updateSegmentsOnLabelmap2D(l2dforImageIdIndex);
                    }
                }
            })
            cornerstone.updateImage(this.state.cornerstoneElement);
        }, 200)
    }

    _processSeed = (data, instanceNumber: number) => {
        const coordinates = data.cachedStats
        const x = coordinates.x
        const y = coordinates.y
        const seed = new TSMap<string, number>()
        seed.set("x", x)
        seed.set("y", y)
        seed.set("z", instanceNumber)
        return seed
    }

    _processRectangleRoi = (data, instanceNumber: number) => {
        const coordinates = data.handles
        const seed = new TSMap<string, number>()
        const x1 = Number(coordinates.start.x)
        const y1 = Number(coordinates.start.y)
        const x2 = Number(coordinates.end.x)
        const y2 = Number(coordinates.end.y)
        const minX = Math.floor(Math.min(x1, x2))
        const maxX = Math.ceil(Math.max(x1, x2))
        const minY = Math.floor(Math.min(y1, y2))
        const maxY = Math.ceil(Math.max(y1, y2))
        seed.set("x1", minX)
        seed.set("y1", minY)
        seed.set("x2", maxX)
        seed.set("y2", maxY)
        seed.set("z", instanceNumber)
        return seed
    }

    _processEllipticalRoi = (data, instanceNumber: number) => {
        const coordinates = data.handles
        const seed = new TSMap<string, number>()
        const x1 = parseInt(coordinates.start.x)
        const y1 = parseInt(coordinates.start.y)
        const x2 = parseInt(coordinates.end.x)
        const y2 = parseInt(coordinates.end.y)
        const centerX = Math.abs(x1 - x2) + Math.min(x1, x2)
        const centerY = Math.abs(y1 - y2) + Math.min(y1, y2)
        const a = centerX - Math.min(x1, x2)
        const b = centerY - Math.min(y1, y2)
        seed.set("x", centerX)
        seed.set("y", centerY)
        seed.set("a", a)
        seed.set("b", b)
        seed.set("z", instanceNumber)
        return seed
    }

    _processSegmentation = async (pixelData, imageId: string, instanceNumber: number) => {
        return await new Promise(resolve => {
            loadImage(imageId).then((image) => {
                const segmentation = new TSMap<string, number | string>()
                const b64encoded = btoa(String.fromCharCode.apply(null, pixelData));
                segmentation.set("z", instanceNumber)
                segmentation.set("pixelData", b64encoded)
                segmentation.set("width", image.width)
                segmentation.set("height", image.height)
                resolve(segmentation)
            })
        })
    }

    _processLength = (data, instanceNumber: number) => {
        const coordinates = data.handles
        const length = new TSMap<string, number>()
        length.set("x1", parseInt(coordinates.start.x))
        length.set("y1", parseInt(coordinates.start.y))
        length.set("x2", parseInt(coordinates.end.x))
        length.set("y2", parseInt(coordinates.end.y))
        length.set("length", data.length)
        length.set("z", instanceNumber)
        return length
    }

    _processBoolean = (keyPressed: string) => {
        const seed = new TSMap<string, boolean>()
        if (keyPressed === "t") {
            seed.set("value", true)
        } else {
            seed.set("value", false)
        }
        return seed
    }

    _processInteger = (keyPressed: string) => {
        const seed = new TSMap<string, number>()
        seed.set("value", Number(keyPressed))
        return seed
    }

    _processImage = async (imageId: string) => {
        return await new Promise(resolve => {
            loadImage(imageId).then((image) => {
                const defaultValue = new TSMap<string, number>()
                defaultValue.set("studyUid", image.data.string('x0020000d'))
                defaultValue.set("seriesUid", image.data.string('x0020000e'))
                defaultValue.set("sopUid", image.data.string('x00080018'))
                defaultValue.set("seriesNumber", image.data.string('x00200011'))
                defaultValue.set("tablePosition", image.data.string('x00201041'))
                resolve(defaultValue)
            })
        })
    }

    _resolveSegmentation = async () => {
        const currentValues = []
        const {
            state,
        } = cornerstoneTools.getModule("segmentation");
        const imageIdState = state.series[this.props.imageIds[0]]
        if (imageIdState !== undefined) {
        const annotations = imageIdState.labelmaps3D[0].labelmaps2D
            const imageIndices = Object.keys(annotations)
            for (let i = 0; i < imageIndices.length; i++) {
                const imageIndex = imageIndices[i]
                const imageId = this.props.imageIds[Number(imageIndex)]
                const instanceNumber = this.props.instanceNumbers.get(imageId)
                const pixelData = annotations[imageIndex].pixelData
                const segmentation = await this._processSegmentation(pixelData, imageId, instanceNumber)
                const defaultValues = await this._processImage(imageId)
                const value = new TSMap([...Array.from(segmentation.entries()), ...Array.from(defaultValues.entries())])
                currentValues.push(value)
            }
        }
        return currentValues
    }

    _resolveAnnotations = async () => {
        const currentValues = []
        const existingToolState = toolStateManager.saveToolState();
        const keys = Object.keys(existingToolState)
        for (let i = 0; i < this.props.imageIds.length; i++) {
            const imageId = this.props.imageIds[i]
            if (keys.includes(imageId) && this.props.activeVariable.tool in existingToolState[imageId]) {
                const annotations = existingToolState[imageId][this.props.activeVariable.tool].data
                let instanceNumber: number
                if (this.props.instanceNumbers.has(imageId)) {
                    instanceNumber = this.props.instanceNumbers.get(imageId)
                }
                for (let j = 0; j < annotations.length; j++) {
                    const data = annotations[j]
                    let value
                    switch (this.props.activeVariable.type) {
                        case VariableType.seed:
                            value = this._processSeed(data, instanceNumber)
                            break;
                        case VariableType.rectangleRoi:
                            value = this._processRectangleRoi(data, instanceNumber)
                            break;
                        case VariableType.ellipticalRoi:
                            value = this._processEllipticalRoi(data, instanceNumber)
                            break;
                        case VariableType.length:
                            value = this._processLength(data, instanceNumber)
                            break;
                    }
                    const defaultValues = await this._processImage(imageId)
                    value = new TSMap([...Array.from(value.entries()), ...Array.from(defaultValues.entries())])
                    value.set("data", data)
                    currentValues.push(value)
                }
            }
        }
        return currentValues
    }

    _updateVariable = async (keyPressed: string) => {
        let currentValues = []
        if (this.props.activeVariable.type === VariableType.segmentation) {
            currentValues = await this._resolveSegmentation()
        } else if (this.props.activeVariable.type !== VariableType.boolean &&
            this.props.activeVariable.type !== VariableType.integer) {
            currentValues = await this._resolveAnnotations()
        }

        if (this.props.activeVariable.type === VariableType.boolean && (keyPressed === "t" || keyPressed === "f")) {
            const defaultValues = await this._processImage(this.state.currentImageId)
            let value = this._processBoolean(keyPressed)
            value = new TSMap([...Array.from(value.entries()), ...Array.from(defaultValues.entries())])
            this.props.nextVariable([value])
            this._setTools()
        } else if (this.props.activeVariable.type === VariableType.integer && (!isNaN(Number(keyPressed)))) {
            const defaultValues = await this._processImage(this.state.currentImageId)
            let value = this._processInteger(keyPressed)
            value = new TSMap([...Array.from(value.entries()), ...Array.from(defaultValues.entries())])
            this.props.nextVariable([value])
            this._setTools()
        } else {
            // ToDo Handle Enter press during boolean or integer, especially in validation mode
            if (keyPressed === "Enter") {
                this.props.nextVariable(currentValues.slice(0, currentValues.length))
                this._setTools()
            }
        }
    }

    _setTools = () => {
        const activeTool = this.props.activeVariable.tool
        this.state.tools.slice(0, 6).forEach(tool => {
            if (tool.name === activeTool) {
                tool.mode = "Active"
                cornerstoneTools.setToolActive(tool.name, {mouseButtonMask: 1});
            } else {
                tool.mode = "Enabled"
                cornerstoneTools.setToolEnabled(tool.name);
            }
        })
    }

    _deleteAnnotations = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                state
            } = cornerstoneTools.getModule("segmentation");
            state.series = {}
        } else {
            const existingToolState = toolStateManager.saveToolState();
            const keys = Object.keys(existingToolState)
            this.props.imageIds.forEach(imageId => {
                if (keys.includes(imageId) && this.props.activeVariable.tool in existingToolState[imageId]) {
                    const annotations = existingToolState[imageId][this.props.activeVariable.tool].data
                    let annotationsCount = annotations.length
                    while (annotationsCount > 0) {
                        annotations.pop()
                        annotationsCount = annotations.length
                    }
                }
            })
            cornerstoneTools.clearToolState(this.state.cornerstoneElement, this.props.activeVariable.tool);
        }
        cornerstone.updateImage(this.state.cornerstoneElement);
        this.setState({correctionModeEnabled: false})
    }

    _handleKeyPress = (event: Event) => {
        if (event.type === "keydown") {
            this._updateVariable(event.key)
        }
        this._setCorrectionMode(event)
    }

    componentDidMount = () => {
        document.addEventListener("keydown", this._handleKeyPress, false)
        document.addEventListener("keyup", this._handleKeyPress, false)
        this._setInitialTools()
    };

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this._handleKeyPress, false)
        document.addEventListener("keyup", this._handleKeyPress, false)
        this.state.cornerstoneElement.removeEventListener("cornerstonenewimage", this._setCurrentImage);
    }

    componentDidUpdate(prevProps, prevState) {
        if (!prevState.stackStartingImageIds.includes(prevProps.imageIds[0])) {
            prevState.stackStartingImageIds.push(prevProps.imageIds[0])
            this._setInitialTools()
        }
    }

    _setCorrectionMode = (event: ChangeEvent) => {
        if (event.key === "Control") {
            if (event.type === "keydown") {
                this.setState({correctionModeEnabled: true})
            } else {
                this.setState({correctionModeEnabled: false})
            }
        } else {
            let checked = event.target.checked
            if (checked === undefined) {
                checked = false
            }
            this.setState({correctionModeEnabled: checked})
        }
    }

    _setCurrentImage = (event: Event) => {
        const currentImageId = event.detail.image.imageId
        let currentSeriesDescription: string
        this.props.seriesDescriptions.keys().forEach(seriesDescription => {
            this.props.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                if (imageId === currentImageId) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })
        this.setState({
            currentImageId: currentImageId,
            currentSeriesDescription: currentSeriesDescription,
        })
    }

    handleUndoClick = () => {
        const {
            setters,
        } = cornerstoneTools.getModule("segmentation");
        setters.undo(this.state.cornerstoneElement);
    }

    handleResetClick = () => {
        this._deleteAnnotations()
    }

    handleSegmentationTransparencySlider = (event: Event) => {
        const segmentationTransparency = event.target.value
        const { configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlpha = segmentationTransparency/100;
        cornerstone.updateImage(this.state.cornerstoneElement);
        this.setState({segmentationTransparency: segmentationTransparency})
    }

    handleSeriesSelection = async (event: SelectChangeEvent) => {
        const currentSeriesDescription = event.target.value
        const currentImageId = this.props.seriesDescriptions.get(currentSeriesDescription)[0]
        let imageIdIndex: number
        this.props.imageIds.forEach((imageId, index) => {
            if (currentImageId === imageId) {
                imageIdIndex = index
            }
        })
        const image = await cornerstone.loadImage(currentImageId)
        cornerstone.displayImage(this.state.cornerstoneElement, image)
        this.setState({currentSeriesDescription: currentSeriesDescription, imageIdIndex: imageIdIndex})
    }

    renderSeriesSelection = () => {
        return (
            <div>
                <Tooltip title={"Select series by series description"}>
                    <FormControl sx={{width: 250}} size={"small"}>
                        <Select value={this.state.currentSeriesDescription}
                                onChange={event => this.handleSeriesSelection(event)}
                                onClose={() => {
                                    setTimeout(() => {
                                        document.activeElement.blur();
                                    }, 0);
                                }}>
                            {this.props.seriesDescriptions.keys().map((seriesDescription) => (
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

    renderImageSettings = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            return (
                <Stack direction={"row"} sx={{marginBottom: 1}}
                       justifyContent={"flex-start"}
                       alignItems={"center"}
                       spacing={1}
                       divider={<Divider orientation="vertical" flexItem/>}>
                    {this.renderSeriesSelection()}
                    <FormGroup sx={{minWidth: 160}}>
                        <FormControlLabel control={<Switch checked={this.state.correctionModeEnabled}
                                                           value={this.state.correctionModeEnabled}
                                                           onChange={event => this._setCorrectionMode(event)}/>}
                                          label="Correction mode"/>
                    </FormGroup>
                    <Button sx={{minWidth: 80}} onClick={this.handleUndoClick} color="primary" variant="outlined"
                            startIcon={<UndoIcon/>}>
                        Undo
                    </Button>
                    <Button sx={{minWidth: 80}} onClick={this.handleResetClick} color="primary" variant="outlined"
                            startIcon={<RestartAltIcon/>}>
                        Reset
                    </Button>
                    <Box sx={{minWidth: 250, paddingLeft: 1}}>
                        <Stack direction={"row"} alignItems={"center"} justifyContent={"flex-start"}>
                            <Slider aria-label="segmentation-transparency" track={false}
                                    value={this.state.segmentationTransparency} max={100}
                                    onChange={event => this.handleSegmentationTransparencySlider(event)}/>
                            <Typography sx={{marginLeft: 2.5}} id="segmentation-transparency-slider">
                                Segmentation transparency
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            )
        } else if (this.props.activeVariable.type !== VariableType.boolean &&
            this.props.activeVariable.type !== VariableType.integer) {
            return (
                <Stack direction={"row"} sx={{marginBottom: 1}}
                       justifyContent={"flex-start"}
                       alignItems={"center"}
                       spacing={1}
                       divider={<Divider orientation="vertical" flexItem/>}>
                    {this.renderSeriesSelection()}
                    <Tooltip title={"Enable by pressing Control key"}>
                        <FormGroup sx={{minWidth: 160}}>
                            <FormControlLabel control={<Switch checked={this.state.correctionModeEnabled}
                                                               value={this.state.correctionModeEnabled}
                                                               onChange={this._setCorrectionMode}/>}
                                              label="Deletion mode"/>
                        </FormGroup>
                    </Tooltip>
                    <Button onClick={this.handleResetClick} sx={{minWidth: 80}} color="primary" variant="outlined"
                            startIcon={<RestartAltIcon/>}>
                        Reset
                    </Button>
                </Stack>
            )
        } else {
            return (
                <Box sx={{marginBottom: 1}} justifyContent={"flex-start"} alignItems={"center"}>
                    {this.renderSeriesSelection()}
                </Box>
            )
        }
    }

    render() {
        let activeTool = this.props.activeVariable.tool
        if (this.state.correctionModeEnabled && this.props.activeVariable.type === VariableType.segmentation) {
            activeTool = "CorrectionScissors"
        } else if (this.state.correctionModeEnabled && (this.props.activeVariable.type !== VariableType.boolean &&
            this.props.activeVariable.type !== VariableType.integer)) {
            activeTool = "Eraser"
        }
        return (
            <div>
                {
                    this.renderImageSettings()
                }
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{height: "91.5vh"}}
                        tools={this.state.tools}
                        imageIds={this.props.imageIds}
                        imageIdIndex={this.state.imageIdIndex}
                        isPlaying={this.state.isPlaying}
                        frameRate={this.state.frameRate}
                        className={this.state.activeViewportIndex === viewportIndex ? 'active' : ''}
                        activeTool={activeTool}
                        setViewportActive={() => {
                            this.setState({
                                activeViewportIndex: viewportIndex,
                            });
                        }}
                        id={this.state.currentImageId}
                        onElementEnabled={elementEnabledEvt => {
                            const cornerstoneElement = elementEnabledEvt.detail.element;
                            this.setState({cornerstoneElement: cornerstoneElement});
                            cornerstoneElement.addEventListener("cornerstonenewimage", (event: Event) => this._setCurrentImage(event))
                        }}
                    />
                ))}
            </div>
        )
    }

};

export default Image;
