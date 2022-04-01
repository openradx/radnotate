import {createRef, ReactElement, RefObject, useEffect, useLayoutEffect, useRef, useState} from "react";
import {Box, Divider, Stack} from "@mui/material";
import Data from "./Data";
import Image from "./Image";
import {GridRowsProp} from "@mui/x-data-grid";
import {Patient} from "../Form/DicomDropzone/dicomObject";
import {AnnotationLevel} from "../Form";
import {VariableType} from "../Form/variable";
import {TSMap} from "typescript-map";
import create from "zustand";
import {AnnotationToolData, RadnotateState, SegmentationToolData, useRadnotateStore} from "../index";
import useStateRef from "react-usestateref";

type AnnotationProps = {
    toolStates: (AnnotationToolData | SegmentationToolData)[],
    stackIndices: Map<string, number>,
    segmentationsCount: number,
}

export type AnnotationState = {
    lastVariableIndex: number,
    setLastVariableIndex: (lastVariableIndex: number) => void,
    lastPatientIndex: number,
    setLastPatientIndex: (lastPatientIndex: number) => void,
}

export const useAnnotationStore = create((set: Function): AnnotationState => ({
    lastVariableIndex: -1,
    setLastVariableIndex: (lastVariableIndex: number): void => set(() => ({lastVariableIndex: lastVariableIndex})),
    lastPatientIndex: -1,
    setLastPatientIndex: (lastPatientIndex: number): void => set(() => ({lastPatientIndex: lastPatientIndex})),
}))


