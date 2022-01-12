import React, {Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../AnnotationForm/DicomDropzone/dicomObject";
import cornerstone, {getImage, loadImage} from "cornerstone-core";
import Variable, {VariableCountType, VariableType} from "../AnnotationForm/variable";
import {TSMap} from "typescript-map"
import {FormControlLabel, FormGroup, Switch} from "@mui/material";
import {result} from "lodash";

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
    width: number
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
}

class Image extends Component<ImagePropsType, ImageStateType> {

    constructor(props: ImagePropsType) {
        super(props);

        const toolsList = [
            {
                name: 'Wwwc',
                mode: 'active',
                modeOptions: {mouseButtonMask: 4},
            },
            {
                name: 'Zoom',
                mode: 'active',
                modeOptions: {mouseButtonMask: 2},
            },
            {name: 'Pan', mode: 'active', modeOptions: {mouseButtonMask: 1}},
            {name: "Probe", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "RectangleRoi", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "EllipticalRoi", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "Length", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "FreehandScissors", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "CorrectionScissors", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: 'StackScrollMouseWheel', mode: 'active'},
            {name: 'ZoomTouchPinch', mode: 'active'},
            {name: 'StackScrollMultiTouch', mode: 'active'}
        ]
        this.state = {
            activeViewportIndex: 0,
            viewports: [0],
            tools: toolsList,
            imageIdIndex: 0,
            isPlaying: false,
            frameRate: 22,
            correctionModeEnabled: false
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
        seed.set("x1", parseInt(coordinates.start.x))
        seed.set("y1", parseInt(coordinates.start.y))
        seed.set("x2", parseInt(coordinates.end.x))
        seed.set("y2", parseInt(coordinates.end.y))
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

    _processSegmentation = async (pixelData, imageId:string ,instanceNumber: number) => {
        return await new Promise(resolve => {
            loadImage(imageId).then((image) => {
                const segmentation = new TSMap<string, number>()
                const decoder = new TextDecoder("utf8")
                const b64encoded = btoa(decoder.decode(pixelData))
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

    _updateVariable = (keyPressed: string | undefined) => {
        let annotationsCount = 0
        new Promise(resolve => {
            const currentValues = []
            if (this.props.activeVariable.type === VariableType.segmentation) {
                const {
                    getters,
                    setters,
                    configuration,
                    state
                } = cornerstoneTools.getModule("segmentation");
                const annotations = state.series[this.props.imageIds[0]].labelmaps3D[0].labelmaps2D
                const imageIndices = Object.keys(annotations)
                annotationsCount += imageIndices.length
                imageIndices.forEach(imageIndex => {
                    const imageId = this.props.imageIds[Number(imageIndex)]
                    const instanceNumber = this.props.instanceNumbers.get(imageId)
                    const pixelData = annotations[imageIndex].pixelData
                    this._processSegmentation(pixelData, imageId, instanceNumber).then((segmentation) => {
                        currentValues.push(segmentation)
                        resolve(currentValues)
                    })
                })
            } else if (this.props.activeVariable.type !== VariableType.boolean &&
                this.props.activeVariable.type !== VariableType.integer) {
                const existingToolState = toolStateManager.saveToolState();
                const keys = Object.keys(existingToolState)
                this.props.imageIds.forEach(imageId => {
                    if (keys.includes(imageId) && this.props.activeVariable.tool in existingToolState[imageId]) {
                        const annotations = existingToolState[imageId][this.props.activeVariable.tool].data
                        annotationsCount += annotations.length
                        let instanceNumber: number
                        if (this.props.instanceNumbers.has(imageId)) {
                            instanceNumber = this.props.instanceNumbers.get(imageId)
                        }
                        annotations.forEach((data) => {
                            //ToDo save data into variable, maybe also connection to series number or serisuid needed?
                            switch (this.props.activeVariable.type) {
                                case VariableType.seed:
                                    currentValues.push(this._processSeed(data, instanceNumber))
                                    break;
                                case VariableType.rectangleRoi:
                                    currentValues.push(this._processRectangleRoi(data, instanceNumber))
                                    break;
                                case VariableType.ellipticalRoi:
                                    currentValues.push(this._processEllipticalRoi(data, instanceNumber))
                                    break;
                                case VariableType.length:
                                    currentValues.push(this._processLength(data, instanceNumber))
                                    break;
                            }
                        })
                    }
                })
                resolve(currentValues)
            } else {
                resolve(currentValues)
            }
        }).then((currentValues) => {
            if (this.props.activeVariable.countType === VariableCountType.static) {
                if (this.props.activeVariable.type === VariableType.boolean && (keyPressed === "t" || keyPressed === "f")) {
                    this.props.nextVariable([this._processBoolean(keyPressed)])
                } else if (this.props.activeVariable.type === VariableType.integer && (!isNaN(Number(keyPressed)))) {
                    this.props.nextVariable([this._processInteger(keyPressed)])
                }
                if (this.props.activeVariable.count === annotationsCount) {
                    this._deleteAnnotations()
                    this.props.nextVariable(currentValues.slice(0, currentValues.length))
                }
            } else {
                if (keyPressed === "Enter") {
                    this._deleteAnnotations()
                    this.props.nextVariable(currentValues.slice(0, currentValues.length))
                }
            }
        })
    }

    _deleteAnnotations = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            const {
                getters,
                setters,
                configuration,
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

    _handleKeyPress = (event) => this._updateVariable(event.key)

    componentDidMount = () => document.addEventListener("keydown", this._handleKeyPress, false);

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this._handleKeyPress, false)
        this.state.cornerstoneElement.removeEventListener("cornerstonetoolsmeasurementcompleted", this._updateVariable);
    }

    setCorrectionMode = (event: Event) => {
        this.setState({correctionModeEnabled: event.target.checked})
    }

    renderSegmentationSettings = () => {
        if (this.props.activeVariable.type === VariableType.segmentation) {
            return(
                <FormGroup>
                    <FormControlLabel control={<Switch checked={this.state.correctionModeEnabled} onChange={this.setCorrectionMode}/>} label="Correction mode" />
                </FormGroup>
            )
        }
    }

    render() {
        let height = "98vh"
        if(this.props.activeVariable.type === VariableType.segmentation) {
            height = "94vh"
        }
        let activeTool = this.props.activeVariable.tool
        if (this.state.correctionModeEnabled) {
            activeTool = "CorrectionScissors"
        }
        return (
            <div>
                {
                    this.renderSegmentationSettings()
                }
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{height: height}}
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
                        onElementEnabled={elementEnabledEvt => {
                            const cornerstoneElement = elementEnabledEvt.detail.element;
                            this.setState({cornerstoneElement: cornerstoneElement});
                            cornerstoneElement.addEventListener("cornerstonetoolsmouseup", this._updateVariable);
                            cornerstoneElement.addEventListener("cornerstonetoolsmeasurementcompleted", this._updateVariable);
                        }}
                    />
                ))}
            </div>
        )
    }

};

export default Image;
