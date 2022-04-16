import { ReactElement, useEffect, useRef, useState } from "react";
import { Settings } from "./Settings";
import { Viewport } from "./Viewport";
import {loadImage} from "cornerstone-core";
import { AnnotationToolData, RadnotateState, SegmentationToolData, ToolState, useRadnotateStore } from "../..";
import Variable, { VariableType } from "../../Form/variable";
import create from "zustand";
import { Alert, Snackbar } from "@mui/material";
import { TSMap } from "typescript-map";
import useStateRef from "react-usestateref";
import { Patient } from "../../Form/DicomDropzone/dicomObject";
import produce, {applyPatches} from "immer"

// version 6
import {enablePatches} from "immer"
enablePatches()

export type ImageStack = {
    imageIDs: string[],
    instanceNumbers: Map<string, number>,
    seriesDescriptions: TSMap<string, Array<string>>,
}

type ImageProps = {
    setActiveAnnotations: Function,
}

export type ImageState = {
    undo: boolean,
    setUndo: (undo: boolean) => void,
    redo: boolean,
    setRedo: (redo: boolean) => void,
    reset: boolean,
    setReset: (reset: boolean) => void, 
    correctionMode: boolean,
    setCorrectionMode: (correctionMode: boolean) => void,
    activeSeries: string,
    setActiveSeries: (activeSeries: string) => void,
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
    segmentationTransparency: number,
    setSegmentationTransparency: (segmentationTransparency: number) => void,
    activeSeriesDescription: string,
    setActiveSeriesDescription: (imageStack: ImageStack) => void,
    activeImageID: string,
    setActiveImageID: (activeImageID: string) => void,
    imageStack: ImageStack,
    setImageStack: (activePatient: Patient) => void,
}

export const useImageStore = create((set: Function): ImageState => ({
    undo: false,
    setUndo: (undo: boolean): void => set(() => ({undo: undo})),
    redo: false,
    setRedo: (redo: boolean): void => set(() => ({redo: redo})),
    reset: false,
    setReset: (reset: boolean) => set(() => ({reset: reset})),
    correctionMode: false,
    setCorrectionMode: (correctionMode: boolean): void => set(() => ({correctionMode: correctionMode})),
    activeSeries: "",
    setActiveSeries: (activeSeries: string) => set(() => ({activeSeries: activeSeries})),
    activeImageID: "",
    setActiveImageID: (activeImageID: string) => set(() => ({activeImageID: activeImageID})),
    toolStates: [],
    setToolStates: (toolStates: ToolState[]): void => set(() => ({toolStates: toolStates})),
    segmentationTransparency: 50,
    setSegmentationTransparency: (segmentationTransparency: number) => set(() => ({segmentationTransparency: segmentationTransparency})),
    activeSeriesDescription: "",
    setActiveSeriesDescription: (imageStack: ImageStack) => set(() => ({activeSeriesDescription: () => {
        let activeSeriesDescription: string = ""
            imageStack.seriesDescriptions.keys().forEach(seriesDescription => {
                imageStack.seriesDescriptions.get(seriesDescription).forEach(imageID => {
                    if (imageID === imageStack.imageIDs[0]) {
                        activeSeriesDescription = seriesDescription
                    }
                })
            })
            return activeSeriesDescription
    }})),
    imageStack: {
        imageIDs: [],
        instanceNumbers: new Map<string, number>(),
        seriesDescriptions: new TSMap<string, string[]>()
    },
    setImageStack: (activePatient: Patient) => set(() => ({imageStack: () => {
        let imageIDs: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        // if (activePatient === undefined) {
        //     return {imageIds, instanceNumbers, seriesDescriptions}
        // }
        if (activePatient === null) {
            return {
                imageIDs: [],
                instanceNumbers: new Map<string, number>(),
                seriesDescriptions: new TSMap<string, string[]>()
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
                    imageIDs = [...imageIDs, ...imageIdsTemp]
                })
            })
            return {
                imageIDs: imageIDs,
                instanceNumbers: instanceNumbers,
                seriesDescriptions: seriesDescriptions
            }
        }
    }})),
}))


