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
    updateAnnotationsCount: Function,
    annotationsCount: number,
}

type ImageStateType = {
    activeViewportIndex: number,
    viewports: number[],
    tools: object[],
    activeTool: string,
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
            {name: 'StackScrollMouseWheel', mode: 'active'},
            {name: 'PanMultiTouch', mode: 'active'},
            {name: 'ZoomTouchPinch', mode: 'active'},
            {name: 'StackScrollMultiTouch', mode: 'active'}
        ]
        let tool: string
        if (this.props.activeVariable.type === VariableType.seed) {
            toolsList.push({name: "Probe", mode: "active", modeOptions: {mouseButtonMask: 1}})
            tool = "Probe"
        }

        this.state = {
            imageIds: [],
            activeViewportIndex: 0,
            viewports: [0],
            tools: toolsList,
            activeTool: tool,
            imageIdIndex: 0,
            isPlaying: false,
            frameRate: 22,
            annotationsCount: 0
        };

    }

    processSeed = (data, instanceNumber: number) => {
        const coordinates = data.cachedStats
        const x = coordinates.x
        const y = coordinates.y
        const seed = new TSMap<string, number>()
        seed.set("x", x)
        seed.set("y", y)
        seed.set("z", instanceNumber)
        return seed
    }

    updateVariable = (keyPressed: string | undefined) => {
        const existingToolState = toolStateManager.saveToolState();
        const keys = Object.keys(existingToolState)
        let annotationsCount = 0
        const currentValues = []
        this.props.imageIds.forEach(imageId => {
            if (keys.includes(imageId)) {
                const annotations = existingToolState[imageId][this.state.activeTool].data
                annotationsCount += annotations.length
                let instanceNumber: number
                if (this.props.instanceNumbers.has(imageId)) {
                    instanceNumber = this.props.instanceNumbers.get(imageId)
                }
                annotations.forEach((data) => {
                    if (this.props.activeVariable.type === VariableType.seed) {
                        //ToDo save data into variable, maybe also connection to series number or serisuid needed?
                        currentValues.push(this.processSeed(data, instanceNumber))
                    }
                })
            }
        })
        const previousAnnotationCount = this.props.annotationsCount
        if (this.props.activeVariable.countType === VariableCountType.static) {
            if (this.props.activeVariable.count + this.props.annotationsCount === annotationsCount) {
                this.props.updateAnnotationsCount(annotationsCount)
                this.props.nextVariable(currentValues.slice(previousAnnotationCount, currentValues.length))
            }
        } else {
            if (keyPressed === "Enter") {
                this.props.updateAnnotationsCount(annotationsCount)
                this.props.nextVariable(currentValues.slice(previousAnnotationCount, currentValues.length))
            }
        }
    }

    handleKeyPress = (event) => this.updateVariable(event.key)

    componentDidMount = () => document.addEventListener("keydown", this.handleKeyPress, false);

    render() {
        return (
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{minWidth: '50%', height: '256px', flex: '1'}}
                        tools={this.state.tools}
                        imageIds={this.props.imageIds}
                        imageIdIndex={this.state.imageIdIndex}
                        isPlaying={this.state.isPlaying}
                        frameRate={this.state.frameRate}
                        className={this.state.activeViewportIndex === viewportIndex ? 'active' : ''}
                        activeTool={this.state.activeTool}
                        setViewportActive={() => {
                            this.setState({
                                activeViewportIndex: viewportIndex,
                            });
                        }}
                        onElementEnabled={elementEnabledEvt => {
                            const cornerstoneElement = elementEnabledEvt.detail.element;
                            this.setState({cornerstoneElement: cornerstoneElement});
                            cornerstoneElement.addEventListener(
                                "cornerstonetoolsmeasurementcompleted",
                                () => {
                                    this.updateVariable()
                                }
                            );
                        }}
                    />
                ))}
            </div>
        )
    }

};

export default Image;
