import {createRef, ReactElement, RefObject, useCallback, useEffect, useState} from "react";
import {Box, Divider, Stack} from "@mui/material";
import AnnotationData from "./AnnotationData";
import Image from "./Image";
import {GridCellParams, GridColDef, GridRowsProp} from "@mui/x-data-grid";
import {Patient, Patients} from "../Form/DicomDropzone/dicomObject";
import {AnnotationLevel} from "../Form";
import Variable, {VariableType} from "../Form/variable";
import {TSMap} from "typescript-map";
import {AnnotationToolStateType, SegmentationToolStateType} from "../index";
import useStateRef from "react-usestateref";

type AnnotationPropsType = {
    patients: Patients,
    variables: Variable[],
    annotationLevel: AnnotationLevel,
    toolStates: (AnnotationToolStateType | SegmentationToolStateType)[],
    stackIndices: Map<string, number>,
    segmentationsCount: number,
    variablesToColumns: Function,
    updateImageIds: Function,
    imageIds: string[],
    instanceNumbers: Map<string, number>,
    seriesDescriptions: TSMap<string, Array<string>>,
    columns: GridColDef[],
    rows: GridRowsProp,
}

const Annotation = (props: AnnotationPropsType): ReactElement => {
    const [activePatient, setActivePatient] = useState(props.patients.getPatient(0))
    const [activePatientIndex, setActivePatientIndex] = useState(0)
    const [activeVariable, setActiveVariable] = useState(props.variables[0])
    const [activeVariableIndex, setActiveVariableIndex] = useState(0)
    // const [activeStudyIndex, setActiveStudyIndex] = useState(0)
    const [jumpBackToVariableIndex, setJumpBackToVariableIndex] = useState(-1)
    const [jumpBackToPatientIndex, setJumpBackToPatientIndex] = useState(-1)
    const [dataGridWidth, setDataGridWidth] = useState(30)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [dividerClicked, setDividerClicked, dividerClickedRef] = useStateRef(false)
    const [columns, setColumns] = useState(props.columns)
    const [rows, setRows] = useState(props.rows)
    const [imageIds, setImageIds] = useState(props.imageIds)
    const [instanceNumbers, setInstanceNumbers] = useState(props.instanceNumbers)
    const [seriesDescriptions, setSeriesDescriptions] = useState(props.seriesDescriptions)

    const dividerRef: RefObject<HTMLHRElement> = createRef()


    useEffect(() => {
        // @ts-ignore
        dividerRef.current.addEventListener("mousedown", _handleMouse, false)
        document.addEventListener("mouseup", _handleMouse, false)
        document.addEventListener("mousemove", _handleMouse, false)
        addEventListener("beforeunload", (event) => {
            event.preventDefault()
        })
    }, [])

    useEffect(() => {
        setWindowWidth(window.innerWidth)
    }, [window.innerWidth])

    const _handleCellDoubleClick = (params: GridCellParams): void => {
        if (jumpBackToPatientIndex >= 0 || jumpBackToVariableIndex >= 0) {
            return
        }
        const newActivePatientIndex = Number(params.id)
        let newActivePatient: Patient
        if (props.annotationLevel === AnnotationLevel.patient) {
            newActivePatient = props.patients.getPatient(newActivePatientIndex)
        } else {
            // ToDo Implement annotation on study level
            // activePatient = props.patients.getPatientStudy(activePatientIndex, activeStudyIndex)
        }

        let activeVariableIndex: number = -1
        props.variables.forEach((variable, index) => {
            if (variable.name === JSON.parse(params.field).name)
                activeVariableIndex = index
        })
        const activeVariable = props.variables[activeVariableIndex]
        const columns = props.variablesToColumns(newActivePatientIndex, activeVariable.name, props.variables, props.annotationLevel);
        // @ts-ignore Because annotationLevel currently always true for patient
        const {imageIds, instanceNumbers, seriesDescriptions} = props.updateImageIds(newActivePatient)

        // @ts-ignore Because annotationLevel currently always true for patient
        setActivePatient(newActivePatient)
        setActivePatientIndex(newActivePatientIndex)

        setActiveVariable(activeVariable)
        setActiveVariableIndex(activeVariableIndex)

        setColumns(columns)
        setImageIds(imageIds)
        setInstanceNumbers(instanceNumbers)
        setSeriesDescriptions(seriesDescriptions)

        if (jumpBackToVariableIndex === -1 && jumpBackToPatientIndex === -1) {
            setJumpBackToVariableIndex(activeVariableIndex)
            setJumpBackToPatientIndex(newActivePatientIndex)
        }
    }

    const _handleMouse = (event: MouseEvent): void => {
        if (event.type === "mousedown") {
            setDividerClicked(true)
        } else if (event.type === "mouseup") {
            setDividerClicked(false)
        } else if (event.type === "mousemove") {
            if (dividerClickedRef.current) {
                let width: number = Math.floor(100 * event.clientX / windowWidth)
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
        const newRows = props.rows
        newRows.forEach(row => {
            // @ts-ignore
            if (row.id === activePatientIndex) {
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

    const nextVariable = (currentValues: TSMap<string, string>[]): void => {
        const newRows = _updateRows(currentValues)
        let newActiveVariableIndex = activeVariableIndex
        let newJumpBackToVariableIndex = jumpBackToVariableIndex
        if (jumpBackToVariableIndex >= 0) {
            newActiveVariableIndex = jumpBackToVariableIndex
            newJumpBackToVariableIndex = -1
        } else {
            newActiveVariableIndex++
        }
        let newActivePatientIndex = activePatientIndex
        if (jumpBackToPatientIndex >= 0) {
            newActivePatientIndex = _nextPatient()
        } else if (newActiveVariableIndex === props.variables.length) {
            newActiveVariableIndex = 0
            newActivePatientIndex = _nextPatient()
        }
        const newActiveVariable = props.variables[newActiveVariableIndex]

        const newColumns = props.variablesToColumns(newActivePatientIndex, newActiveVariable.name, props.variables, props.annotationLevel)

        setActivePatientIndex(newActivePatientIndex)
        setActiveVariableIndex(newActiveVariableIndex)
        setActiveVariable(newActiveVariable)
        setColumns(newColumns)
        setRows(newRows)
        setJumpBackToVariableIndex(newJumpBackToVariableIndex)
    }

    const _nextPatient = (): number => {
        let newActivePatientIndex = activePatientIndex
        let newJumpBackToPatientIndex = jumpBackToPatientIndex
        if (newJumpBackToPatientIndex >= 0) {
            newActivePatientIndex = jumpBackToPatientIndex
            newJumpBackToPatientIndex = -1
        } else {
            newActivePatientIndex++
        }
        if (newActivePatientIndex >= props.patients.patients.length) {
            setActivePatientIndex(-1)
            setImageIds([])
            setJumpBackToPatientIndex(-1)
            return -1
        } else {
            let newActivePatient: Patient
            if (props.annotationLevel === AnnotationLevel.patient) {
                newActivePatient = props.patients.getPatient(newActivePatientIndex)
            } else {
                // ToDo Implement annotation on study level
                // newActivePatient = props.patients.getPatientStudy(newActivePatientIndex, activeStudyIndex)
            }
            // @ts-ignore Because annotationLevel currently always true for patient
            const {imageIds, instanceNumbers, seriesDescriptions} = props.updateImageIds(newActivePatient)
            setImageIds(imageIds)
            setInstanceNumbers(instanceNumbers)
            setSeriesDescriptions(seriesDescriptions)

            // @ts-ignore Because annotationLevel currently always true for patient
            setActivePatient(newActivePatient)
            setJumpBackToPatientIndex(newJumpBackToPatientIndex)
            return newActivePatientIndex
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
            <AnnotationData width={dataGridWidth}
                            rows={rows}
                            // @ts-ignore
                            columns={columns}
                            handleCellClick={_handleCellDoubleClick}
                            activePatientIndex={activePatientIndex}
                            activeVariableIndex={activeVariableIndex}/>
            <Box sx={{width: String(100 - dataGridWidth) + "%"}}>
                <Image activePatient={activePatient}
                       activeVariable={activeVariable}
                       nextVariable={nextVariable}
                       imageIds={imageIds}
                       instanceNumbers={instanceNumbers}
                       seriesDescriptions={seriesDescriptions}
                       toolStates={props.toolStates}
                       stackIndices={props.stackIndices}
                       segmentationsCount={props.segmentationsCount}/>
            </Box>
        </Stack>
    )
}

export default Annotation;