import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { AnnotationToolData, ImageStack, RadnotateState, SegmentationToolData, ToolState, ToolType, useRadnotateStore } from "../../..";
import { TSMap } from "typescript-map";
import Variable, { VariableType, VariableToolType } from "../../../Form/variable";


import Hammer from "hammerjs";
import cornerstone, {loadImage} from "cornerstone-core";
import CornerstoneViewport from "react-cornerstone-viewport";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import useStateRef from "react-usestateref";
import { Patient } from "../../../Form/DicomDropzone/dicomObject";
import { ImageState, useImageStore } from "..";
import Annotation from "../..";
import deepEqual from "deep-equal";
import fastDeepEqual from "fast-deep-equal";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.init();
const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

type ViewportProps = {
    nextVariable: Function,
    stackIndices: Map<string, number>,
    segmentationsCount: number,
    setActiveAnnotation: Function,
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

    const [tools, setTools] = useState<object[]>(
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
    const [activeTool, setActiveTool] = useState<string>(activeVariable.tool)
    const [activeViewport, setActiveViewport] = useState<number>(0)
    const updateImageIds = (activePatient: Patient): ImageStack => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        // if (activePatient === undefined) {
        //     return {imageIds, instanceNumbers, seriesDescriptions}
        // }
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
        const imageStack = {
            imageIDs: imageIds,
            instanceNumbers: instanceNumbers,
            seriesDescriptions: seriesDescriptions
        }
        return imageStack
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
    const [stackStartImageIds, setStackStartImageIds] = useState(() => {
        const stackStartImageIds = []
        stackStartImageIds.push(imageStack.imageIDs[0])
        return stackStartImageIds
    }
    )
    const [viewport, setViewport, viewportRef] = useStateRef<any>()
    
    const existingAnnotationsCount = new TSMap<string, Object>()

    useEffect(() => {
        const {configuration} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlphaInactive = 0
        toolStates.forEach((toolState: ToolState) => {
            if (toolState.type === ToolType.annotation) {
                // @ts-ignore
                console.log(toolState)
                const {type, patientID, variableID, imageID, variableType, data} = toolState
                toolStateManager.addImageIdToolState(imageID, VariableToolType.get(variableType), data)
                existingAnnotationsCount.set(data.data.uuid, {
                    patientId: patientID,
                    variableId: variableID,
                })
            }
        })
    }, [])

    useEffect(() => {
        activePatientRef.current = activePatient
        const imageStack = updateImageIds(activePatient)
        setImageStack(imageStack)
    }, [activePatient])

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
        tools.slice(0, 6).forEach(tool => {
            if (tool.name === activeVariable.tool) {
                tool.mode = "Active"
                cornerstoneTools.setToolActive(tool.name, {mouseButtonMask: 1});
            } else {
                tool.mode = "Enabled"
                cornerstoneTools.setToolEnabled(tool.name);
            }
        })
        activeVariableRef.current = activeVariable
    }, [activeVariable])

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

    const _createToolState = () => {
        const currentValues = []
        const {
            state
        } = cornerstoneTools.getModule("segmentation");
        const imageIdState = state.series[imageStack.imageIDs[0]]
        if (imageIdState !== undefined && imageIdState.labelmaps3D !== undefined) {
            const labelmap3D = imageIdState.labelmaps3D[activeVariable.segmentationIndex]
            const annotations = labelmap3D.labelmaps2D
            const imageIndices = Object.keys(annotations)
            for (let i = 0; i < imageIndices.length; i++) {
                const imageIndex = imageIndices[i]
                const imageId = imageStack.imageIDs[Number(imageIndex)]
                const instanceNumber = imageStack.instanceNumbers.get(imageId)
                const pixelData = annotations[imageIndex].pixelData
                if (pixelData.some(value => value !== 0)) {
                    const segmentationIndex = activeVariable.segmentationIndex
                    const segmentation = _processSegmentation(pixelData, imageId, instanceNumber, segmentationIndex)
                    const defaultValues = _processImage(imageId)
                    const value = new TSMap([...Array.from(segmentation.entries()), ...Array.from(defaultValues.entries())])
                    currentValues.push(value)
                }
            }
        }
        return currentValues
    }

    const _resolveSegmentation = (activePatient: Patient, activeVariable: Variable, imageStack: ImageStack) => {
        const toolStates:ToolState[] = []
        const {state} = cornerstoneTools.getModule("segmentation");
        const imageIdState = state.series[imageStack.imageIDs[0]]
        if (imageIdState !== undefined && imageIdState.labelmaps3D !== undefined) {
            const labelmap3D = imageIdState.labelmaps3D[activeVariable.segmentationIndex]
            const annotations = labelmap3D.labelmaps2D
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
                for (let j = 0; j < annotations.length; j++) {
                    const toolState: ToolState = {
                        type: ToolType.annotation,
                        patientID: activePatient.patientID,
                        variableID: activeVariable.id,
                        imageID: imageId,
                        variableType: activeVariable.type,
                        data: {
                            tool: activeVariable.tool,
                            data: annotations[j]
                        }
                    }
                    toolStates.push(toolState)
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

    const _jumpToImage = async () => {
        if (activeVariable.type === VariableType.segmentation) {
            const {state} = cornerstoneTools.getModule("segmentation");
            const imageIdState = state.series[imageStack.imageIDs[0]]
            if (imageIdState !== undefined) {
                const labelmap3D = imageIdState.labelmaps3D[activeVariable.segmentationIndex]
                if (labelmap3D !== undefined && labelmap3D.labelmaps2D.length > 0) {
                    const imageIndices = Object.keys(labelmap3D.labelmaps2D)
                    let imageIndex = imageIndices[0]
                    if (!labelmap3D.labelmaps2D[imageIndex].pixelData.some(value => value === 1)) {
                        imageIndex = imageIndices[1]
                    }
                    const imageId = imageIds[Number(imageIndex)]
                    const image = await cornerstone.loadImage(imageId)
                    cornerstone.displayImage(viewportRef, image)
                    setCurrentImageId(imageId)
                }
            }
        } else if (activeVariable.type !== VariableType.boolean &&
            activeVariable.type !== VariableType.integer) {
            const existingToolState = toolStateManager.saveToolState();
            const imageIds = Object.keys(existingToolState)
            let imageId: string
            let stack = [...imageStack.imageIDs]
            stack = stack.reverse()
            stack.forEach(currentImageId => {
                if (imageIds.includes(currentImageId) && activeVariable.tool in existingToolState[currentImageId]) {
                    imageId = currentImageId
                }
            })
            if (imageId !== undefined) {
                setCurrentImageId(imageId)
            }
        }
    }

    const _initSegmentation = () => {
        const {getters, setters} = cornerstoneTools.getModule("segmentation");
        props.toolStates.forEach(annotationToolState => {
            if ((annotationToolState as SegmentationToolState).segmentationIndex) {
                const {imageId, height, width, pixelData, segmentationIndex} = annotationToolState
                let imageIdIndex
                imageStack.imageIDs.forEach((currentImageId, index) => {
                    if (currentImageId === imageId) {
                        imageIdIndex = index
                    }
                })
                if (imageIdIndex !== undefined) {
                    setters.activeSegmentIndex(viewportRef, segmentationIndex)
                    setters.activeLabelmapIndex(viewportRef, segmentationIndex);
                    const {labelmap3D} = getters.labelmap2D(viewportRef);
                    const l2dforImageIdIndex = getters.labelmap2DByImageIdIndex(
                        labelmap3D,
                        imageIdIndex,
                        width,
                        height
                    );
                    l2dforImageIdIndex.pixelData = pixelData
                    setters.colorLUTIndexForLabelmap3D(labelmap3D, segmentationIndex)
                    setters.updateSegmentsOnLabelmap2D(l2dforImageIdIndex);
                    setters.activeLabelmapIndex(viewportRef, 0);
                }
            }
        })
        cornerstone.updateImage(viewportRef);
    }

    const _setActiveSegmentation = () => {
        const {setters, configuration, getters} = cornerstoneTools.getModule("segmentation");
        configuration.fillAlpha = segmentationTransparency / 100
        const segmentationIndex = activeVariable.segmentationIndex
        if (segmentationIndex !== undefined) {
            setters.activeLabelmapIndex(viewportRef, segmentationIndex);
            setters.colorLUTIndexForLabelmap3D(getters.labelmap3D(viewportRef, segmentationIndex), segmentationIndex)
        } else {
            setters.activeLabelmapIndex(viewportRef, -1);
        }
        cornerstone.updateImage(viewportRef);
    }

    const _setToolStates = useCallback(() => {
        if (activeVariableRef.current.type === VariableType.segmentation) {
            const segmentationToolStates = _resolveSegmentation(activePatientRef.current, activeVariableRef.current, imageStackRef.current)
            const annotationToolStates = toolStatesRef.current.filter((toolState: ToolState) => {
                if (toolState.type !== ToolType.segmentation) {
                    return toolState
                }
            })
            const updatedToolStates = segmentationToolStates.concat(annotationToolStates)
            if (!fastDeepEqual(toolStatesRef.current, updatedToolStates)) {
                setToolStates(updatedToolStates)
            }
        } else if (activeVariableRef.current.type !== VariableType.boolean && activeVariableRef.current.type !== VariableType.integer) {
            const annotationToolStates = _resolveAnnotation(activePatientRef.current, activeVariableRef.current, imageStackRef.current)
            const segmentationToolStates = toolStatesRef.current.filter((toolState: ToolState) => {
                if (toolState.type !== ToolType.annotation) {
                    return toolState
                }
            })
            const updatedToolStates = annotationToolStates.concat(segmentationToolStates)
            if (!fastDeepEqual(toolStatesRef.current, updatedToolStates)) {
                setToolStates(updatedToolStates)
            }
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