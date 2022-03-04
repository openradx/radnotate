import {ReactElement, useState} from "react";
import Form, {AnnotationLevel} from "./Form";
import Variable, {ToolType, VariableType} from "./Form/variable";
import {Patient, Patients, Series, Study} from "./Form/DicomDropzone/dicomObject";
import {GridRowsProp,} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import {TSMap} from "typescript-map"
import {LicenseInfo} from "@mui/x-data-grid-pro";
import {Settings} from "./Settings";
import Annotation from "./Annotation";
import create from "zustand";
LicenseInfo.setLicenseKey("07a54c751acde4192070a1600dac24bdT1JERVI6MCxFWFBJUlk9MTc5OTc3Njg5NjA4NCxLRVlWRVJTSU9OPTE=",);

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

type RadnotateProps = {
    colorMode: {toggleColorMode: Function}
}

export type ImageStack = {
    imageIDs: string[],
    instanceNumbers: Map<string, number>,
    seriesDescriptions: TSMap<string, Array<string>>,
}

export type RadnotateState = {
    patients: Patients,
    setPatients: (patients: Patients) => void,
    variables: Variable[],
    setVariables: (variables: Variable[]) => void,
    rows: GridRowsProp,
    setRows: (rows: GridRowsProp) => void,
    activePatient: undefined | Patient,
    setActivePatient: (patient: Patient) => void,
    activeVariable: undefined | Variable,
    setActiveVariable: (variable: Variable) => void,
    annotationLevel: AnnotationLevel,
    setAnnotationLevel: (annotationLevel: AnnotationLevel) => void,
}

export const useRadnotateStore = create((set: Function): RadnotateState => ({
    patients: new Patients(),
    setPatients: (patients: Patients): void => set(() => ({patients: patients})),
    variables: [new Variable(0)],
    setVariables: (variables: Variable[]): void => set(() => ({variables: variables})),
    rows: [],
    setRows: (rows: GridRowsProp): void => set(() => ({rows: rows})),
    activePatient: undefined,
    setActivePatient: (patient: Patient): void => set(() => ({activePatient: patient})),
    activeVariable: undefined,
    setActiveVariable: (variable: Variable): void => set(() => ({activeVariable: variable})),
    annotationLevel: AnnotationLevel.patient,
    setAnnotationLevel: (annotationLevel: AnnotationLevel): void => set(() => ({annotationLevel: annotationLevel})),
}))

