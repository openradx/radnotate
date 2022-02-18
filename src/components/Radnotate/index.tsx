import {Component, ReactElement, ReactNode} from "react";
import AnnotationForm, {AnnotationLevel} from "./Form";
import Variable, {ToolType, VariableType} from "./Form/variable";
import {Patient, Patients} from "./Form/DicomDropzone/dicomObject";
import {GridCellParams, GridColDef, GridRowsProp,} from "@mui/x-data-grid";
import clsx from "clsx";
import {Box, Tooltip} from "@mui/material";
import {TSMap} from "typescript-map"
import {GridColumnHeaderParams, GridRenderCellParams, LicenseInfo} from "@mui/x-data-grid-pro";
import {Settings} from "./Settings";
import Annotation from "./Annotation";

LicenseInfo.setLicenseKey("07a54c751acde4192070a1600dac24bdT1JERVI6MCxFWFBJUlk9MTc5OTc3Njg5NjA4NCxLRVlWRVJTSU9OPTE=",);

export type SegmentationToolStateType = {
    patientID: string,
    variableID: number,
    imageId: string,
    height: number,
    width: number,
    pixelData: Uint8Array,
    segmentationIndex: number
}

export type AnnotationToolStateType = {
    patientID: string,
    variableID: number,
    imageId: string,
    tool: string,
    data: Object
}

type RadnotatePropsType = {
    colorMode: Function
}

type RadnotateStateType = {
    patients: Patients,
    variables: Variable[],
    rows: GridRowsProp,

    columns: GridColDef[],
    annotationMode: boolean,
    annotationLevel: AnnotationLevel,
    imageIds: string[],
    instanceNumbers: Map<string, number>,
    rowNames: string[],
    seriesDescriptions: TSMap<string, Array<string>>,
    toolStates: (AnnotationToolStateType | SegmentationToolStateType)[],
    stackIndices: Map<string, number>,
    segmentationsCount: number,
}

class Radnotate extends Component<RadnotatePropsType, RadnotateStateType> {

    constructor(props: RadnotatePropsType) {
        super(props);
        this.state = {
            patients: new Patients(),
            segmentationsCount: 0,
            variables: [],
            annotationMode: false,
        }
    }

    variablesToColumns = (activePatientIndex: number, activeVariableName: string, variables: Variable[], annotationLevel: AnnotationLevel): GridColDef[] => {
        const columns: GridColDef[] = []
        if (annotationLevel === AnnotationLevel.patient) {
            columns.push({
                field: "PatientID",
                filterable: false,
                disableReorder: true,
                sortable: false,
            })
        } else {
            columns.push({
                field: "Study",
                filterable: false,
                disableReorder: true,
                sortable: false,
            })
        }
        variables?.forEach((variable: Variable) => {
            columns.push({
                field: variable.toString(),
                filterable: false,
                disableReorder: true,
                sortable: false,
                cellClassName: (params: GridCellParams) => {
                    return (clsx('cell', {
                        isActive: (params.row.id === activePatientIndex && JSON.parse(params.field).name === activeVariableName),
                    }))
                },
                // @ts-ignore
                renderCell: (params: GridRenderCellParams): ReactNode => {
                    let value = params.value
                    if (value === undefined) {
                        value = ""
                    }
                    const variable: Variable = JSON.parse(params.field)
                    if (variable.type === VariableType.segmentation && value !== "") {
                        value = JSON.parse(value)
                        value.forEach((element: { pixelData: string }) => {
                            element.pixelData = "B64EncodedImage"
                        })
                        value = JSON.stringify(value)
                    }
                    if (value !== "") {
                        value = JSON.parse(value)
                        value.forEach((element: { studyUid?: string, seriesUid?: string, sopUid?: string, data?: Object }) => {
                            delete element.studyUid
                            delete element.seriesUid
                            delete element.sopUid
                            delete element.data
                        })
                        value = JSON.stringify(value)
                    }
                    return (<Tooltip title={value} followCursor={true}>
                            <span className="table-cell-trucate">{value}</span>
                        </Tooltip>
                    )
                },
                // @ts-ignore
                renderHeader: (params: GridColumnHeaderParams): ReactNode => {
                    const value: { name: string } = JSON.parse(params.field)
                    return (
                        value.name
                    )
                },
            })
        })
        return columns
    }

