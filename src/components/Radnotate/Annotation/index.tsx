import {createRef, ReactElement, RefObject, useEffect, useRef, useState} from "react";
import {Box, Divider, Stack} from "@mui/material";
import Data from "./Data";
import Image from "./Image";
import {GridRowsProp} from "@mui/x-data-grid";
import {Patient} from "../Form/DicomDropzone/dicomObject";
import {AnnotationLevel} from "../Form";
import {VariableType} from "../Form/variable";
import {TSMap} from "typescript-map";
import create from "zustand";
import { RadnotateState, useRadnotateStore} from "../index";
import useStateRef from "react-usestateref";

type AnnotationProps = {
}

export type AnnotationState = {
    previousVariableIndex: number,
    setPreviousVariableIndex: (lastVariableIndex: number) => void,
    previousPatientIndex: number,
    setPreviousPatientIndex: (lastPatientIndex: number) => void,
}

export const useAnnotationStore = create((set: Function): AnnotationState => ({
    previousVariableIndex: -1,
    setPreviousVariableIndex: (previousVariableIndex: number): void => set(() => ({previousVariableIndex: previousVariableIndex})),
    previousPatientIndex: -1,
    setPreviousPatientIndex: (previousPatientIndex: number): void => set(() => ({previousPatientIndex: previousPatientIndex})),
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
    const previousPatientIndex = useAnnotationStore((state: AnnotationState) => state.previousPatientIndex)
    const setPreviousPatientIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousPatientIndex)
    const previousVariableIndex = useAnnotationStore((state: AnnotationState) => state.previousVariableIndex)
    const setPreviousVariableIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousVariableIndex)
    
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
            _nextVariable()
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

    const _updateRows = (activeAnnotations: TSMap<string, string>[]): GridRowsProp => {
        const newRows = rows
        // @ts-ignore //ToDo Handle row type properly, dynamic type generation?
        newRows.forEach((row) => {
            // @ts-ignore
            if (row.id === activePatient.id) {
                let json = "["
                if (activeAnnotations.length) {
                    activeAnnotations.forEach(value => {
                        json += JSON.stringify(value.toJSON())
                        json += ","
                    })
                    json = json.slice(0, json.length - 1) + "]"
                } else {
                    json += "]"
                }
                if (activeVariable.type === VariableType.boolean || activeVariable.type === VariableType.integer) {
                    if (activeAnnotations[0] !== undefined) {
                        if (activeAnnotations[0].get("value") === "delete") {
                            row[activeVariable.toString()] = "[]"
                        } else {
                            row[activeVariable.toString()] = json
                        }
                    } else if (row[activeVariable.toString()] === undefined) {
                        row[activeVariable.toString()] = json
                    } else if (row[activeVariable.toString()] === ""){
                        row[activeVariable.toString()] = json
                    }
                } else {
                    row[activeVariable.toString()] = json
                }
            }
        })
        return newRows
    }

    const _nextVariable = (): void => {
        const updatedRows = _updateRows(activeAnnotations)
        setRows(updatedRows)
        let newActiveVariableIndex = activeVariable.id
        let newPreviousVariableIndex = previousVariableIndex
        if (previousVariableIndex >= 0) {
            newActiveVariableIndex = previousVariableIndex
            newPreviousVariableIndex = -1
        } else if (previousVariableIndex === -1) {
            newActiveVariableIndex++
        }
        setPreviousVariableIndex(newPreviousVariableIndex)
        if (newActiveVariableIndex === variables.length) {
            setActiveVariable(variables[0])
            _nextPatient()
        } else if (previousVariableIndex === -2) {
            setPreviousPatientIndex(-2)
            setPreviousVariableIndex(-2)
            setActivePatient(null)
            setActiveVariable(null)
        } else {
            if (previousVariableIndex >= 0) {
                _nextPatient()
            }
            setActiveVariable(variables[newActiveVariableIndex])
        }
    }

    const _nextPatient = (): void => {
        let newActivePatientIndex = activePatient.id
        let newPreviousPatientIndex = previousPatientIndex
        if (newPreviousPatientIndex >= 0) {
            newActivePatientIndex = previousPatientIndex
            newPreviousPatientIndex = -1
        } else {
            newActivePatientIndex++
        }
        if (newActivePatientIndex >= patients.patients.length || previousPatientIndex === -2) {
            setPreviousPatientIndex(-2)
            setPreviousVariableIndex(-2)
            setActivePatient(null)
            setActiveVariable(null)
        } else {
            let newActivePatient: Patient
            if (annotationLevel === AnnotationLevel.patient) {
                newActivePatient = patients.getPatient(newActivePatientIndex)
            } else {
                // ToDo Implement annotation on study level
                // newActivePatient = props.patients.getPatientStudy(newActivePatientIndex, activeStudyIndex)
            }
            setPreviousPatientIndex(newPreviousPatientIndex)
            // @ts-ignore Because annotationLevel currently always true for patient
            setActivePatient(newActivePatient)
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
                <Image setActiveAnnotations={setActiveAnnotations}
                    />
            </Box>
        </Stack>
    )
}

export default Annotation;