const Image = (props: ImageProps): ReactElement => {
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activePatientRef = useRef(activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    const activeVariableRef = useRef(activeVariable)

    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const setReset = useImageStore((state: ImageState) => state.setRedo)
    const setCorrectionMode = useImageStore((state: ImageState) => state.setCorrectionMode)
    const toolStates = useImageStore((state: ImageState) => state.toolStates)

    const _updateImageIDs = (activePatient: Patient): ImageStack => {
        let imageIDs: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        if (activePatient === null) {
            return {
                imageIDs: imageIDs,
                instanceNumbers: instanceNumbers,
                seriesDescriptions: seriesDescriptions,
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
                    const seriesDescription = series.seriesDescription + " " + series.seriesNumber // + "/" + study.studyID  ???
                    seriesDescriptions.set(seriesDescription, imageIdsTemp)
                    imageIDs = [...imageIDs, ...imageIdsTemp]
                })
            })
            return {
                imageIDs: imageIDs,
                instanceNumbers: instanceNumbers,
                seriesDescriptions: seriesDescriptions
            }
        }
    }
    const [imageStack, setImageStack] = useState(() => {
        return _updateImageIDs(activePatient)
    }) 
    const setActiveSeries = useImageStore((state: ImageState) => state.setActiveSeries)

    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarText, setSnackbarText] = useState("")
    const [, setActiveAnnotations, activeAnnotationsRef] = useStateRef<TSMap<string, string>[]>([])


    useEffect(() => {
        document.addEventListener("keydown", handleKeyPress, false)
        document.addEventListener("keyup", handleKeyPress, false)
        return () => {
            document.removeEventListener("keydown", handleKeyPress, false)
            document.removeEventListener("keyup", handleKeyPress, false)
        }
    }, [])

    useEffect(() => {
        const imageStack = _updateImageIDs(activePatient)
        setImageStack(imageStack)
    }, [activePatient])

    useEffect(() => {
        let currentSeriesDescription: string = ""
        imageStack.seriesDescriptions.keys().forEach((seriesDescription: string) => {
            imageStack.seriesDescriptions.get(seriesDescription).forEach((imageID: string) => {
                if (imageID === imageStack.imageIDs[0]) {
                    currentSeriesDescription = seriesDescription
                }
            })
        })
        setActiveSeries(currentSeriesDescription)
    }, [imageStack])

    useEffect(() => {
        activeVariableRef.current = activeVariable
        activePatientRef.current = activePatient
    }, [activeVariable, activePatient])

    useEffect(() => {
        const activeAnnotations: TSMap<string, string>[] = []
        toolStates.forEach(async (toolState: ToolState) => {
          activeAnnotations.push(await _process(toolState))
        })
        setActiveAnnotations(activeAnnotations)
    }, [toolStates])

    const _process = async (toolState: ToolState) => {
        let activeAnnotation: TSMap<string, string>
        switch(toolState.variableType){
            case VariableType.seed:
                activeAnnotation = _processSeed((toolState.data as AnnotationToolData).data)
                break;
            case VariableType.length:
                activeAnnotation = _processLength((toolState.data as AnnotationToolData).data)
                break;
            case VariableType.ellipticalRoi:
                activeAnnotation = _processEllipticalRoi((toolState.data as AnnotationToolData).data)
                break;
            case VariableType.rectangleRoi:
                activeAnnotation = _processRectangleRoi((toolState.data as AnnotationToolData).data)
                break;
            case VariableType.segmentation:
                activeAnnotation = await _processSegmentation((toolState.data as SegmentationToolData).pixelData, toolState.imageID, toolState.data.segmentationIndex)
                break;
        }
        const defaultValues = await _processImage(toolState.imageID)
        activeAnnotation = new TSMap<string, string>([...activeAnnotation.entries(), ...defaultValues.entries()])
        return activeAnnotation
    }

    const _processSeed = (data: {cachedStats: {x: string, y: string}}) => {
        const coordinates = data.cachedStats
        const x = coordinates.x
        const y = coordinates.y
        const seed = new TSMap<string, string>()
        seed.set("x", x)
        seed.set("y", y)
        seed.set("data", JSON.stringify(data))
        return seed
    }

    const _processRectangleRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
        const coordinates = data.handles
        const roi = new TSMap<string, string>()
        const x1 = Number(coordinates.start.x)
        const y1 = Number(coordinates.start.y)
        const x2 = Number(coordinates.end.x)
        const y2 = Number(coordinates.end.y)
        const minX = Math.floor(Math.min(x1, x2))
        const maxX = Math.ceil(Math.max(x1, x2))
        const minY = Math.floor(Math.min(y1, y2))
        const maxY = Math.ceil(Math.max(y1, y2))
        roi.set("x1", String(minX))
        roi.set("y1", String(minY))
        roi.set("x2", String(maxX))
        roi.set("y2", String(maxY))
        roi.set("data", JSON.stringify(data))
        return roi
    }

    const _processEllipticalRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
        const coordinates = data.handles
        const roi = new TSMap<string, string>()
        const x1 = parseInt(coordinates.start.x)
        const y1 = parseInt(coordinates.start.y)
        const x2 = parseInt(coordinates.end.x)
        const y2 = parseInt(coordinates.end.y)
        const centerX = Math.abs(x1 - x2) + Math.min(x1, x2)
        const centerY = Math.abs(y1 - y2) + Math.min(y1, y2)
        const a = centerX - Math.min(x1, x2)
        const b = centerY - Math.min(y1, y2)
        roi.set("x", String(centerX))
        roi.set("y", String(centerY))
        roi.set("a", String(a))
        roi.set("b", String(b))
        roi.set("data", JSON.stringify(data))
        return roi
    }

    //TODO Fix return type of coordinates, it actually returns numbers not string, cast to string
    const _processLength = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}, length: string}) => {
        const coordinates = data.handles
        const length = new TSMap<string, string>()
        length.set("x1", coordinates.start.x)
        length.set("y1", coordinates.start.y)
        length.set("x2", coordinates.end.x)
        length.set("y2", coordinates.end.y)
        length.set("length", data.length)
        length.set("data", JSON.stringify(data))
        return length
    }

    const _processImage = async (imageID: string): Promise<TSMap<string, string>> => {
        return await new Promise(resolve => {
            loadImage(imageID).then((image) => {
                const defaultValue = new TSMap<string, string>()
                defaultValue.set("studyUid", image.data.string('x0020000d'))
                defaultValue.set("seriesUid", image.data.string('x0020000e'))
                defaultValue.set("sopUid", image.data.string('x00080018'))
                defaultValue.set("seriesNumber", image.data.string('x00200011'))
                defaultValue.set("tablePosition", image.data.string('x00201041'))
                resolve(defaultValue)
            })
        })
    }

    const _processSegmentation = async (pixelData: Uint8Array, imageID: string, segmentationIndex: number): Promise<TSMap<string, string>> => {
        return await new Promise(resolve => {
            loadImage(imageID).then((image) => {
                const segmentation = new TSMap<string, number | string>()
                const b64encoded = btoa(String.fromCharCode.apply(null, pixelData));
                segmentation.set("pixelData", b64encoded)
                segmentation.set("width", image.width)
                segmentation.set("height", image.height)
                segmentation.set("segmentationIndex", segmentationIndex)
                resolve(segmentation)
            })
        })
    }

    const _processBoolean = (key: string) => {
        if (key === "Delete") {
            setSnackbarOpen(true)
            setSnackbarText('"Delete" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["value", "delete"]])])
        } else if (key === "0") {
            setSnackbarOpen(true)
            setSnackbarText('"0" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["boolean", "false"]])])
        } else if (key === "1") {
            setSnackbarOpen(true)
            setSnackbarText('"1" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["boolean", "true"]])])
        } else {
            key = key.toLowerCase()
            if (key === "f") {
                setSnackbarOpen(true)
                setSnackbarText('"f" key was pressed. Cached value deleted.')
                setActiveAnnotations([new TSMap<string, string>([["boolean", "false"]])])
            } else if (key === "t") {
                setSnackbarOpen(true)
                setSnackbarText('"t" key was pressed. Cached value deleted.')
                setActiveAnnotations([new TSMap<string, string>([["boolean", "true"]])])
            }
        }
    }

    const _processInteger = (key: string) => {
        if (key === "Delete") {
            setSnackbarOpen(true)
            setSnackbarText('"Delete" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["value", "delete"]])])
        } else if ((!isNaN(Number(key)))) {
            setSnackbarOpen(true)
            setSnackbarText('"' + key + '" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["integer", key]])])
        }
    }

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.type === "keydown") {
            if (event.key.toLowerCase() === "z" && event.ctrlKey) {
                setUndo(true)
            } else if (event.key.toLowerCase() === "y" && event.ctrlKey) {
                setRedo(true)
            } else if (event.key === "Control") {
                setCorrectionMode(true)
            } else if (event.key === "Enter") {
                Promise.all(activeAnnotationsRef.current).then((values) => {
                    if (activePatientRef.current !== null) {
                        props.setActiveAnnotations(values)
                        setActiveAnnotations([])
                    }
                })
            } else if (activeVariableRef.current.type === VariableType.boolean) {
                _processBoolean(event.key)
            } else if (activeVariableRef.current.type === VariableType.integer) {
                _processInteger(event.key)
            } else if (event.key === "Delete") {
                setReset(true)
            }
        } else if (event.type === "keyup") {
            if (event.key === "Control") {
                setCorrectionMode(false)
            }
        }
    }
    
    return(
        <div>
            <Settings imageStack={imageStack}/>
            <Viewport imageStack={imageStack}/>
            <Snackbar open={snackbarOpen}
                autoHideDuration={6000}
                anchorOrigin={{vertical: "top", horizontal: "right"}}
                onClose={() => setSnackbarOpen(false)}>
                <Alert severity="success">
                    {snackbarText}
                </Alert>
            </Snackbar>
        </div>
    )
}

export default Image;