    _defineRowNames = (patients: Patients, annotationLevel: AnnotationLevel): string[] => {
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

    saveAnnotationForm = (patients: Patients, variables: Variable[], annotationLevel: AnnotationLevel, rows: GridRowsProp | undefined): void => {
        let segmentationIndex = 0
        variables.forEach(variable => {
            if (variable.type === VariableType.segmentation) {
                variable.segmentationIndex = segmentationIndex++
            }
        })
        if (annotationLevel === AnnotationLevel.patient) {
            if (rows !== undefined) {
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
        this._init(patients, variables, rows, annotationLevel)
        this.setState({
            variables: variables,
            patients: patients,
            annotationLevel: annotationLevel,
            annotationMode: true,
            segmentationsCount: segmentationIndex,
        })
    }

    // ToDo Refactor this and save annotation form method
    _init = (patients: Patients, variables: Variable[], rows: GridRowsProp | undefined, annotationLevel: AnnotationLevel): void => {
        let activePatient = patients.getPatient(0)
        let activePatientIndex = 0
        let activeVariable = variables[0]
        let activeVariableIndex = 0

        const stackIndices = new Map<string, number>()
        const toolStates: (AnnotationToolStateType | SegmentationToolStateType)[] = []
        let initialRows: GridRowsProp = []

        const rowNames = this._defineRowNames(patients, annotationLevel)
        if (rows === undefined) {
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
                                        let toolState: AnnotationToolStateType | SegmentationToolStateType
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
        const columns = this.variablesToColumns(activePatientIndex, activeVariable.name, variables, annotationLevel);
        const {imageIds, instanceNumbers, seriesDescriptions} = this.updateImageIds(activePatient)
        this.setState({
            rows: initialRows,
            columns: columns,
            toolStates: toolStates,
            stackIndices: stackIndices,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            seriesDescriptions: seriesDescriptions,
        })
    }

    updateImageIds = (activePatient: Patient | undefined):
        { imageIds: string[], instanceNumbers: Map<string, number>, seriesDescriptions: TSMap<string, Array<string>> } => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        if (activePatient === undefined) {
            return {imageIds, instanceNumbers, seriesDescriptions}
        }
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
        return {imageIds, instanceNumbers, seriesDescriptions}
    }

    clearTable = (): void => {
        this.saveAnnotationForm(this.state.patients, this.state.variables, this.state.annotationLevel, undefined)
    }

    restartWorkflow = (): void => {
        this.setState({
            annotationMode: false,
        })
    }

    restartAnnotating = (): void => {
        const activeVariable = this.state.variables[0]
        const activePatient = this.state.patients.getPatient(0)
        const columns = this.variablesToColumns(0, activeVariable.name, this.state.variables, this.state.annotationLevel)
        const {imageIds, instanceNumbers, seriesDescriptions} = this.updateImageIds(activePatient)
        this.setState({
            columns: columns,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            seriesDescriptions: seriesDescriptions
        })
    }

    override render(): ReactElement {
        return (
            <Box>
                {this.state.annotationMode ?
                    <Annotation
                        patients={this.state.patients}
                        variables={this.state.variables}
                        annotationLevel={this.state.annotationLevel}
                        toolStates={this.state.toolStates}
                        stackIndices={this.state.stackIndices}
                        segmentationsCount={this.state.segmentationsCount}
                        variablesToColumns={this.variablesToColumns}
                        updateImageIds={this.updateImageIds}
                        imageIds={this.state.imageIds}
                        instanceNumbers={this.state.instanceNumbers}
                        seriesDescriptions={this.state.seriesDescriptions}
                        columns={this.state.columns}
                        rows={this.state.rows}
                    />
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm}/>
                }
                <Settings clearTable={this.clearTable}
                          colorMode={this.props.colorMode}
                          restartWorkflow={this.restartWorkflow}
                          restartAnnotating={this.restartAnnotating}
                          annotationMode={this.state.annotationMode}/>
            </Box>
        )

    }

}

export default Radnotate;
