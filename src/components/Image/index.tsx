import React, {Component} from "react";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import Hammer from "hammerjs";
import CornerstoneViewport from "react-cornerstone-viewport";
import {Patient} from "../DicomDropzone/dicomObject";
import cornerstone from "cornerstone-core";


cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: true,
    globalToolSyncEnabled: false,
    showSVGCursors: false
});

type ImagePropsType = {
    activePatient: Patient
}

class Image extends Component<ImagePropsType, any> {

    constructor(props: ImagePropsType) {
        super(props);
        this.state = {
            activeViewportIndex: 0,
            viewports: [0],
            tools: [
                {
                    name: 'Wwwc',
                    mode: 'active',
                    modeOptions: {mouseButtonMask: 1},
                },
                {
                    name: 'Zoom',
                    mode: 'active',
                    modeOptions: {mouseButtonMask: 2},
                },
                {
                    name: 'Pan',
                    mode: 'active',
                    modeOptions: {mouseButtonMask: 4},
                },
                'Length',
                'Angle',
                'Bidirectional',
                'FreehandRoi',
                'Eraser',
                {name: 'StackScrollMouseWheel', mode: 'active'},
                {name: 'PanMultiTouch', mode: 'active'},
                {name: 'ZoomTouchPinch', mode: 'active'},
                {name: 'StackScrollMultiTouch', mode: 'active'},
            ],
            activeTool: 'Wwwc',
            imageIdIndex: 0,
            isPlaying: false,
            frameRate: 22,
        };

    }

    render() {
        const imageIds: String[] = []
        this.props.activePatient.studies.forEach((study) => {
            study.series.forEach((series) => {
                series.images.forEach((image) => {
                    imageIds.push(image.imageID)
                })
            })
        })
        return (
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
                {this.state.viewports.map(viewportIndex => (
                    <CornerstoneViewport
                        key={viewportIndex}
                        style={{minWidth: '50%', height: '256px', flex: '1'}}
                        tools={this.state.tools}
                        imageIds={imageIds}
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
                    />
                ))}
            </div>
        )
    }

};

export default Image;
