import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { RadnotateState, ToolState, ToolType, useRadnotateStore } from "../../..";
import Variable, { VariableType, VariableToolType } from "../../../Form/variable";
import Hammer from "hammerjs";
import cornerstone from "cornerstone-core";
import CornerstoneViewport from "react-cornerstone-viewport";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import useStateRef from "react-usestateref";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";
import { ImageStack, ImageState, useImageStore} from "..";
import { useToolStateStore } from "./store";
import deepClone from 'deep-clone';
import {applyPatches} from "immer";


cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneTools.init();

const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

// TODO Since only 10 colors are provided, segmentationIndex will break whne more than 10 segmentations are wanted.
//  Unlikely, but still needs to be handled in the future
const colors = [
    [232, 88, 24], // orange
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

const awaitTimeout = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

type ViewportProps = {
    imageStack: ImageStack
}

export type SegmentationToolState = {
    patientID: string,
    variableID: number,
    imageId: string,
    height: number,
    width: number,
    pixelData: Uint8Array,
    segmentationIndex: number
}

export type AnnotationToolState = {
    patientID: string,
    variableID: number,
    imageId: string,
    tool: string,
    data: Object
}

export const Viewport = (props: ViewportProps): ReactElement => {
    const variables: Variable[] = useRadnotateStore((state: RadnotateState) => state.variables)
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activePatientRef = useRef(activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    const activeVariableRef = useRef(activeVariable)

    const { undoPatches, redoPatches, toolStates, setToolStates, clearToolStates, previousAnnotations, addPreviousAnnotation, inactiveToolStates, addInactiveToolStates} = useToolStateStore()
    const toolStatesRef = useRef(toolStates)

    const [, setSegmentationToolStates, segmentationToolStatesRef] = useStateRef<ToolState[]>([])

    const segmentationTransparency = useImageStore((state: ImageState) => state.segmentationTransparency)
    const undo = useImageStore((state: ImageState) => state.undo)
    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const redo = useImageStore((state: ImageState) => state.redo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const reset = useImageStore((state: ImageState) => state.reset)
    const setReset = useImageStore((state: ImageState) => state.setReset)
    const correctionMode = useImageStore((state: ImageState) => state.correctionMode)
    const correctionModeRef = useRef(correctionMode)
    const setActiveSeries = useImageStore((state: ImageState) => state.setActiveSeries)
    
    const [viewport, setViewport, viewportRef] = useStateRef<any>()
    const [activeViewport, setActiveViewport] = useState<number>(0)
    const [tools,] = useState<object[]>(
        [
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
    )
    const [activeTool, setActiveTool] = useState<string>(() => {
        if (activeVariable !== null) {
            return activeVariable.tool
        } else {
            return ""
        }
    })
    const imageStackRef = useRef(props.imageStack
        )
    const activeImageID = useImageStore((state: ImageState) => state.activeImageID)
    const setActiveImageID = useImageStore((state: ImageState) => state.setActiveImageID)
    const [currentImageIDIndex, setCurrentImageIDIndex] = useState<number>(0)

    useEffect(() => {
        const {setters, configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlphaInactive = 0
        let segmentationIndex = 0
        variables.forEach((variable: Variable) => {
            if (variable.type == VariableType.segmentation) {
                setters.colorLUT(segmentationIndex, [[...[...colors[segmentationIndex], 255]]])
                segmentationIndex++
            }
        })

        const segmentationToolStates: ToolState[] = []
        toolStates.forEach((toolState: ToolState) => {
            if (toolState.type === ToolType.annotation) {
                // @ts-ignore
                const {type, patientID, variableID, imageID, variableType, data} = toolState
                toolStateManager.addImageIdToolState(imageID, data.tool, data.data)
            } else {
                segmentationToolStates.push(toolState)   
            }
        })
        setToolStates([])
        setSegmentationToolStates(segmentationToolStates)
    }, [])

    useEffect(() => {
        imageStackRef.current = props.imageStack
    }, [props.imageStack])

    useEffect(() => {
        clearToolStates()
        activePatientRef.current = activePatient
        awaitTimeout(500).then(() => {
            _initSegmentations(activePatient, imageStackRef.current.imageIDs, segmentationToolStatesRef.current)
            _setActiveSegmentation(activeVariable)
            _jumpToImage(activeVariable, imageStackRef.current.imageIDs)
             _setToolStates()
        })
    }, [activePatient])

    useEffect(() => {
        if (activeVariable !== null) {
            clearToolStates()
            tools.slice(0, 6).forEach((tool: {name: string, mode: string}) => {
                if (tool.name === activeVariable.tool) {
                    tool.mode = "Active"
                    setActiveTool(tool.name)
                    cornerstoneTools.setToolActive(tool.name, {mouseButtonMask: 1});
                } else {
                    tool.mode = "Enabled"
                    cornerstoneTools.setToolEnabled(tool.name);
                }
            })
            if (activeVariableRef.current !== activeVariable) {
                _setActiveSegmentation(activeVariable)
                _jumpToImage(activeVariable, props.imageStack.imageIDs)
            }
            activeVariableRef.current = activeVariable
            _setToolStates()
        } else {
            activeVariableRef.current = activeVariable
        }
    }, [activeVariable])

    useEffect(() => {
        let currentImageIndex: number = 0
        props.imageStack.imageIDs.forEach((imageID, index) => {
            if (imageID === activeImageID) {
                currentImageIndex = index
            }
        })
        let currentSeriesDescription: string = ""
        props.imageStack.seriesDescriptions.keys().forEach(seriesDescription => {
            props.imageStack.seriesDescriptions.get(seriesDescription).forEach(imageID => {
                if (imageID === activeImageID) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })
        setCurrentImageIDIndex(currentImageIndex)
        setActiveSeries(currentSeriesDescription)
        cornerstone.updateImage(viewportRef.current);
    }, [activeImageID])

    useEffect(() => {
        if (undo) {
            if (activeVariable.type === VariableType.segmentation) {
                const {setters} = cornerstoneTools.getModule("segmentation");
                setters.undo(viewport);
                _setToolStates()
                setUndo(false)
            } else if (activeVariable.type !== VariableType.boolean && activeVariable.type !== VariableType.integer) {
                const undo = undoPatches.pop()
                if (undo) {
                    const nextToolStates = applyPatches(toolStates, [undo])
                    setToolStates(nextToolStates, undo)
                }
            }
        } 
    }, [undo])

    useEffect(() => { 
        if (redo) {
            if (activeVariable.type === VariableType.segmentation) {
                const {setters} = cornerstoneTools.getModule("segmentation");
                setters.redo(viewport);
                _setToolStates()
            } else if (activeVariable.type !== VariableType.boolean && activeVariable.type !== VariableType.integer) {
                const redo = redoPatches.pop()
                if (redo) {
                    const nextToolStates = applyPatches(toolStates, [redo])
                    setToolStates(nextToolStates)
                }
            }
            setRedo(false)
        }
    }, [redo])

    useEffect(() => {
        if (correctionMode) {
            if (activeVariable.type === VariableType.segmentation) {
                cornerstoneTools.setToolActive("CorrectionScissors", {mouseButtonMask: 1})
            } else if (activeVariable.type !== VariableType.integer && activeVariable.type !== VariableType.boolean) {
                cornerstoneTools.setToolActive("Eraser", {mouseButtonMask: 1})
                cornerstoneTools.setToolEnabled("Wwwc");
                cornerstoneTools.setToolActive("Pan", {mouseButtonMask: 2});
                cornerstoneTools.setToolEnabled("Zoom");
            }
        } else {
            if (activeVariable.type === VariableType.segmentation) {
                cornerstoneTools.setToolActive(activeVariable.tool, {mouseButtonMask: 1})
            } else if (activeVariable.type !== VariableType.integer && activeVariable.type !== VariableType.boolean) {
                cornerstoneTools.setToolActive(activeVariable.tool, {mouseButtonMask: 1})
                cornerstoneTools.setToolActive("Wwwc", {mouseButtonMask: 4});
                cornerstoneTools.setToolActive("Zoom", {mouseButtonMask: 2});
                cornerstoneTools.setToolEnabled("Pan");
            }
        }
        correctionModeRef.current = correctionMode
    }, [correctionMode])

    useEffect(() => {
        if (reset) {
            if (activeVariable.type === VariableType.segmentation) {
                const {state, setters} = cornerstoneTools.getModule("segmentation");
                const imageIDState = state.series[imageStackRef.current.imageIDs[0]]
                if (imageIDState !== undefined && imageIDState.labelmaps3D !== undefined) {
                    // @ts-ignore
                    const labelmaps3D = imageIDState.labelmaps3D[activeVariable.segmentationIndex]
                    while(labelmaps3D.undo.length) {
                        setters.undo(viewport);
                    }
                }
                setToolStates([])
                setReset(false)
            } else if (activeVariable.type !== VariableType.boolean && activeVariable.type !== VariableType.integer) {
                setToolStates([])
            }
        }
    }, [reset])

    useEffect(() => {
        console.log(toolStates)
        if (toolStates.length > 0 || undo || reset) {
            setUndo(false)
            setReset(false)
            _deleteAnnotations(activePatient, activeVariable, imageStackRef.current.imageIDs)
            toolStates.forEach((toolState: ToolState) => {
                if (toolState.type === ToolType.annotation) {
                    const {type, patientID, variableID, imageID, variableType, data} = deepClone(toolState)
                    // @ts-ignore
                    toolStateManager.addImageIdToolState(imageID, data.tool, data.data)
                    // @ts-ignore
                    addPreviousAnnotation(data.data.uuid, variableID, patientID)
                } 
            })
        }
        toolStatesRef.current = toolStates
        cornerstone.updateImage(viewportRef.current)
    }, [toolStates])

    useEffect(() => {
        if (viewport !== undefined) {
            viewport.addEventListener("cornerstonenewimage", async (event: {detail: {image: {imageId: string}}}) => setActiveImageID(event.detail.image.imageId))
            viewport.addEventListener("cornerstonetoolsmouseup", () => _setToolStates())
            viewport.addEventListener("cornerstonetoolsmouseclick", () => _setToolStates())

            return () => {
                viewport.removeEventListener("cornerstonenewimage", async (event: {detail: {image: {imageId: string}}}) => setActiveImageID(event.detail.image.imageId))
                viewport.removeEventListener("cornerstonetoolsmouseup", () => _setToolStates())
                viewport.removeEventListener("cornerstonetoolsmouseclick", () => _setToolStates())
            }
        }
    }, [viewport])

    useEffect(() => {
        const {configuration} = cornerstoneTools.getModule("segmentation")
        configuration.fillAlpha = segmentationTransparency / 100
        cornerstone.updateImage(viewportRef.current)
    }, [segmentationTransparency])

    const _initSegmentations = (activePatient: Patient, imageIDs: string[], segmentationToolStates: ToolState[]) => {
        const {getters, setters} = cornerstoneTools.getModule("segmentation");
        const deleteIndices: number[] = []
        segmentationToolStates.forEach((toolState: ToolState, index: number) => {
            if (toolState.type === ToolType.segmentation) {
                if (toolState.patientID === activePatient.patientID) {
                    const segmentationIndex = (toolState.data as SegmentationToolState).segmentationIndex
                    if (segmentationIndex >= 0) {
                        const {imageID, data} = toolState
                        let imageIDIndex: number | undefined = undefined
                        imageIDs.forEach((currentImageID, index) => {
                            if (currentImageID === imageID) {
                                imageIDIndex = index
                            }
                        })
                        if (imageIDIndex !== undefined) {
                            setters.activeSegmentIndex(viewportRef.current, segmentationIndex)
                            setters.activeLabelmapIndex(viewportRef.current, segmentationIndex);
                            const {labelmap3D} = getters.labelmap2D(viewportRef.current);
                            const l2dforImageIdIndex = getters.labelmap2DByImageIdIndex(
                                labelmap3D,
                                imageIDIndex,
                                data.width,
                                data.height
                            );
                            l2dforImageIdIndex.pixelData = data.pixelData
                            setters.colorLUTIndexForLabelmap3D(labelmap3D, segmentationIndex)
                            setters.updateSegmentsOnLabelmap2D(l2dforImageIdIndex);
                            setters.activeLabelmapIndex(viewportRef.current, 0);
                            deleteIndices.push(index)
                        }
                    }
                }
            }
        })
        if (deleteIndices.length > 0) {
            segmentationToolStates.splice(deleteIndices[0], deleteIndices.length)
            setSegmentationToolStates(segmentationToolStates)
        }
        cornerstone.updateImage(viewportRef.current);
    }

    const _setActiveSegmentation = (activeVariable: Variable) => {
        if (viewportRef.current !== undefined) {
            const {setters, configuration, getters} = cornerstoneTools.getModule("segmentation");
            configuration.fillAlpha = segmentationTransparency / 100
            if (activeVariable !== null && activeVariable.segmentationIndex !== undefined) {
                setters.activeLabelmapIndex(viewportRef.current, activeVariable.segmentationIndex);
                setters.colorLUTIndexForLabelmap3D(getters.labelmap3D(viewportRef.current, activeVariable.segmentationIndex), activeVariable.segmentationIndex)
            } else {
                setters.activeLabelmapIndex(viewportRef.current, -1);
            }
            cornerstone.updateImage(viewportRef.current);
        }
    }

    const _resolveSegmentation = (activePatient: Patient, activeVariable: Variable, imageStack: ImageStack) => {
        const toolStates:ToolState[] = []
        const {state} = cornerstoneTools.getModule("segmentation");
        const imageIDState = state.series[imageStack.imageIDs[0]]
        if (imageIDState !== undefined && imageIDState.labelmaps3D !== undefined) {
            const labelmaps3D = imageIDState.labelmaps3D[activeVariable.segmentationIndex]
            if (labelmaps3D !== undefined) {
                const annotations = labelmaps3D.labelmaps2D
                const imageIndices = Object.keys(annotations)
                for (let i = 0; i < imageIndices.length; i++) {
                    const imageIndex = imageIndices[i]
                    const imageID = imageStack.imageIDs[Number(imageIndex)]
                    const pixelData = annotations[imageIndex].pixelData
                    if (pixelData.some(value => value !== 0)) {
                        const toolState: ToolState = {
                            type: ToolType.segmentation,
                            patientID: activePatient.patientID,
                            variableID: activeVariable.id,
                            imageID: imageID,
                            variableType: activeVariable.type,
                            data: {
                                pixelData: pixelData,
                                segmentationIndex: activeVariable.segmentationIndex
                            }
                        }
                        toolStates.push(toolState)
                    }
                }
            }
        }
        return toolStates
    }

    const _resolveAnnotation = (activePatient: Patient, activeVariable: Variable, imageStack: ImageStack) => {
        const toolStates:ToolState[] = []
        const state = toolStateManager.saveToolState();
        const keys = Object.keys(state)
        for (let i = 0; i < imageStack.imageIDs.length; i++) {
            const imageId = imageStack.imageIDs[i]
            if (keys.includes(imageId) && activeVariable.tool in state[imageId]) {
                const annotations = state[imageId][activeVariable.tool].data
                for (let annotationsCounter = 0; annotationsCounter < annotations.length; annotationsCounter++) {
                    const data = deepClone(annotations[annotationsCounter])
                    data.active = false
                    const toolState: ToolState = {
                        type: ToolType.annotation,
                        patientID: activePatient.patientID,
                        variableID: activeVariable.id,
                        imageID: imageId,
                        variableType: activeVariable.type,
                        data: {
                            tool: activeVariable.tool,
                            data: data
                        }
                    }
                    const uuid = data.uuid
                    if (!previousAnnotations.has(uuid)) {
                        addPreviousAnnotation(uuid, activeVariable.id, activePatient.patientID)
                        toolStates.push(toolState)
                    } else {
                        const {variableID, patientID} = previousAnnotations.get(uuid)
                        if (variableID === activeVariable.id && patientID === activePatient.patientID) {
                            toolStates.push(toolState)
                        }
                    }
                }
            }
        }
        return toolStates
    }

    const _deleteAnnotations = (activePatient: Patient, activeVariable: Variable, imageIDs: string[] | undefined) => {
        const cornerstoneToolState = toolStateManager.saveToolState()
        const deleteAnnotations = (imageID, tool) => {
            if (cornerstoneToolState[imageID][tool] !== undefined) {
                let annotations = cornerstoneToolState[imageID][tool].data
                const removeIndices: number[] = []
                annotations.forEach((annotation, index) => {
                    const uuid = annotation.uuid
                    const{variableID, patientID} = previousAnnotations.get(uuid)
                    if (patientID === activePatient.patientID && variableID === activeVariable.id) {
                        removeIndices.push(index)
                    }
                })
                removeIndices.forEach((index, counter) => {
                    annotations.splice(index-counter, 1)
                })
            }
        }

        const imageIDsWithAnnotations = Object.keys(cornerstoneToolState)
        if (imageIDs === undefined) {
            imageIDsWithAnnotations.forEach(imageID => {
                deleteAnnotations(imageID, activeVariable.tool)
            })
        } else {
            imageIDs.forEach(imageID => {
                if (imageIDsWithAnnotations.includes(imageID) && activeVariable.tool in cornerstoneToolState[imageID]) {
                    deleteAnnotations(imageID, activeVariable.tool)
                }
            })
        }
    }

    const _jumpToImage = async (activeVariable: Variable, imageIDs: string[]) => {
        if (activeVariable !== null && activeVariable.type === VariableType.segmentation) {
            const {state} = cornerstoneTools.getModule("segmentation");
            const imageIDState = state.series[imageIDs[0]]
            if (imageIDState !== undefined) {
                const labelmap3D = imageIDState.labelmaps3D[activeVariable.segmentationIndex]
                if (labelmap3D !== undefined && labelmap3D.labelmaps2D.length > 0) {
                    const imageIndices = Object.keys(labelmap3D.labelmaps2D)
                    let imageIndex = imageIndices[0]
                    if (!labelmap3D.labelmaps2D[imageIndex].pixelData.some((value: number) => value === 1)) {
                        imageIndex = imageIndices[1]
                    }
                    const imageID = imageIDs[Number(imageIndex)]
                    const image = await cornerstone.loadImage(imageID)
                    cornerstone.displayImage(viewportRef.current, image)
                    setActiveImageID(imageID)
                }
            }
        } else if (activeVariable !== null && activeVariable.type !== VariableType.boolean &&
            activeVariable.type !== VariableType.integer) {
            const cornerstoneToolState = toolStateManager.saveToolState()
            const imageIds = Object.keys(cornerstoneToolState)
            let imageID: string | undefined = undefined
            let stack = [...imageIDs]
            stack = stack.reverse()
            stack.forEach(currentImageID => {
                if (imageIds.includes(currentImageID) && activeVariable.tool in cornerstoneToolState[currentImageID]) {
                    imageID = currentImageID
                }
            })
            if (imageID !== undefined) {
                setActiveImageID(imageID)
            }
        }
    }

    const _setToolStates = useCallback(() => {
        if (activeVariableRef.current !== null) {
            if (activeVariableRef.current.type === VariableType.segmentation) {
                const activeToolStates = _resolveSegmentation(activePatientRef.current, activeVariableRef.current, imageStackRef.current)
                setToolStates(activeToolStates)
            } else if (activeVariableRef.current.type !== VariableType.boolean && activeVariableRef.current.type !== VariableType.integer) {
                const activeToolStates = _resolveAnnotation(activePatientRef.current, activeVariableRef.current, imageStackRef.current)
                setToolStates(activeToolStates)
            }
        }
    }, [])

    return(
        <div>
            <CornerstoneViewport
                    key={activeViewport}
                    style={{height: "91.5vh"}}
                    tools={tools}
                    id={activeImageID}
                    imageIds={props.imageStack.imageIDs}
                    imageIdIndex={currentImageIDIndex}
                    isPlaying={false}
                    frameRate={22}
                    className={"active"}
                    activeTool={activeTool}
                    setViewportActive={() => setActiveViewport(0)}
                    onElementEnabled={(elementEnabledEvt: {detail: {element: Object}}) => {
                        const viewport = elementEnabledEvt.detail.element;
                        setViewport(viewport);
                    }}
                />
        </div>
    )
}
