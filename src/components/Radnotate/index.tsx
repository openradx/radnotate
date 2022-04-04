import {ReactElement, useState} from "react";
import Form, {AnnotationLevel} from "./Form";
import Variable, {VariableToolType, VariableType} from "./Form/variable";
import {ImageType, Patient, Patients, Series, Study} from "./Form/DicomDropzone/dicomObject";
import {GridRowsProp,} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import {TSMap} from "typescript-map"
import {LicenseInfo} from "@mui/x-data-grid-pro";
import {Settings} from "./Settings";
import Annotation, { AnnotationState, useAnnotationStore } from "./Annotation";
import create from "zustand";
import useStateRef from "react-usestateref";
import { ImageState, useImageStore } from "./Annotation/Image";

LicenseInfo.setLicenseKey("07a54c751acde4192070a1600dac24bdT1JERVI6MCxFWFBJUlk9MTc5OTc3Njg5NjA4NCxLRVlWRVJTSU9OPTE=",);

export type SegmentationToolData = {
    height: number,
    width: number,
    pixelData: Uint8Array,
    segmentationIndex: number
}

export type AnnotationToolData = {
    tool: string,
    data: Object
}

export enum ToolType {
    annotation,
    segmentation,
}

export type ToolState = {
    type: ToolType,
    patientID: string,
    variableID: number,
    imageID: string,
    variableType: VariableType,
    data: SegmentationToolData | AnnotationToolData,
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
    const rows = useRadnotateStore((state: RadnotateState) => state.rows)
    const setRows = useRadnotateStore((state: RadnotateState) => state.setRows)
    const setActivePatient = useRadnotateStore((state: RadnotateState) => state.setActivePatient)
    const setActiveVariable = useRadnotateStore((state: RadnotateState) => state.setActiveVariable)
    const annotationLevel = useRadnotateStore((state: RadnotateState) => state.annotationLevel)
    const setAnnotationLevel = useRadnotateStore((state: RadnotateState) => state.setAnnotationLevel)

    const setPreviousPatientIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousPatientIndex)
    const setPreviousVariableIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousVariableIndex)

    const setToolStates = useImageStore((state: ImageState) => state.setToolStates)

    const [annotationMode, setAnnotationMode] = useState<boolean>(false)
    const [, setSopUidToImageID] = useState<Map<string, string>>()
    const [segmentationsCount, setSegmentationsCount] = useState<number>(0)

    const _initSopUidToImageID = (patients: Patients) => {
        const sopUidToImageID = new Map<string, string>()
        patients.patients.forEach((patient: Patient) => {
            patient.studies.forEach((study: Study) => {
                study.series.forEach((series: Series) => {
                    series.images.forEach((image: ImageType) => {
                        sopUidToImageID.set(image.sopInstanceUID, image.imageID)
                    })
                })
            })
        })
        return sopUidToImageID
    }

    const _initToolStates = (rows: GridRowsProp, sopUidToImageID: Map<string, string>) => {
        const toolStates:ToolState[] = []
        rows.forEach((row) => {
            const patientID: string = row["PatientID"]
            const fields = Object.keys(row)
            fields.forEach((field, variableID) => {
                if (field !== "PatientID" && field !== "id") {
                    if (row[field] !== "") {
                        const annotations = JSON.parse(row[field])
                        const type = JSON.parse(field).type
                        annotations.forEach((annotation)  => {
                            if (type === VariableType.segmentation) {
                                const toolState: ToolState = {
                                    type: ToolType.segmentation,
                                    patientID: patientID,
                                    variableID: variableID - 1,
                                    imageID: sopUidToImageID.get(annotation.sopUid),
                                    variableType: type,
                                    data: {width: annotation.width, height: annotation.height, segmentationIndex: annotation.segmentationIndex, pixelData: new Uint8Array(atob(annotation.pixelData).split("").map(function (c) {
                                            return c.charCodeAt(0);
                                    }))}
                                }
                                toolStates.push(toolState)
                            } else if (type !== VariableType.boolean && type !== VariableType.integer) {
                                const toolState: ToolState = {
                                    type: ToolType.annotation,
                                    patientID: patientID,
                                    variableID: variableID - 1,
                                    imageID: sopUidToImageID.get(annotation.sopUid),
                                    variableType: type,
                                    data: {tool: VariableToolType.get(type), data: JSON.parse(annotation.data)},
                                }
                                toolStates.push(toolState)
                            }
                        })
                    }
                }
            })
        })
        return toolStates
    }

    const saveAnnotationForm = (patients: Patients, variables: Variable[], rows: GridRowsProp, annotationLevel: AnnotationLevel, segmentationsCount: number): void => {
        setPatients(patients)
        setVariables(variables)
        setRows(rows)
        setAnnotationLevel(annotationLevel)
        setSegmentationsCount(segmentationsCount)

        setActivePatient(patients.getPatient(0))
        setActiveVariable(variables[0])

        const sopUidToImageID = _initSopUidToImageID(patients)
        const toolStates = _initToolStates(rows, sopUidToImageID)
        setSopUidToImageID(sopUidToImageID)
        setToolStates(toolStates)
        setAnnotationMode(true)
    }

    const clearTable = (): void => {
        rows.forEach((row) => {
            const keys = Object.keys(row)
            keys.forEach((key: string) => {
                if (key !== "PatientID" && key !== "id") {
                    delete row[key]
                }
            })
        })
        setPreviousPatientIndex(-1)
        setPreviousVariableIndex(-1)
        saveAnnotationForm(patients, variables, rows, annotationLevel, segmentationsCount)
    }

    const restartWorkflow = (): void => {
        setAnnotationMode(false)
    }

    const restartAnnotating = (): void => {
        const activeVariable = variables[0]
        const activePatient = patients.getPatient(0)
        setActivePatient(activePatient)
        setActiveVariable(activeVariable)
        setPreviousPatientIndex(-1)
        setPreviousVariableIndex(-1)
    }

    return (
        <Box>
            {annotationMode ?
                <Annotation/>
                :
                <Form saveAnnotationForm={saveAnnotationForm}/>
            }
            <Settings clearTable={clearTable}
                      colorMode={props.colorMode}
                      restartWorkflow={restartWorkflow}
                      restartAnnotating={restartAnnotating}
                      annotationMode={annotationMode}
                      />
        </Box>
    )
}

export default Radnotate;