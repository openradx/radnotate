import React, {Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../DicomDropzone/dicomObject";
import cornerstone from "cornerstone-core";
import Variable, {VariableType} from "../Annotation/AnnotationForm/variable";


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
    activePatient: Patient
    activeVariable: Variable
}

type ImageStateType = {
    activeViewportIndex: number,
    viewports: number[],
    tools: object[],
    activeTool: string,
    imageIdIndex: number,
    isPlaying: boolean,
    frameRate: number,
    imageIds: string[],
    instanceNumbers: Map<string, number>,
    cornerstoneElement: any
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
            frameRate: 22
        };

    }

    processSeed = (data, instanceNumber: number) => {
        const coordinates = data["cachedStats"]
        const x = coordinates["x"]
        const y = coordinates["y"]
        console.log(x)
        console.log(y)
        console.log(instanceNumber)
    }

    updateVariable = () => {
        const existingToolState = toolStateManager.saveToolState();
        const keys = Object.keys(existingToolState);
        keys.forEach(imageId => {
            const annotations = existingToolState[imageId][this.state.activeTool]["data"]
            const annotationsCount = annotations.length
            let instanceNumber: number
            if (this.state.instanceNumbers.has(imageId)) {
                instanceNumber = this.state.instanceNumbers.get(imageId)
            }
            annotations.forEach((data) => {
                if (this.props.activeVariable.type === VariableType.seed) {
                //ToDo save data into variable, maybe also connection to series number or serisuid needed?
                    this.processSeed(data, instanceNumber)
                }
            })
        })
    }

    updatePatient = () => {
        let imageIds: string[] = []
        let instanceNumbers: Map<string, number> = new Map<string, number>()
        this.props.activePatient.studies.forEach((study) => {
            study.series.forEach((series) => {
                let imageIdsTemp = new Array<string>(series.images.length)
                series.images.forEach((image) => {
                    imageIdsTemp[image.instanceNumber - 1] = image.imageID
                    instanceNumbers.set(image.imageID, image.instanceNumber);
                })
                imageIds = [...imageIds, ...imageIdsTemp]
            })
        })
        this.setState({imageIds: imageIds, instanceNumbers: instanceNumbers})
    }

    componentWillMount = () => this.updatePatient()

    render() {

        return (
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{minWidth: '50%', height: '256px', flex: '1'}}
                        tools={this.state.tools}
                        imageIds={this.state.imageIds}
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
                                'cornerstoneimagerendered',
                                () => this.updateVariable()
                            );
                        }}
                    />
                ))}
            </div>
        )
    }

};

export default Image;
