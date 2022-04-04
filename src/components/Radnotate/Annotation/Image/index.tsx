import { ReactElement, useEffect, useRef, useState } from "react";
import { Settings } from "./Settings";
import { Viewport } from "./Viewport";

import cornerstone, {loadImage} from "cornerstone-core";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import { AnnotationToolData, RadnotateState, SegmentationToolData, ToolState, useRadnotateStore } from "../..";
import Variable, { VariableType } from "../../Form/variable";
import create from "zustand";
import { Alert, Snackbar } from "@mui/material";
import { TSMap } from "typescript-map";
import useStateRef from "react-usestateref";
import { Patient } from "../../Form/DicomDropzone/dicomObject";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

type ImageProps = {
    setActiveAnnotations: Function,
}

export type ImageState = {
    undo: boolean,
    setUndo: (undo: boolean) => void,
    redo: boolean,
    setRedo: (redo: boolean) => void,
    correctionMode: boolean,
    setCorrectionMode: (correctionMode: boolean) => void,
    toolStates: ToolState[],
    setToolStates: (toolStates: ToolState[]) => void,
}

export const useImageStore = create((set: Function): ImageState => ({
    undo: false,
    setUndo: (undo: boolean): void => set(() => ({undo: undo})),
    redo: false,
    setRedo: (redo: boolean): void => set(() => ({redo: redo})),
    correctionMode: false,
    setCorrectionMode: (correctionMode: boolean): void => set(() => ({correctionMode: correctionMode})),
    toolStates: [],
    setToolStates: (toolStates: ToolState[]): void => set(() => ({toolStates: toolStates})),
}))

const Image = (props: ImageProps): ReactElement => {
    const activePatient: Patient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activePatientRef = useRef(activePatient)
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    const activeVariableRef = useRef(activeVariable)

    const setUndo = useImageStore((state: ImageState) => state.setUndo)
    const setRedo = useImageStore((state: ImageState) => state.setRedo)
    const setCorrectionMode = useImageStore((state: ImageState) => state.setCorrectionMode)
    const toolStates = useImageStore((state: ImageState) => state.toolStates)

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
        activeVariableRef.current = activeVariable
        activePatientRef.current = activePatient
    }, [activeVariable, activePatient])

    useEffect(() => {
        const activeAnnotations: TSMap<string, string>[] = []
        toolStates.forEach(async (toolState: ToolState) => {
          activeAnnotations.push(await _process(toolState))
        })
        console.log(toolStates)
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

    //TODO Fix return type of cooridinates, it actually returns numbers not string, cast to string
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

    const _updateIntegerOrIntegerVariable = (key: string) => {
        if (activeVariableRef.current.type === VariableType.boolean) {
            if (key === "Escape") {
                setSnackbarOpen(true)
                setSnackbarText('"Escape" key was pressed. Cached value deleted.')
                setActiveAnnotations([new TSMap<string, string>([["value", "escape"]])])
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
        } else if (activeVariableRef.current.type === VariableType.integer) {
            if (key === "Escape") {
                setSnackbarOpen(true)
                setSnackbarText('"Escape" key was pressed. Cached value deleted.')
                setActiveAnnotations([new TSMap<string, string>([["value", "escape"]])])
            } else if ((!isNaN(Number(key)))) {
                setSnackbarOpen(true)
                setSnackbarText('"' + key + '" key was pressed. Cached value deleted.')
                setActiveAnnotations([new TSMap<string, string>([["integer", key]])])
            }
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
            } else {
                _updateIntegerOrIntegerVariable(event.key)
            }
        } else if (event.type === "keyup") {
            if (event.key === "Control") {
                setCorrectionMode(false)
            }
        }
    }
    
    return(
        <div>
            {/* <Settings/> */}
            <Viewport/>
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