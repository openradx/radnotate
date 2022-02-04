import React, {Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../AnnotationForm/DicomDropzone/dicomObject";
import cornerstone, {loadImage} from "cornerstone-core";
import Variable, {ToolType, VariableType} from "../AnnotationForm/variable";
import {TSMap} from "typescript-map"
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    MenuItem,
    Select,
    SelectChangeEvent,
    Slider,
    Snackbar,
    Stack,
    Switch,
    Tooltip,
    Typography
} from "@mui/material";
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ReactDOM from "react-dom";
import Queue from "queue-promise";

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
    segmentationsCount: number,
}

type ImageStateType = {
    activeViewportIndex: number,
    viewports: number[],
    tools: object[],
    currentImageIdIndex: number,
    cornerstoneElement: any,
    correctionModeEnabled: boolean,
    segmentationTransparency: number,
    currentImageId: string,
    currentSeriesDescription: string,
    stackStartImageIds: string[],
    snackbarKeyPressedOpen: boolean,
    snackbarKeyPressedText: string,
    keyPressedValue: TSMap<string, string> | undefined,
    openTooltip: boolean,
    enableScrolling: boolean,
    previousScrollingDirection: number,
}

// ToDO Since only 10 colors are provided, segmentationIndex will break whne more than 10 segmentations are wanted.
//  Unlikely, but still needs to be handled in the future
const colors = [
    [222, 117, 26], // orange
    [0, 55, 109], //blue
    [0, 255, 0], //lime green
    [255, 255, 0], //yellow
    [0, 255, 255], //cyan blue
    [255, 0, 0], //red
    [255, 0, 255], //magenta red
    [0, 128, 0], //green
    [128, 0, 0], //maroon red
    [0, 128, 128] //teal blue
]

const awaitTimeout = delay =>
    new Promise(resolve => setTimeout(resolve, delay));


