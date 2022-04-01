import { ReactElement, useEffect, useState } from "react";
import { Settings } from "./Settings";
import { Viewport } from "./Viewport";

import cornerstone, {loadImage} from "cornerstone-core";
import CornerstoneViewport from "react-cornerstone-viewport";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
import { AnnotationToolData, ImageStack, RadnotateState, SegmentationToolData, ToolState, ToolType, useRadnotateStore } from "../..";
import { Patient, Patients } from "../../Form/DicomDropzone/dicomObject";
import Variable, { VariableToolType, VariableType } from "../../Form/variable";
import create from "zustand";
import { Alert, Snackbar } from "@mui/material";
import { TSMap } from "typescript-map";
import useStateRef from "react-usestateref";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

type ImageProps = {
    nextVariable: Function,
    toolStates: ToolState[],
    stackIndices: Map<string, number>,
    segmentationsCount: number,
    imageStack: ImageStack,
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
    const activeVariable: Variable = useRadnotateStore((state: RadnotateState) => state.activeVariable)

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
        const activeAnnotations: TSMap<string, string>[] = []
        toolStates.forEach(async (toolState: ToolState) => {
          activeAnnotations.push(await _process(toolState))
        })
        setActiveAnnotations(activeAnnotations)
    },[toolStates])

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
        return seed
    }

    const _processRectangleRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
        const coordinates = data.handles
        const seed = new TSMap<string, string>()
        const x1 = Number(coordinates.start.x)
        const y1 = Number(coordinates.start.y)
        const x2 = Number(coordinates.end.x)
        const y2 = Number(coordinates.end.y)
        const minX = Math.floor(Math.min(x1, x2))
        const maxX = Math.ceil(Math.max(x1, x2))
        const minY = Math.floor(Math.min(y1, y2))
        const maxY = Math.ceil(Math.max(y1, y2))
        seed.set("x1", String(minX))
        seed.set("y1", String(minY))
        seed.set("x2", String(maxX))
        seed.set("y2", String(maxY))
        return seed
    }

    const _processEllipticalRoi = (data: {handles: {start: {x: string, y: string}, end: {x: string, y: string}}}) => {
        const coordinates = data.handles
        const seed = new TSMap<string, string>()
        const x1 = parseInt(coordinates.start.x)
        const y1 = parseInt(coordinates.start.y)
        const x2 = parseInt(coordinates.end.x)
        const y2 = parseInt(coordinates.end.y)
        const centerX = Math.abs(x1 - x2) + Math.min(x1, x2)
        const centerY = Math.abs(y1 - y2) + Math.min(y1, y2)
        const a = centerX - Math.min(x1, x2)
        const b = centerY - Math.min(y1, y2)
        seed.set("x", String(centerX))
        seed.set("y", String(centerY))
        seed.set("a", String(a))
        seed.set("b", String(b))
        return seed
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

    const updateVariable = (key: string) => {
        if (activeVariable.type === VariableType.boolean) {
            if (key === "0") {
                setActiveAnnotations([new TSMap<string, string>([["Boolean", "false"]])])
            } else if (key === "1") {
                setActiveAnnotations([new TSMap<string, string>([["Boolean", "true"]])])
            } else {
                key = key.toLowerCase()
                if (key === "f") {
                    setActiveAnnotations([new TSMap<string, string>([["Boolean", "false"]])])
                } else if (key === "t") {
                    setActiveAnnotations([new TSMap<string, string>([["Boolean", "true"]])])
                }
            }
        } else if (activeVariable.type === VariableType.integer && (!isNaN(Number(key)))) {
            setActiveAnnotations([new TSMap<string, string>([["Integer", key]])])
        }
    }

    const handleEscapePress = () => {
        if (activeVariable.type === VariableType.boolean || activeVariable.type === VariableType.integer) {
            const text = '"Escape" key was pressed. Cached value deleted.'
            //setKeyPressed("Escape")
            setSnackbarOpen(true)
            setSnackbarText(text)
        }
    }

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.type === "keydown") {
            if (event.key === "Escape") {
                handleEscapePress()
            } else if (event.key.toLowerCase() === "z" && event.ctrlKey) {
                setUndo(true)
            } else if (event.key.toLowerCase() === "y" && event.ctrlKey) {
                setRedo(true)
            } else if (event.key === "Control") {
                setCorrectionMode(true)
            } else if (event.key === "Enter") {
                Promise.all(activeAnnotationsRef.current).then((values) => {
                    console.log(values)    
                    props.nextVariable(values)
                    setActiveAnnotations([])
                })
            } else {
                updateVariable(event.key)
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
            <Viewport 
                setActiveAnnotation={setActiveAnnotations}
                nextVariable={props.nextVariable}
                stackIndices={props.stackIndices} 
                segmentationsCount={props.segmentationsCount}/>
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