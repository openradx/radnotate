import {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable, {ToolType, VariableType} from "./AnnotationForm/variable";
import {Patient, Patients} from "./AnnotationForm/DicomDropzone/dicomObject";
import Image from "./Image"
import {GridCellParams, GridColDef, GridRowsProp,} from "@mui/x-data-grid";
import clsx from "clsx";
import {Box, Slider, Stack, Tooltip} from "@mui/material";
import {TSMap} from "typescript-map"
import AnnotationData from "./AnnotationData";
import {GridColumnHeaderParams, GridRenderCellParams, LicenseInfo} from "@mui/x-data-grid-pro";
import {Settings} from "./Settings";

LicenseInfo.setLicenseKey("07a54c751acde4192070a1600dac24bdT1JERVI6MCxFWFBJUlk9MTc5OTc3Njg5NjA4NCxLRVlWRVJTSU9OPTE=",);

type RadnnotatePropsType = {
    colorMode: Function
}

type RadnnotateStateType = {
    patients: Patients,
    variables: Variable[],
    annotationMode: boolean,
    annotationLevel: AnnotationLevel,
    activePatient: Patient,
    activeVariable: Variable,
    activeVariableIndex: number,
    activePatientIndex: number,
    activeStudyIndex: number,
    imageIds: string[],
    instanceNumbers: Map<string, number>,
    columns: GridColDef[],
    rowNames: String[],
    rows: GridRowsProp,
    jumpBackToVariableIndex: number,
    jumpBackToPatientIndex: number,
    width: number,
    seriesDescriptions: TSMap<string, Array<string>>,
    toolStates: [],
    stackIndices: Map<string, number>,
    segmentationsCount: number,
}

class Radnnotate extends Component<RadnnotatePropsType, RadnnotateStateType> {

    constructor(props: RadnnotatePropsType) {
        super(props);
        this.state = {
            annotationMode: false,
            activeVariableIndex: 0,
            activePatientIndex: 0,
            activeStudyIndex: 0,
            jumpBackToVariableIndex: -1,
            jumpBackToPatientIndex: -1,
            width: 30,
        }
    }

    componentDidMount = () => {
        addEventListener("beforeunload", (event) => {
            event.preventDefault()
        })
    };


    _variablesToColumns = (activePatientIndex: number, activeVariableName: string, variables: Variable[], annotationLevel: AnnotationLevel) => {
        const columns: GridColDef[] = []
        if (annotationLevel === AnnotationLevel.patient) {
            columns.push({
                field: "PatientID",
                filterable: false,
                disableReorder: true,
            })
        } else {
            columns.push({
                field: "Study",
                filterable: false,
                disableReorder: true,
            })
        }
        variables?.forEach((variable: Variable) => {
            columns.push({
                field: variable.toString(),
                filterable: false,
                disableReorder: true,
                cellClassName: (params: GridCellParams) => {
                    return (clsx('cell', {
                        isActive: (params.row.id === activePatientIndex && JSON.parse(params.field).name === activeVariableName),
                    }))
                },
                renderCell: (params: GridRenderCellParams) => {
                    let value = params.value
                    if (value === undefined) {
                        value = ""
                    }
                    const variable: Object = JSON.parse(params.field)
                    if (variable.type === VariableType.segmentation && value !== "") {
                        value = JSON.parse(value)
                        value.forEach(element => {
                            element.pixelData = "B64EncodedImage"
                        })
                        value = JSON.stringify(value)
                    }
                    if (value !== "") {
                        value = JSON.parse(value)
                        value.forEach(element => {
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
                renderHeader: (params: GridColumnHeaderParams) => {
                    const value: Object = JSON.parse(params.field)
                    return (
                        value.name
                    )
                },
            })
        })
        return columns
    }

    _defineRowNames = (patients: Patients, annotationLevel: AnnotationLevel) => {
        const rowNames: String[] = []
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

    saveAnnotationForm = (patients: Patients, variables: Variable[], annotationLevel: AnnotationLevel, rows) => {
        let segmentationIndex = 0
        variables.forEach(variable => {
            if (variable.type === VariableType.segmentation) {
                variable.segmentationIndex = segmentationIndex++
            }
        })
        let activePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            if (rows !== undefined) {
                const imagePatientIDs = []
                const annotationPatientIDs = []
                patients.patients.forEach(patient => {
                    imagePatientIDs.push(patient.patientID)
                })
                rows.forEach(row => {
                    const patientID = row.PatientID
                    annotationPatientIDs.push(patientID)
                })
                const intersectionPatientIDs = imagePatientIDs.filter(patientID => annotationPatientIDs.includes(patientID));
                imagePatientIDs.forEach(patientID => {
                    if (!intersectionPatientIDs.includes(patientID)) {
                        patients.deletePatient(patientID)
                    }
                })
                let deleteIndices: number[] = []
                annotationPatientIDs.forEach(patientID => {
                    if (!intersectionPatientIDs.includes(patientID)) {
                        rows.forEach((row, index) => {
                            if (row.PatientID === patientID) {
                                deleteIndices.push(index)
                            }
                        })
                    }
                })
                let counter = 0
                deleteIndices.forEach(deleteIndex => {
                    rows.splice(deleteIndex - counter++, 1)
                })
                rows.forEach((row, index) => {
                    row.id = index
                })
            }
            activePatient = patients.getPatient(0)
        } else {
            activePatient = patients.getPatientStudy(0, 0)
        }
        const {imageIds, instanceNumbers, seriesDescriptions} = this._updateImageIds(activePatient)
        const rowNames = this._defineRowNames(patients, annotationLevel)

        const activeVariable = variables.slice(0, 1).pop()
        const columns = this._variablesToColumns(0, activeVariable.name, variables, annotationLevel);

        let initialRows = []
        let existingToolStates = []
        if (rows === undefined) {
            rowNames.forEach((rowName, index) => {
                let row = {}
                row[columns[0].field] = rowName
                row.id = index
                initialRows.push(row)
            })
        } else {
            initialRows = rows
            existingToolStates = this._setInitialToolState(patients, rows)
        }
        this.setState({
            activePatientIndex: 0,
            activeVariableIndex: 0,
            activeStudyIndex: 0,
            activePatient: activePatient,
            activeVariable: activeVariable,
            variables: variables,
            patients: patients,
            annotationLevel: annotationLevel,
            annotationMode: true,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            columns: columns,
            rows: initialRows,
            jumpBackToPatientIndex: -1,
            jumpBackToVariableIndex: -1,
            seriesDescriptions: seriesDescriptions,
            toolStates: existingToolStates,
            segmentationsCount: segmentationIndex,
        })
    }

    nextVariable = (currentValues: TSMap<string, number>[]) => {
        const rows = this._updateRows(currentValues)
        let activeVariableIndex = this.state.activeVariableIndex
        let jumpBackToVariableIndex = this.state.jumpBackToVariableIndex
        if (jumpBackToVariableIndex >= 0) {
            activeVariableIndex = jumpBackToVariableIndex
            jumpBackToVariableIndex = -1
        } else {
            activeVariableIndex++
        }
        let isLastPatient: boolean = false
        if (this.state.jumpBackToPatientIndex >= 0) {
            isLastPatient = this._nextPatient()
        } else if (activeVariableIndex === this.state.variables.length) {
            activeVariableIndex = 0
            isLastPatient = this._nextPatient()
        }
        if (isLastPatient) {
            this.setState({
                activeVariableIndex: -1,
                jumpBackToVariableIndex: -1
            })
        }
        const activeVariable = this.state.variables[activeVariableIndex]
        const columns = this._variablesToColumns(this.state.activePatientIndex, activeVariable.name, this.state.variables, this.state.annotationLevel)
        this.setState({
            activeVariableIndex: activeVariableIndex,
            activeVariable: activeVariable,
            columns: columns,
            rows: rows,
            jumpBackToVariableIndex: jumpBackToVariableIndex
        })
    }

    _setInitialToolState = (patients: Patients, rows: Object) => {
        const annotations = []
        let sopInstanceUIDs = []
        rows.forEach(row => {
            const fields = Object.keys(row)
            fields.forEach(field => {
                if (field !== "PatientID" && field !== "id") {
                    // ToDo Fix parsing empty string
                    const currentValues = JSON.parse(row[field])
                    const type = JSON.parse(field).type
                    currentValues.forEach(currentValue => {
                        const sopInstanceUID = currentValue.sopUid
                        let annotation
                        if (type === VariableType.segmentation) {
                            const pixelData = new Uint8Array(atob(currentValue.pixelData).split("").map(function (c) {
                                return c.charCodeAt(0);
                            }));
                            annotations.push([sopInstanceUID, currentValue.height, currentValue.width, pixelData, currentValue.segmentationIndex])
                        } else if (type !== VariableType.boolean && type !== VariableType.integer) {
                            annotation = currentValue.data
                            annotations.push([sopInstanceUID, ToolType.get(type), annotation])
                        }
                        sopInstanceUIDs.push(sopInstanceUID)
                    })
                }
            })
        })
        const toolStates = []
        sopInstanceUIDs = [...new Set(sopInstanceUIDs)]
        const stackIndices = new Map<string, number>()
        let stackCounter = 0
        patients.patients.forEach(patient => {
            patient.studies.forEach(study => {
                study.series.forEach(series => {
                    series.images.forEach(image => {
                        stackIndices.set(image.imageID, stackCounter++)
                        if (sopInstanceUIDs.includes(image.sopInstanceUID)) {
                            annotations.forEach(annotation => {
                                const annotationSopUid = annotation[0]
                                if (annotationSopUid === image.sopInstanceUID) {
                                    toolStates.push([image.imageID, ...annotation.slice(1, annotation.length)])
                                }
                            })
                        }
                    })
                })
            })
        })
        this.setState({stackIndices: stackIndices})
        return toolStates
    }

    _nextPatient = () => {
        let activePatientIndex = this.state.activePatientIndex
        let jumpBackToPatientIndex = this.state.jumpBackToPatientIndex
        if (jumpBackToPatientIndex >= 0) {
            activePatientIndex = jumpBackToPatientIndex
            jumpBackToPatientIndex = -1
        } else {
            activePatientIndex++
        }
        if (activePatientIndex === this.state.patients.patients.length) {
            this.setState({
                activePatientIndex: -1,
                imageIds: [],
                jumpBackToPatientIndex: -1
            })
            return true
        } else {
            let activePatient: Patient
            if (this.state.annotationLevel === AnnotationLevel.patient) {
                activePatient = this.state.patients.getPatient(activePatientIndex)
            } else {
                activePatient = this.state.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
            }
            const {imageIds, instanceNumbers, seriesDescriptions} = this._updateImageIds(activePatient)
            this.setState({
                activePatient: activePatient,
                activePatientIndex: activePatientIndex,
                imageIds: imageIds,
                instanceNumbers: instanceNumbers,
                jumpBackToPatientIndex: jumpBackToPatientIndex,
                seriesDescriptions: seriesDescriptions
            })
            return false
        }
    }

    _updateImageIds = (activePatient: Patient | undefined) => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
        const seriesDescriptions: TSMap<string, Array<string>> = new TSMap<string, Array<string>>()
        if (activePatient === undefined) {
            return {imageIds, instanceNumbers}
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

    _handleCellClick = (params: GridCellParams) => {
        if (this.state.jumpBackToPatientIndex >= 0 || this.state.jumpBackToVariableIndex >= 0) {
            return
        }
        const activePatientIndex = Number(params.id)
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.state.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.state.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }

        let activeVariableIndex: number
        this.state.variables.forEach((variable, index) => {
            if (variable.name === JSON.parse(params.field).name)
                activeVariableIndex = index
        })
        const activeVariable = this.state.variables[activeVariableIndex]
        const columns = this._variablesToColumns(activePatientIndex, activeVariable.name, this.state.variables, this.state.annotationLevel);
        const {imageIds, instanceNumbers, seriesDescriptions} = this._updateImageIds(activePatient)
        this.setState({
            activeVariableIndex: activeVariableIndex,
            activeVariable: activeVariable,
            activePatientIndex: activePatientIndex,
            activePatient: activePatient,
            columns: columns,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            seriesDescriptions: seriesDescriptions
        })
        if (this.state.jumpBackToVariableIndex === -1 && this.state.jumpBackToPatientIndex === -1) {
            this.setState({
                jumpBackToVariableIndex: this.state.activeVariableIndex,
                jumpBackToPatientIndex: this.state.activePatientIndex,
            })
        }

    }

    _updateRows = (currentValues: TSMap<string, number>[]) => {
        let rows = this.state.rows
        rows.forEach(row => {
            if (row.id === this.state.activePatientIndex) {
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
                if (this.state.activeVariable.type === VariableType.boolean || this.state.activeVariable.type === VariableType.integer) {
                    if (currentValues[0] !== undefined) {
                        if (currentValues[0].get("value") === "Escape") {
                            row[this.state.activeVariable.toString()] = "[]"
                        } else {
                            row[this.state.activeVariable.toString()] = json
                        }
                    } else if (row[this.state.activeVariable.toString()] === undefined) {
                        row[this.state.activeVariable.toString()] = json
                    }
                } else {
                    row[this.state.activeVariable.toString()] = json
                }
            }
        })
        return rows
    }

    _setWidth = (width: number) => {
        this.setState({width: width})
    }

    clearTable = () => {
        this.saveAnnotationForm(this.state.patients, this.state.variables, this.state.annotationLevel)
    }

    restartWorkflow = () => {
        this.setState({
            annotationMode: false,
        })
    }

    restartAnnotating = () => {
        const activeVariable = this.state.variables[0]
        const columns = this._variablesToColumns(0, activeVariable.name, this.state.variables, this.state.annotationLevel)
        this.setState({
            activePatientIndex: 0,
            activePatient: this.state.patients.getPatient(0),
            activeVariableIndex: 0,
            activeVariable: activeVariable,
            columns: columns,
            jumpBackToVariableIndex: -1,
            jumpBackToPatientIndex: -1
        })
    }

    render() {
        return (
            <div>
                {this.state.annotationMode ?
                    <Stack direction={"row"}
                           justifyContent="space-evently"
                           spacing={0}
                           alignItems="stretch">
                        <AnnotationData width={this.state.width}
                                        rows={this.state.rows}
                                        columns={this.state.columns}
                                        handleCellClick={this._handleCellClick}
                                        activePatientIndex={this.state.activePatientIndex}
                                        activeVariableIndex={this.state.activeVariableIndex}/>
                        <Box sx={{height: "97vh"}}>
                            <Tooltip title={"Set width of windows"} followCursor={true}>
                                <Slider
                                    track={false}
                                    orientation="vertical"
                                    value={this.state.width}
                                    onChange={(_, value) => this._setWidth(value as number)}
                                />
                            </Tooltip>
                        </Box>
                        <Box sx={{width: String(100 - this.state.width) + "%"}}>
                            <Image activePatient={this.state.activePatient}
                                   activeVariable={this.state.activeVariable}
                                   nextVariable={this.nextVariable}
                                   imageIds={this.state.imageIds}
                                   instanceNumbers={this.state.instanceNumbers}
                                   seriesDescriptions={this.state.seriesDescriptions}
                                   toolStates={this.state.toolStates}
                                   stackIndices={this.state.stackIndices}
                                   segmentationsCount={this.state.segmentationsCount}/>
                        </Box>
                    </Stack>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm}/>
                }
                <Settings clearTable={this.clearTable}
                          colorMode={this.props.colorMode}
                          restartWorkflow={this.restartWorkflow}
                          restartAnnotating={this.restartAnnotating}
                          annotationMode={this.state.annotationMode}/>
            </div>
        )

    }

}

export default Radnnotate;