//ToDo Add button to disable rendering of already existing annotations which are currently not active
class Image extends Component<ImagePropsType, ImageStateType> {
    imageIdQueue = new Queue({concurrent: 1, interval: 0, start: true})
    existingAnnotationsCount = new TSMap<string, Object>()

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
            {name: 'StackScrollMultiTouch', mode: 'active'}
        ]

        const {configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlphaInactive = 0

        let currentSeriesDescription: string = ""
        this.props.seriesDescriptions.keys().forEach(seriesDescription => {
            this.props.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                if (imageId === this.props.imageIds[0]) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })

        this.props.toolStates.forEach(annotationToolState => {
            if (annotationToolState.length === 5) {
                const [imageId, patientID, variableID, tool, data] = annotationToolState
                toolStateManager.addImageIdToolState(imageId, tool, data)
                this.existingAnnotationsCount.set(data.uuid, {
                    patientId: patientID,
                    variableId: variableID,
                })
            }
        })

        const stackStartImageIds = []
        stackStartImageIds.push(this.props.imageIds[0])

        this.state = {
            activeViewportIndex: 0,
            viewports: [0],
            tools: toolsList,
            currentImageIdIndex: 0,
            correctionModeEnabled: false,
            segmentationTransparency: 0,
            currentSeriesDescription: currentSeriesDescription,
            stackStartImageIds: stackStartImageIds,
            snackbarKeyPressedOpen: false,
            keyPressedValue: undefined,
            openTooltip: false,
            enableScrolling: false,
        };

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

    _processSegmentation = async (pixelData, imageId: string, instanceNumber: number, segmentationIndex: number) => {
        return await new Promise(resolve => {
            loadImage(imageId).then((image) => {
                const segmentation = new TSMap<string, number | string>()
                const b64encoded = btoa(String.fromCharCode.apply(null, pixelData));
                segmentation.set("z", instanceNumber)
                segmentation.set("pixelData", b64encoded)
                segmentation.set("width", image.width)
                segmentation.set("height", image.height)
                segmentation.set("segmentationIndex", segmentationIndex)
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
        if (keyPressed === "t" || keyPressed === "1") {
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
            state
        } = cornerstoneTools.getModule("segmentation");
        const imageIdState = state.series[this.props.imageIds[0]]
        if (imageIdState !== undefined && imageIdState.labelmaps3D !== undefined) {
            const labelmap3D = imageIdState.labelmaps3D[this.props.activeVariable.segmentationIndex]
            const annotations = labelmap3D.labelmaps2D
            const imageIndices = Object.keys(annotations)
            for (let i = 0; i < imageIndices.length; i++) {
                const imageIndex = imageIndices[i]
                const imageId = this.props.imageIds[Number(imageIndex)]
                const instanceNumber = this.props.instanceNumbers.get(imageId)
                const pixelData = annotations[imageIndex].pixelData
                if (pixelData.some(value => value !== 0)) {
                    const segmentationIndex = this.props.activeVariable.segmentationIndex
                    const segmentation = await this._processSegmentation(pixelData, imageId, instanceNumber, segmentationIndex)
                    const defaultValues = await this._processImage(imageId)
                    const value = new TSMap([...Array.from(segmentation.entries()), ...Array.from(defaultValues.entries())])
                    currentValues.push(value)
                }
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
                const instanceNumber = this.props.instanceNumbers.get(imageId)
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
                    const uuid = data.uuid
                    if (!this.existingAnnotationsCount.has(uuid)) {
                        this.existingAnnotationsCount.set(uuid, {
                            variableId: this.props.activeVariable.id,
                            patientId: this.props.activePatient.patientID
                        })
                        currentValues.push(value)
                    } else {
                        const {variableId, patientId} = this.existingAnnotationsCount.get(uuid)
                        if (variableId === this.props.activeVariable.id && patientId === this.props.activePatient.patientID) {
                            currentValues.push(value)
                        }
                    }
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
        if (this.props.activeVariable.type === VariableType.boolean &&
            (keyPressed.toLowerCase() === "t" ||
                keyPressed.toLowerCase() === "f" ||
                keyPressed === "0" ||
                keyPressed === "1")) {
            const defaultValues = await this._processImage(this.state.currentImageId)
            let value = this._processBoolean(keyPressed.toLowerCase())
            value = new TSMap([...Array.from(value.entries()), ...Array.from(defaultValues.entries())])
            this._setToolActive(this.props.activeVariable.tool)
            let text = '"' + keyPressed + '" key was pressed. "' + String(value.get("value")) + '" successfully recognized as value. Press "Enter" key to confirm.'
            this.setState({snackbarKeyPressedOpen: true, snackbarKeyPressedText: text, keyPressedValue: value})
        } else if (this.props.activeVariable.type === VariableType.integer && (!isNaN(Number(keyPressed)))) {
            const defaultValues = await this._processImage(this.state.currentImageId)
            let value = this._processInteger(keyPressed)
            value = new TSMap([...Array.from(value.entries()), ...Array.from(defaultValues.entries())])
            this._setToolActive(this.props.activeVariable.tool)
            const text = '"' + keyPressed + '" key was pressed and successfully recognized as value. Press "Enter" key to confirm.'
            this.setState({snackbarKeyPressedOpen: true, snackbarKeyPressedText: text, keyPressedValue: value})
        } else if (keyPressed === "Enter") {
            if (this.props.activeVariable.type === VariableType.boolean || this.props.activeVariable.type === VariableType.integer) {
                if (this.state.keyPressedValue === undefined) {
                    this.props.nextVariable([])
                } else {
                    this.props.nextVariable([this.state.keyPressedValue])
                }
                this.setState({keyPressedValue: undefined, snackbarKeyPressedOpen: false})
            } else {
                this.props.nextVariable(currentValues.slice(0, currentValues.length))
            }
            this._setToolActive(this.props.activeVariable.tool)
        }
    }

    _setToolActive = (activeTool: string) => {
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

    _deleteSegmentations(stackStartImageId: string, segmentationIndex: number) {
        const {state} = cornerstoneTools.getModule("segmentation");
        state.series[stackStartImageId].labelmaps3D[segmentationIndex].labelmaps2D = []
        cornerstone.updateImage(this.state.cornerstoneElement);
    }

    _deleteAnnotations = (variableType: VariableType, imageIds: string[] | undefined) => {
        const existingToolState = toolStateManager.saveToolState();
        const deleteAnnotations = (imageId, tool) => {
            const annotations = existingToolState[imageId][tool]
            if (annotations !== undefined) {
                const annotationData = annotations.data
                let annotationsCount = annotationData.length
                while (annotationsCount > 0) {
                    annotationData.pop()
                    annotationsCount = annotationData.length
                }
            }
        }

        const tool = ToolType.get(variableType)
        const imageIdsWithAnnotations = Object.keys(existingToolState)
        if (imageIds === undefined) {
            imageIdsWithAnnotations.forEach(imageId => {
                deleteAnnotations(imageId, tool)
            })
        } else {
            imageIds.forEach(imageId => {
                if (imageIdsWithAnnotations.includes(imageId) && tool in existingToolState[imageId]) {
                    deleteAnnotations(imageId, tool)
                }
            })
        }
        cornerstoneTools.clearToolState(this.state.cornerstoneElement, tool);
        cornerstone.updateImage(this.state.cornerstoneElement);
        this.setState({correctionModeEnabled: false})
    }

    _handleKeyPress = (event: KeyboardEvent) => {
        if (event.type === "keydown") {
            if (event.key === "Escape") {
                const text = '"Escape" key was pressed. Cached value deleted.'
                this.setState({
                    keyPressedValue: new TSMap<string, string>([["value", "Escape"]]),
                    snackbarKeyPressedOpen: true,
                    snackbarKeyPressedText: text
                })
            } else if (event.key.toLowerCase() === "z" && event.ctrlKey) {
                this.handleUndoClick()
            } else if (event.key.toLowerCase() === "y" && event.ctrlKey) {
                this.handleRedoClick()
            } else if (event.key === "Control") {
                this.setState({correctionModeEnabled: true})
                cornerstoneTools.setToolEnabled("Wwwc");
                if (this.props.activeVariable.type !== VariableType.integer && this.props.activeVariable.type !== VariableType.boolean) {
                    cornerstoneTools.setToolActive("Pan", {mouseButtonMask: 2});
                    cornerstoneTools.setToolEnabled("Zoom");
                }
            } else {
                this._updateVariable(event.key)
            }
        } else if (event.type === "keyup") {
            if (event.key === "Control") {
                this.setState({correctionModeEnabled: false})
                cornerstoneTools.setToolActive("Wwwc", {mouseButtonMask: 4});
                if (this.props.activeVariable.type !== VariableType.integer && this.props.activeVariable.type !== VariableType.boolean) {
                    cornerstoneTools.setToolActive("Zoom", {mouseButtonMask: 2});
                    cornerstoneTools.setToolEnabled("Pan");
                }
            }
        }
    }

    _handleMouse = async (event) => {
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
                            currentImageIdIndex < this.props.imageIds.length) {
                            const currentImageId = this.props.imageIds[currentImageIdIndex]
                            this._setCurrentImage(currentImageId)
                        }
                        resolve(true)
                    }))
                }
            }
        }
    }

    componentDidMount = async () => {
        document.addEventListener("keydown", this._handleKeyPress, false)
        document.addEventListener("keyup", this._handleKeyPress, false)
        awaitTimeout(500).then(() => ReactDOM.findDOMNode(this.state.cornerstoneElement).addEventListener("mousedown", this._handleMouse, false))
        awaitTimeout(500).then(() => ReactDOM.findDOMNode(this.state.cornerstoneElement).addEventListener("mouseup", this._handleMouse, false))
        awaitTimeout(500).then(() => ReactDOM.findDOMNode(this.state.cornerstoneElement).addEventListener("mousemove", this._handleMouse, false))
        const {setters} = cornerstoneTools.getModule("segmentation");
        for (let segmentationIndex = 0; segmentationIndex < this.props.segmentationsCount; segmentationIndex++) {
            setters.colorLUT(segmentationIndex, [[...[...colors[segmentationIndex], 255]]])
        }
        awaitTimeout(500).then(() => {
            this._initSegmentation()
            this._setActiveSegmentation()
            this._jumpToImage()
        })

    };

    componentWillUnmount = async () => {
        document.removeEventListener("keydown", this._handleKeyPress, false)
        document.addEventListener("keyup", this._handleKeyPress, false)
        this.state.cornerstoneElement.removeEventListener("cornerstonenewimage", this._setCurrentImage);
    }

    componentDidUpdate = (prevProps, prevState) => { // ORDER MATTERS
        if (!prevState.stackStartImageIds.includes(prevProps.imageIds[0])) { // If an image stack is viewed for the first time
            prevState.stackStartImageIds.push(prevProps.imageIds[0])
            this._initSegmentation()
        }

        if (prevProps.toolStates !== this.props.toolStates) { // If tool state changes
            for (const type of Object.values(VariableType)) {
                if (!isNaN(Number(type))) {
                    if (type === VariableType.segmentation) {
                        this.state.stackStartImageIds.forEach(stackStartImageId => {
                            for (let segmentationIndex = 0; segmentationIndex < this.props.segmentationsCount; segmentationIndex++) {
                                this._deleteSegmentations(stackStartImageId, segmentationIndex)
                            }
                        })
                    } else {
                        this._deleteAnnotations(type, undefined)
                    }
                }
            }
            this.existingAnnotationsCount = new TSMap<string, Object>()
        }

        if (prevProps.activeVariable.id !== this.props.activeVariable.id ||
            prevProps.activePatient.patientID !== this.props.activePatient.patientID) { // If active cell changes
            this._setActiveSegmentation()
        }

        if (prevProps.activePatient.patientID !== this.props.activePatient.patientID) { // If active patient changes
            awaitTimeout(500).then(() => this._jumpToImage())
        } else if (prevProps.activeVariable.id !== this.props.activeVariable.id) { // Or if only active variable changes within same patient
            this._jumpToImage()
        }
    }

    _jumpToImage = async () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {state} = cornerstoneTools.getModule("segmentation");
            const imageIdState = state.series[this.props.imageIds[0]]
            if (imageIdState !== undefined) {
                const labelmap3D = imageIdState.labelmaps3D[this.props.activeVariable.segmentationIndex]
                if (labelmap3D !== undefined && labelmap3D.labelmaps2D.length > 0) {
                    const imageIndices = Object.keys(labelmap3D.labelmaps2D)
                    let imageIndex = imageIndices[0]
                    if (!labelmap3D.labelmaps2D[imageIndex].pixelData.some(value => value === 1)) {
                        imageIndex = imageIndices[1]
                    }
                    const imageId = this.props.imageIds[Number(imageIndex)]
                    const image = await cornerstone.loadImage(imageId)
                    cornerstone.displayImage(this.state.cornerstoneElement, image)
                    this._setCurrentImage(imageId)
                }
            }
        } else if (this.props.activeVariable.type !== VariableType.boolean &&
            this.props.activeVariable.type !== VariableType.integer) {
            const existingToolState = toolStateManager.saveToolState();
            const imageIds = Object.keys(existingToolState)
            let imageId: string
            let stack = [...this.props.imageIds]
            stack = stack.reverse()
            stack.forEach(currentImageId => {
                if (imageIds.includes(currentImageId) && this.props.activeVariable.tool in existingToolState[currentImageId]) {
                    imageId = currentImageId
                }
            })
            if (imageId !== undefined) {
                this._setCurrentImage(imageId)
            }
        }
    }

    _initSegmentation = () => {
        const {getters, setters} = cornerstoneTools.getModule("segmentation");
        this.props.toolStates.forEach(annotationToolState => {
            if (annotationToolState.length === 7) {
                const [imageId, patientID, variableID, height, width, pixelData, segmentationIndex] = annotationToolState
                let imageIdIndex
                this.props.imageIds.forEach((currentImageId, index) => {
                    if (currentImageId === imageId) {
                        imageIdIndex = index
                    }
                })
                if (imageIdIndex !== undefined) {
                    setters.activeSegmentIndex(this.state.cornerstoneElement, segmentationIndex)
                    setters.activeLabelmapIndex(this.state.cornerstoneElement, segmentationIndex);
                    const {labelmap3D} = getters.labelmap2D(this.state.cornerstoneElement);
                    const l2dforImageIdIndex = getters.labelmap2DByImageIdIndex(
                        labelmap3D,
                        imageIdIndex,
                        width,
                        height
                    );
                    l2dforImageIdIndex.pixelData = pixelData
                    setters.colorLUTIndexForLabelmap3D(labelmap3D, segmentationIndex)
                    setters.updateSegmentsOnLabelmap2D(l2dforImageIdIndex);
                    setters.activeLabelmapIndex(this.state.cornerstoneElement, 0);
                }
            }
        })
        cornerstone.updateImage(this.state.cornerstoneElement);
    }

    _setActiveSegmentation = () => {
        const {setters, configuration, getters} = cornerstoneTools.getModule("segmentation");
        const segmentationTransparency = this.state.segmentationTransparency
        configuration.fillAlpha = segmentationTransparency / 100
        const segmentationIndex = this.props.activeVariable.segmentationIndex
        if (segmentationIndex !== undefined) {
            setters.activeLabelmapIndex(this.state.cornerstoneElement, segmentationIndex);
            setters.colorLUTIndexForLabelmap3D(getters.labelmap3D(this.state.cornerstoneElement, segmentationIndex), segmentationIndex)
        } else {
            setters.activeLabelmapIndex(this.state.cornerstoneElement, -1);
        }
        cornerstone.updateImage(this.state.cornerstoneElement);
    }

    _setCurrentImage = (currentImageId: string) => {
        let currentSeriesDescription: string
        this.props.seriesDescriptions.keys().forEach(seriesDescription => {
            this.props.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                if (imageId === currentImageId) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })
        let currentImageIndex: number
        this.props.imageIds.forEach((imageId, index) => {
            if (imageId === currentImageId) {
                currentImageIndex = index
            }
        })
        this.setState({
            currentImageId: currentImageId,
            currentImageIdIndex: currentImageIndex,
            currentSeriesDescription: currentSeriesDescription,
        })
        cornerstone.updateImage(this.state.cornerstoneElement);
    }

    handleUndoClick = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                setters,
            } = cornerstoneTools.getModule("segmentation");
            setters.undo(this.state.cornerstoneElement);
        }
    }

    handleRedoClick = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                setters,
            } = cornerstoneTools.getModule("segmentation");
            setters.redo(this.state.cornerstoneElement);
        }
    }

    handleResetClick = () => {
        const variableType = this.props.activeVariable.type
        if (variableType === VariableType.segmentation) {
            const stackStartImageId = this.props.imageIds[0]
            const segmentationIndex = this.props.activeVariable.segmentationIndex
            this._deleteSegmentations(stackStartImageId, segmentationIndex)
        } else {
            this._deleteAnnotations(variableType, this.props.imageIds)
        }
    }

    handleSegmentationTransparencySlider = (event: Event | number) => {
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
        this.setState({
            currentSeriesDescription: currentSeriesDescription,
            currentImageIdIndex: imageIdIndex,
            openTooltip: false
        })
    }

    renderSeriesSelection = () => {
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
        const setCorrectionMode = (event) => {
            if (event.target.checked) {
                this.setState({correctionModeEnabled: true})
            } else {
                this.setState({correctionModeEnabled: false})
            }
        }
        if (this.props.activeVariable.type === VariableType.segmentation) {
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
                                                               onChange={setCorrectionMode}/>}
                                              label="Correction mode"/>
                        </FormGroup>
                    </Tooltip>
                    <Button sx={{minWidth: 80}} onClick={this.handleUndoClick} color="primary" variant="outlined"
                            startIcon={<UndoIcon/>}>
                        Undo
                    </Button>
                    <Button sx={{minWidth: 80}} onClick={this.handleRedoClick} color="primary" variant="outlined"
                            startIcon={<RedoIcon/>}>
                        Redo
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
                                                               onChange={setCorrectionMode}/>}
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
                        imageIdIndex={this.state.currentImageIdIndex}
                        isPlaying={false}
                        frameRate={22}
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
                            cornerstoneElement.addEventListener("cornerstonenewimage", async (event: Event) => {
                                const currentImageId = event.detail.image.imageId
                                this._setCurrentImage(currentImageId)
                            })
                        }}
                    />
                ))}
                <Snackbar open={this.state.snackbarKeyPressedOpen}
                          autoHideDuration={6000}
                          anchorOrigin={{vertical: "top", horizontal: "right"}}
                          onClose={() => this.setState({snackbarKeyPressedOpen: false})}>
                    <Alert severity="success">
                        {this.state.snackbarKeyPressedText}
                    </Alert>
                </Snackbar>
            </div>
        )
    }

};

export default Image;