const Annotation = (props: AnnotationProps): ReactElement => {
    const patients = useRadnotateStore((state: RadnotateState) => state.patients)
    const variables = useRadnotateStore((state: RadnotateState) => state.variables)
    const rows = useRadnotateStore((state: RadnotateState) => state.rows)
    const activePatient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activeVariable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    const setActivePatient = useRadnotateStore((state: RadnotateState) => state.setActivePatient)
    const setActiveVariable = useRadnotateStore((state: RadnotateState) => state.setActiveVariable)
    const setRows = useRadnotateStore((state: RadnotateState) => state.setRows)
    const annotationLevel = useRadnotateStore((state: RadnotateState) => state.annotationLevel)
    const lastPatientIndex = useAnnotationStore((state: AnnotationState) => state.lastPatientIndex)
    const setLastPatientIndex = useAnnotationStore((state: AnnotationState) => state.setLastPatientIndex)
    const lastVariableIndex = useAnnotationStore((state: AnnotationState) => state.lastVariableIndex)
    const setLastVariableIndex = useAnnotationStore((state: AnnotationState) => state.setLastVariableIndex)
    
    const firstUpdate = useRef(true);
    const [dataGridWidth, setDataGridWidth] = useState(30)
    const [activeAnnotations, setActiveAnnotations] = useState<TSMap<string, string>[]>([])
    const [_, setWindowWidth, windowWidthRef] = useStateRef(window.innerWidth)
    
    const [, setDividerClicked, dividerClickedRef] = useStateRef(false)

    const dividerRef: RefObject<HTMLHRElement> = createRef()

    useEffect(() => {
        // @ts-ignore
        dividerRef.current.addEventListener("mousedown", _handleMouse, false)
        document.addEventListener("mouseup", _handleMouse, false)
        document.addEventListener("mousemove", _handleMouse, false)
        document.addEventListener("contextbeforeunload", (event) => {
            event.preventDefault()
        })
        return () => {
            if (dividerRef.current !== null) {
                dividerRef.current.removeEventListener("mousedown", _handleMouse, false)
            }
            document.removeEventListener("mouseup", _handleMouse, false)
            document.removeEventListener("mousemove", _handleMouse, false)
            document.removeEventListener("contextbeforeunload", (event) => {
                event.preventDefault()
            })
        }
    }, [])

    useEffect(() => {
        setWindowWidth(window.innerWidth)
    }, [window.innerWidth])

    useEffect(() => {
        if (!firstUpdate.current) {
            nextVariable()
        } else {
            firstUpdate.current = false
        }
    }, [activeAnnotations])

    const _handleMouse = (event: MouseEvent): void => {
        if (event.type === "mousedown") {
            setDividerClicked(true)
        } else if (event.type === "mouseup") {
            setDividerClicked(false)
        } else if (event.type === "mousemove") {
            if (dividerClickedRef.current) {
                let width: number = Math.floor(100 * event.clientX / windowWidthRef.current)
                if (width > 99) {
                    width = 99
                } else if (width < 0) {
                    width = 0
                }
                setDataGridWidth(width)
            }
        }
    }

    const _updateRows = (currentValues: TSMap<string, string>[]): GridRowsProp => {
        const newRows = rows
        // @ts-ignore //ToDo Handle row type properly, dynamic type generation?
        newRows.forEach((row) => {
            // @ts-ignore
            if (row.id === activePatient.id) {
                let json = "["
                if (currentValues.length) {
                    currentValues.forEach(value => {
                        json += JSON.stringify(value.toJSON())
                        json += ","
                    })
                    json = json.slice(0, json.length - 1) + "]"
                } else {
                    json += "]"
                }
                if (activeVariable.type === VariableType.boolean || activeVariable.type === VariableType.integer) {
                    if (currentValues[0] !== undefined) {
                        if (currentValues[0].get("value") === "Escape") {
                            row[activeVariable.toString()] = "[]"
                        } else {
                            row[activeVariable.toString()] = json
                        }
                    } else if (row[activeVariable.toString()] === undefined) {
                        row[activeVariable.toString()] = json
                    }
                } else {
                    row[activeVariable.toString()] = json
                }
            }
        })
        return newRows
    }

    const nextVariable = (): void => {
        const newRows = _updateRows(activeAnnotations)
        let newActiveVariableIndex = activeVariable.id
        let newJumpBackToVariableIndex = lastVariableIndex
        if (newJumpBackToVariableIndex >= 0) {
            newActiveVariableIndex = lastVariableIndex
            newJumpBackToVariableIndex = -1
        } else {
            newActiveVariableIndex++
        }
        if (lastPatientIndex >= 0) {
            _nextPatient()
        } else if (newActiveVariableIndex === variables.length) {
            newActiveVariableIndex = 0
            _nextPatient()
        }
        const newActiveVariable = variables[newActiveVariableIndex]
        setActiveVariable(newActiveVariable)
        setRows(newRows)
        setLastVariableIndex(newJumpBackToVariableIndex)
    }

    const _nextPatient = (): void => {
        let newActivePatientIndex = activePatient.id
        let newJumpBackToPatientIndex = lastPatientIndex
        if (newJumpBackToPatientIndex >= 0) {
            newActivePatientIndex = lastPatientIndex
            newJumpBackToPatientIndex = -1
        } else {
            newActivePatientIndex++
        }
        if (newActivePatientIndex >= patients.patients.length) {
            setLastPatientIndex(-1)
        } else {
            let newActivePatient: Patient
            if (annotationLevel === AnnotationLevel.patient) {
                newActivePatient = patients.getPatient(newActivePatientIndex)
            } else {
                // ToDo Implement annotation on study level
                // newActivePatient = props.patients.getPatientStudy(newActivePatientIndex, activeStudyIndex)
            }
            // @ts-ignore Because annotationLevel currently always true for patient
            setActivePatient(newActivePatient)
            setLastPatientIndex(newJumpBackToPatientIndex)
        }
    }

    return (
        <Stack direction={"row"}
               justifyContent="space-evently"
               spacing={0}
               alignItems="stretch"
               divider={
                   <Divider ref={dividerRef}
                            sx={{
                                cursor: "col-resize",
                                borderRightWidth: 4,
                                marginLeft: 1,
                                marginRight: 1,
                                height: "96.5vh"
                            }}
                            orientation="vertical" flexItem/>
               }>
            <Data width={dataGridWidth}/>
            <Box sx={{width: String(100 - dataGridWidth) + "%"}}>
                <Image nextVariable={setActiveAnnotations}
                       toolStates={props.toolStates}
                       stackIndices={props.stackIndices}
                       segmentationsCount={props.segmentationsCount}/>
            </Box>
        </Stack>
    )
}

export default Annotation;