import { EffectCallback, ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { ImageStack, RadnotateState, ToolState, ToolType, useRadnotateStore } from "../../..";
import { TSMap } from "typescript-map";
import Variable, { VariableType, VariableToolType } from "../../../Form/variable";


import Hammer from "hammerjs";
import cornerstone from "cornerstone-core";
import CornerstoneViewport from "react-cornerstone-viewport";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import useStateRef from "react-usestateref";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";
import { ImageState, useImageStore } from "..";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
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
    const toolStates = useImageStore((state: ImageState) => state.toolStates)
    const toolStatesRef = useRef(toolStates)

    const setToolStates = useImageStore((state: ImageState) => state.setToolStates)
    const undo = useImageStore((state: ImageState) => state.undo)
    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const redo = useImageStore((state: ImageState) => state.redo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const correctionMode = useImageStore((state: ImageState) => state.correctionMode)

    const [segmentationTransparency, setSegmentationTransperency] = useState(50)
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
    const [currentImageIdIndex, setCurrentImageIdIndex] = useState<number>(0)
    const [currentImageId, setCurrentImageId] = useState<string>()
    const [activeTool, setActiveTool] = useState<string>(() => {
        if (activeVariable !== null) {
            return activeVariable.tool
        } else {
            return ""
        }
    })
    const [activeViewport, setActiveViewport] = useState<number>(0)
    const [, setSegmentationToolStates, segmentationToolStatesRef] = useStateRef<ToolState[]>([])
    const updateImageIds = (activePatient: Patient): ImageStack => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        // if (activePatient === undefined) {
        //     return {imageIds, instanceNumbers, seriesDescriptions}
        // }
        if (activePatient === null) {
            return {
                imageIDs: [],
                instanceNumbers: [],
                seriesDescriptions: ["Undefined"]
            }
        } else {
            activePatient.studies.forEach((study) => {
                study.series.forEach((series) => {
                    const imageIdsTemp = new Array<string>(series.images.length)
                    series.images.forEach((image) => {
                        imageIdsTemp[image.instanceNumber - 1] = image.imageID
                        instanceNumbers.set(image.imageID, image.instanceNumber);
                    })
                    // ToDo If multiple studies within one patient, with same name and same series number exist, this approach will fail
                    if (seriesDescriptions.has(series.seriesDescription)) {
                        const seriesDescription = series.seriesDescription + " " + series.seriesNumber
                        seriesDescriptions.set(seriesDescription, imageIdsTemp)
                    } else {
                        seriesDescriptions.set(series.seriesDescription, imageIdsTemp)
                    }
                    imageIds = [...imageIds, ...imageIdsTemp]
                })
            })
            return {
                imageIDs: imageIds,
                instanceNumbers: instanceNumbers,
                seriesDescriptions: seriesDescriptions
            }
        }
    }
    const [imageStack, setImageStack, imageStackRef] = useStateRef<ImageStack>(() => updateImageIds(activePatient))
    const [currentSeriesDescription, setCurrentSeriesDescription] = useState<string>(
        () => {
            let currentSeriesDescription: string = ""
            imageStack.seriesDescriptions.keys().forEach(seriesDescription => {
                imageStack.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                    if (imageId === imageStack.imageIDs[0]) {
                        currentSeriesDescription = seriesDescription
                    }
                })
            })
            return currentSeriesDescription
        }
    )
    const [viewport, setViewport, viewportRef] = useStateRef<any>()
    
    const existingAnnotationsCount = new Map<string, Object>()

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
                existingAnnotationsCount.set(data.data.uuid, {
                    patientID: patientID,
                    variableID: variableID,
                })
            } else {
                segmentationToolStates.push(toolState)   
            }
        })
        setToolStates([])
        setSegmentationToolStates(segmentationToolStates)
    }, [])

    useEffect(() => {
        activePatientRef.current = activePatient
        const imageStack = updateImageIds(activePatient)
        setImageStack(imageStack)
        awaitTimeout(500).then(() => {
            _initSegmentations(activePatient, imageStack.imageIDs, segmentationToolStatesRef.current)
            _setActiveSegmentation(activeVariable)
            _jumpToImage(activeVariable, imageStack.imageIDs)
            _setToolStates()
        })
    }, [activePatient])

    useEffect(() => {
        if (activeVariable !== null) {
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
                _jumpToImage(activeVariable, imageStack.imageIDs)
            }
            activeVariableRef.current = activeVariable
            _setToolStates()
        } else {
            activeVariableRef.current = activeVariable
        }
    }, [activeVariable])

    useEffect(() => {
        let currentImageIndex: number = 0
        imageStack.imageIDs.forEach((imageId, index) => {
            if (imageId === currentImageId) {
                currentImageIndex = index
            }
        })
        let currentSeriesDescription: string = ""
        imageStack.seriesDescriptions.keys().forEach(seriesDescription => {
            imageStack.seriesDescriptions.get(seriesDescription).forEach(imageId => {
                if (imageId === currentImageId) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })
        setCurrentImageIdIndex(currentImageIndex)
        setCurrentSeriesDescription(currentSeriesDescription)
        cornerstone.updateImage(viewportRef.current);
    }, [currentImageId])

    useEffect(() => {
        if (undo) {
            if (activeVariable.type === VariableType.segmentation) {
                const {
                    setters,
                } = cornerstoneTools.getModule("segmentation");
                setters.undo(viewport);
                setUndo(false)
            }
        } 
        if (redo) {
            if (activeVariable.type === VariableType.segmentation) {
                const {
                    setters,
                } = cornerstoneTools.getModule("segmentation");
                setters.redo(viewport);
                setRedo(false)
            }
        }
        if (correctionMode) {
            cornerstoneTools.setToolEnabled("Wwwc");
            if (activeVariable.type !== VariableType.integer && activeVariable.type !== VariableType.boolean) {
                cornerstoneTools.setToolActive("Pan", {mouseButtonMask: 2});
                cornerstoneTools.setToolEnabled("Zoom");
            }
        } else {
            cornerstoneTools.setToolActive("Wwwc", {mouseButtonMask: 4});
            if (activeVariable.type !== VariableType.integer && activeVariable.type !== VariableType.boolean) {
                cornerstoneTools.setToolActive("Zoom", {mouseButtonMask: 2});
                cornerstoneTools.setToolEnabled("Pan");
            }
        }
    }, [undo, redo, correctionMode])

    useEffect(() => {
        toolStatesRef.current = toolStates
    }, [toolStates])

    useEffect(() => {
        if (viewport !== undefined) {
            viewport.addEventListener("cornerstonenewimage", async (event: {detail: {image: {imageId: string}}}) => setCurrentImageId(event.detail.image.imageId))
            viewport.addEventListener("cornerstonetoolsmeasurementcompleted", _setToolStates)
            viewport.addEventListener("cornerstonetoolsmouseup", _setToolStates)
            viewport.addEventListener("cornerstonetoolsmouseclick", _setToolStates)
        
            return () => {
                viewport.removeEventListener("cornerstonenewimage", async (event: {detail: {image: {imageId: string}}}) => setCurrentImageId(event.detail.image.imageId))
                viewport.removeEventListener("cornerstonetoolsmeasurementcompleted", _setToolStates)
                viewport.removeEventListener("cornerstonetoolsmouseup", _setToolStates)
                viewport.removeEventListener("cornerstonetoolsmouseclick", _setToolStates)
            }
        }
    }, [viewport])

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
                        imageIDs.forEach((currentImageId, index) => {
                            if (currentImageId === imageID) {
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
            console.log(segmentationToolStates)
            setSegmentationToolStates(segmentationToolStates)
        }
        cornerstone.updateImage(viewportRef.current);
    }

    const _setActiveSegmentation = (activeVariable: Variable) => {
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
                    const imageId = imageStack.imageIDs[Number(imageIndex)]
                    const pixelData = annotations[imageIndex].pixelData
                    if (pixelData.some(value => value !== 0)) {
                        const toolState: ToolState = {
                            type: ToolType.segmentation,
                            patientID: activePatient.patientID,
                            variableID: activeVariable.id,
                            imageID: imageId,
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
                    const data = annotations[annotationsCounter]
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
                    if (!existingAnnotationsCount.has(uuid)) {
                        existingAnnotationsCount.set(uuid, {
                            variableID: activeVariable.id,
                            patientID: activePatient.patientID
                        })
                        toolStates.push(toolState)
                    } else {
                        const {variableID, patientID} = existingAnnotationsCount.get(uuid)
                        if (variableID === activeVariable.id && patientID === activePatient.patientID) {
                            toolStates.push(toolState)
                        }
                    }
                }
            }
        }
        return toolStates
    }

    const _deleteSegmentations = (stackStartImageId: string, segmentationIndex: number) => {
        const {state} = cornerstoneTools.getModule("segmentation");
        state.series[stackStartImageId].labelmaps3D[segmentationIndex].labelmaps2D = []
        cornerstone.updateImage(viewportRef);
    }

    const _deleteAnnotations = (variableType: VariableType, imageIds: string[] | undefined) => {
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

        const tool = VariableToolType.get(variableType)
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
        cornerstoneTools.clearToolState(viewportRef, tool);
        cornerstone.updateImage(viewportRef);
        useState({correctionModeEnabled: false})
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
                    setCurrentImageId(imageID)
                }
            }
        } else if (activeVariable !== null && activeVariable.type !== VariableType.boolean &&
            activeVariable.type !== VariableType.integer) {
            const cornerstoneToolState = toolStateManager.saveToolState();
            const imageIds = Object.keys(cornerstoneToolState)
            let imageID: string | undefined = undefined
            let stack = [...imageIDs]
            stack = stack.reverse()
            stack.forEach(currentImageId => {
                if (imageIds.includes(currentImageId) && activeVariable.tool in cornerstoneToolState[currentImageId]) {
                    imageID = currentImageId
                }
            })
            if (imageID !== undefined) {
                setCurrentImageId(imageID)
            }
        }
    }

    const _setToolStates = useCallback(() => {
        if (activeVariableRef.current.type === VariableType.segmentation) {
            setToolStates(_resolveSegmentation(activePatientRef.current, activeVariableRef.current, imageStackRef.current))
        } else if (activeVariableRef.current.type !== VariableType.boolean && activeVariableRef.current.type !== VariableType.integer) {
            setToolStates(_resolveAnnotation(activePatientRef.current, activeVariableRef.current, imageStackRef.current))
        }
    }, [])

    return(
        <div>
            <CornerstoneViewport
                    key={activeViewport}
                    style={{height: "91.5vh"}}
                    tools={tools}
                    id={currentImageId}
                    imageIds={imageStack.imageIDs}
                    imageIdIndex={currentImageIdIndex}
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