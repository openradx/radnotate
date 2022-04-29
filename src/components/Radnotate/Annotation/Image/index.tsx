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
import { useToolStateStore, ToolStateStore } from "./Viewport/store";
import { process } from "./utils";

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
    // toolStates: ToolState[],
    // setToolStates: (toolStates: ToolState[]) => void,
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
    // toolStates: [],
    // setToolStates: (toolStates: ToolState[]): void => set(() => ({toolStates: toolStates})),
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
    const reset = useImageStore((state: ImageState) => state.reset)
    const setReset = useImageStore((state: ImageState) => state.setReset)
    const setCorrectionMode = useImageStore((state: ImageState) => state.setCorrectionMode)
    const toolStates = useToolStateStore((state: ToolStateStore) => state.toolStates)

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
    const activeSeries = useImageStore((state: ImageState) => state.activeSeries)
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
            activeAnnotations.push(await process(toolState, imageStack, activeSeries))
        })
        setActiveAnnotations(activeAnnotations)
    }, [toolStates])

    useEffect(() => {
        if (reset) {
            if (activeVariable.type === VariableType.boolean) {
                _processBoolean("Delete")
                setReset(false)
            } else if (activeVariable.type === VariableType.integer) {
                _processInteger("Delete")
                setReset(false)
            }
        }
    }, [reset])

    const _processBoolean = (key: string) => {
        if (key === "Delete") {
            setSnackbarOpen(true)
            setSnackbarText('"Delete" key was pressed. Cached value deleted.')
            setActiveAnnotations([new TSMap<string, string>([["value", "delete"]])])
        } else if (key === "0") {
            setSnackbarOpen(true)
            setSnackbarText('"0" key was pressed.')
            setActiveAnnotations([new TSMap<string, string>([["boolean", "false"]])])
        } else if (key === "1") {
            setSnackbarOpen(true)
            setSnackbarText('"1" key was pressed.')
            setActiveAnnotations([new TSMap<string, string>([["boolean", "true"]])])
        } else {
            key = key.toLowerCase()
            if (key === "f") {
                setSnackbarOpen(true)
                setSnackbarText('"f" key was pressed.')
                setActiveAnnotations([new TSMap<string, string>([["boolean", "false"]])])
            } else if (key === "t") {
                setSnackbarOpen(true)
                setSnackbarText('"t" key was pressed.')
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
            setSnackbarText('"' + key + '" key was pressed.')
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