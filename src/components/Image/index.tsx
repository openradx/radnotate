import React, {Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../DicomDropzone/dicomObject";
import cornerstone from "cornerstone-core";
import Variable, {VariableCountType, VariableType} from "../Annotation/AnnotationForm/variable";
import {TSMap} from "typescript-map"

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
            {name: "Probe", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: "RectangleRoi", mode: "active", modeOptions: {mouseButtonMask: 1}},
            {name: 'StackScrollMouseWheel', mode: 'active'},
            {name: 'PanMultiTouch', mode: 'active'},
            {name: 'ZoomTouchPinch', mode: 'active'},
            {name: 'StackScrollMultiTouch', mode: 'active'}
        ]
        // toolsList.forEach(tool => {
        //     if (tool.name === this.props.activeVariable.tool) {
        //         tool.mode = "active"
        //     }
        // })
        this.state = {
            activeViewportIndex: 0,
            viewports: [0],
            tools: toolsList,
            imageIdIndex: 0,
            isPlaying: false,
            frameRate: 22,
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

    _processRoi = (data, instanceNumber: number) => {
        const coordinates = data.handles
        const seed = new TSMap<string, number>()
        seed.set("x1", parseInt(coordinates.start.x))
        seed.set("y1", parseInt(coordinates.start.y))
        seed.set("x2", parseInt(coordinates.end.x))
        seed.set("y2", parseInt(coordinates.end.y))
        seed.set("z", instanceNumber)
        return seed
    }

    _updateVariable = (keyPressed: string | undefined) => {
        const existingToolState = toolStateManager.saveToolState();
        const keys = Object.keys(existingToolState)
        let annotationsCount = 0
        const currentValues = []
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
                        case VariableType.roi:
                            currentValues.push(this._processRoi(data, instanceNumber))
                            break;
                    }
                })
            }
        })
        const previousAnnotationCount = this.props.annotationsCount
        if (this.props.activeVariable.countType === VariableCountType.static) {
            if (this.props.activeVariable.count === annotationsCount) {
                this._deleteAnnotations()
                this.props.nextVariable(currentValues.slice(previousAnnotationCount, currentValues.length))
            }
        } else {
            if (keyPressed === "Enter") {
                this._deleteAnnotations()
                this.props.nextVariable(currentValues.slice(previousAnnotationCount, currentValues.length))
            }
        }

    }

    _deleteAnnotations = () => {
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
        cornerstone.updateImage(this.state.cornerstoneElement);
    }

    _handleKeyPress = (event) => this._updateVariable(event.key)

    componentDidMount = () => document.addEventListener("keydown", this._handleKeyPress, false);

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this._handleKeyPress, false)
        this.state.cornerstoneElement.removeEventListener("cornerstonetoolsmeasurementcompleted", this._updateVariable);
    }

    render() {
        return (
            <div>
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{height: '98vh'}}
                        tools={this.state.tools}
                        imageIds={this.props.imageIds}
                        imageIdIndex={this.state.imageIdIndex}
                        isPlaying={this.state.isPlaying}
                        frameRate={this.state.frameRate}
                        className={this.state.activeViewportIndex === viewportIndex ? 'active' : ''}
                        activeTool={this.props.activeVariable.tool}
                        setViewportActive={() => {
                            this.setState({
                                activeViewportIndex: viewportIndex,
                            });
                        }}
                        onElementEnabled={elementEnabledEvt => {
                            const cornerstoneElement = elementEnabledEvt.detail.element;
                            this.setState({cornerstoneElement: cornerstoneElement});
                            cornerstoneElement.addEventListener("cornerstonetoolsmeasurementcompleted", this._updateVariable);
                        }}
                    />
                ))}
            </div>
        )
    }

};

export default Image;