const Radnotate = (props: RadnotateProps): ReactElement => {
    const patients = useRadnotateStore((state: RadnotateState) => state.patients)
    const setPatients = useRadnotateStore((state: RadnotateState) => state.setPatients)
    const variables = useRadnotateStore((state: RadnotateState) => state.variables)
    const setVariables = useRadnotateStore((state: RadnotateState) => state.setVariables)
    const setRows = useRadnotateStore((state: RadnotateState) => state.setRows)
    const setActivePatient = useRadnotateStore((state: RadnotateState) => state.setActivePatient)
    const setActiveVariable = useRadnotateStore((state: RadnotateState) => state.setActiveVariable)
    const annotationLevel = useRadnotateStore((state: RadnotateState) => state.annotationLevel)
    const setAnnotationLevel = useRadnotateStore((state: RadnotateState) => state.setAnnotationLevel)
    const [annotationMode, setAnnotationMode] = useState<boolean>(false)
    const [toolStates, setToolStates] = useState<(AnnotationToolState | SegmentationToolState)[]>()
    const [stackIndices, setStackIndices] = useState<Map<string, number>>()
    const [segmentationsCount, setSegmentationsCount] = useState<number>()

    const _initRowIndices = (patients: Patients, annotationLevel: AnnotationLevel): string[] => {
        const rowNames: string[] = []
        if (annotationLevel === AnnotationLevel.patient) {
            patients?.patients.forEach((patient) => {
                rowNames.push(patient.patientID)
            })
        } else {
            patients?.patients.forEach((patient) => {
                patient.studies.forEach((study) => {
                    rowNames.push(patient.patientID + " " + study.studyDescription)
                })
            })
        }
        return rowNames
    }

    const saveAnnotationForm = (patients: Patients, variables: Variable[], rows: GridRowsProp, annotationLevel: AnnotationLevel): void => {
        setPatients(patients)
        setVariables(variables)
        setAnnotationLevel(annotationLevel)
        let segmentationIndex = 0
        variables.forEach(variable => {
            if (variable.type === VariableType.segmentation) {
                variable.segmentationIndex = segmentationIndex++
            }
        })
        if (annotationLevel === AnnotationLevel.patient) {
            if (rows.length > 0) {
                const imagePatientIDs: string[] = []
                const annotationPatientIDs: string[] = []
                patients.patients.forEach(patient => {
                    imagePatientIDs.push(patient.patientID)
                })
                rows.forEach(row => {
                    // @ts-ignore
                    const patientID = row.PatientID
                    annotationPatientIDs.push(patientID)
                })
                const intersectionPatientIDs = imagePatientIDs.filter(patientID => annotationPatientIDs.includes(patientID));
                imagePatientIDs.forEach(patientID => {
                    if (!intersectionPatientIDs.includes(patientID)) {
                        patients.deletePatient(patientID)
                    }
                })
                const deleteIndices: number[] = []
                annotationPatientIDs.forEach(patientID => {
                    if (!intersectionPatientIDs.includes(patientID)) {
                        rows.forEach((row, index) => {
                            // @ts-ignore
                            if (row.PatientID === patientID) {
                                deleteIndices.push(index)
                            }
                        })
                    }
                })
                let counter = 0
                deleteIndices.forEach(deleteIndex => {
                    // @ts-ignore
                    rows.splice(deleteIndex - counter++, 1)
                })
                rows.forEach((row, index) => {
                    // @ts-ignore
                    row.id = index
                })
            }
        }
        _init(patients, variables, rows, annotationLevel)
        setAnnotationMode(true)
        setSegmentationsCount(segmentationIndex)
    }

    // ToDo Refactor this into Annotation component by splitting up inital row and inital tool state
    const _init = (patients: Patients, variables: Variable[], rows: GridRowsProp,annotationLevel: AnnotationLevel): void => {
        let activePatient = patients.getPatient(0)
        let activePatientIndex = 0
        let activeVariable = variables[0]
        let activeVariableIndex = 0
        const stackIndices = new Map<string, number>()
        const toolStates: (AnnotationToolState | SegmentationToolState)[] = []
        let initialRows: GridRowsProp = []
        const rowNames = _initRowIndices(patients, annotationLevel)
        if (rows.length === 0) {
            rowNames.forEach((rowName, index) => {
                const row: {PatientID: string, id: number} = {
                    PatientID: rowName,
                    id: index
                }
                // @ts-ignore
                initialRows.push(row)
            })
        } else {
            initialRows = rows
            const annotations: {
                sopUid: string,
                variableIndex: number,
                height?: number,
                width?: number,
                pixelData?: Uint8Array,
                segmentationIndex?: number,
                tool?: string,
                data?: Object
            }[] = []
            let sopInstanceUIDs: string[] = []
            let isFirst = true
            rows.forEach((row, patientIndex) => {
                const fields = Object.keys(row)
                fields.forEach((field, variableIndex) => {
                    if (field !== "PatientID" && field !== "id") {
                        if (row[field] !== "") {
                            const currentValues = JSON.parse(row[field])
                            const type = JSON.parse(field).type
                            currentValues.forEach((currentValue: {
                                sopUid: string,
                                pixelData: string,
                                height: number,
                                width: number,
                                segmentationIndex: number
                                data: Object
                            })  => {
                                if (type === VariableType.segmentation) {
                                    annotations.push({
                                        sopUid: currentValue.sopUid,
                                        variableIndex: variableIndex - 1,
                                        height: currentValue.height,
                                        width: currentValue.width,
                                        pixelData: new Uint8Array(atob(currentValue.pixelData).split("").map(function (c) {
                                            return c.charCodeAt(0);
                                        })),
                                        segmentationIndex: currentValue.segmentationIndex})
                                } else if (type !== VariableType.boolean && type !== VariableType.integer) {
                                    annotations.push({
                                        sopUid: currentValue.sopUid,
                                        variableIndex: variableIndex - 1,
                                        tool: ToolType.get(type),
                                        data: currentValue.data})
                                }
                                sopInstanceUIDs.push(currentValue.sopUid)
                            })
                        } else if (isFirst) {
                            isFirst = false
                            activeVariableIndex = variableIndex - 1
                            activePatientIndex = patientIndex
                            activePatient = patients.getPatient(activePatientIndex)
                            activeVariable = variables[activeVariableIndex]
                        }
                    }
                })
            })
            sopInstanceUIDs = [...new Set(sopInstanceUIDs)]
            let stackCounter = 0
            patients.patients.forEach(patient => {
                patient.studies.forEach(study => {
                    study.series.forEach(series => {
                        series.images.forEach(image => {
                            stackIndices.set(image.imageID, stackCounter++)
                            if (sopInstanceUIDs.includes(image.sopInstanceUID)) {
                                annotations.forEach(annotation => {
                                    const annotationSopUid = annotation.sopUid
                                    if (annotationSopUid === image.sopInstanceUID) {
                                        let toolState: AnnotationToolState | SegmentationToolState
                                        if (annotation.tool !== undefined && annotation.data !== undefined) {
                                            toolState = {
                                                patientID: patient.patientID,
                                                variableID: annotation.variableIndex,
                                                imageId: image.imageID,
                                                tool: annotation.tool,
                                                data: annotation.data,

                                            }
                                            toolStates.push(toolState)
                                        } else if (annotation.height !== undefined && annotation.width !== undefined && annotation.pixelData !== undefined && annotation.segmentationIndex !== undefined){
                                            toolState = {
                                                patientID: patient.patientID,
                                                variableID: annotation.variableIndex,
                                                imageId: image.imageID,
                                                height: annotation.height,
                                                width: annotation.width,
                                                pixelData: annotation.pixelData,
                                                segmentationIndex: annotation.segmentationIndex
                                            }
                                            toolStates.push(toolState)
                                        }
                                    }
                                })
                            }
                        })
                    })
                })
            })
        }
        setActivePatient(activePatient)
        setActiveVariable(activeVariable)
        setRows(initialRows)
        setToolStates(toolStates)
        setStackIndices(stackIndices)
    }

    const clearTable = (): void => {
        saveAnnotationForm(patients, variables, [], annotationLevel)
    }

    const restartWorkflow = (): void => {
        setAnnotationMode(false)
    }

    const restartAnnotating = (): void => {
        const activeVariable = variables[0]
        const activePatient = patients.getPatient(0)
        setActivePatient(activePatient)
        setActiveVariable(activeVariable)
    }

    return (
        <Box>
            {annotationMode ?
                <Annotation
                    toolStates={toolStates}
                    stackIndices={stackIndices}
                    segmentationsCount={segmentationsCount}
                />
                :
                <Form saveAnnotationForm={saveAnnotationForm}/>
            }
            <Settings clearTable={clearTable}
                      colorMode={props.colorMode}
                      restartWorkflow={restartWorkflow}
                      restartAnnotating={restartAnnotating}
                      annotationMode={annotationMode}/>
        </Box>
    )
}

export default Radnotate;