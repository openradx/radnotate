import {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import {Patient, Patients} from "../DicomDropzone/dicomObject";
import Image from "../Image"
import {
    GridCellParams,
    GridColDef,
    GridRowsProp,
    GridToolbarContainer,
    GridToolbarExport
} from "@mui/x-data-grid";
import clsx from "clsx";
import {Box, gridClasses, Slider, Stack, Tooltip} from "@mui/material";
import {TSMap} from "typescript-map"
import AnnotationData from "./AnnotationData";
import {GridRenderCellParams} from "@mui/x-data-grid-pro";

type AnnotationStateType = {
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
    annotationsCount: number,
    columns: GridColDef[],
    rowNames: String[],
    rows: GridRowsProp,
    jumpBackToVariableIndex: number,
    jumpBackToPatientIndex: number,
    width: number,
}

class Annotation extends Component<any, AnnotationStateType> {

    constructor(props: any) {
        super(props);
        this.state = {
            annotationMode: false,
            activeVariableIndex: 0,
            activePatientIndex: 0,
            activeStudyIndex: 0,
            jumpBackToVariableIndex: -1,
            jumpBackToPatientIndex: -1,
            width: 30
        }
    }

    _variablesToColumns = (activePatientIndex: number, activeVariableName: string, variables: Variable[], annotationLevel: AnnotationLevel) => {
        const columns: GridColDef[] = []
        if (annotationLevel === AnnotationLevel.patient) {
            columns.push({field: "PatientID", headerName: "PatientID", width: 150})
        } else {
            columns.push({field: "Study", headerName: "Study", width: 150})
        }
        variables?.forEach((variable: Variable) => {
            columns.push({
                field: variable.name,
                headerName: variable.name,
                width: 150,
                cellClassName: (params: GridCellParams) => {
                    return (clsx('cell', {
                        isActive: (params.row.id === activePatientIndex && params.field === activeVariableName),
                    }))
                },
                renderCell: (params: GridRenderCellParams) => {
                    let value = params.value
                    if (value === undefined) {
                        value = ""
                    }
                    return (<Tooltip title={value} followCursor={true}>
                            <span className="table-cell-trucate">{params.value}</span>
                        </Tooltip>
                    )
                }
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

    saveAnnotationForm = (patients: Patients, variables: Variable[], annotationLevel: AnnotationLevel) => {
        let activePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            activePatient = patients.getPatient(this.state.activePatientIndex)
        } else {
            activePatient = patients.getPatientStudy(this.state.activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this._updateImageIds(activePatient)
        const rowNames = this._defineRowNames(patients, annotationLevel)

        variables = variables.slice(0, variables.length - 1)
        const activeVariable = variables.slice(0, 1).pop()
        const columns = this._variablesToColumns(0, activeVariable.name, variables, annotationLevel);
        let initialRows = []
        rowNames.forEach((rowName, index) => {
            let row = {}
            row[columns[0].field] = rowName
            row.id = index
            initialRows.push(row)
        })
        this.setState({
            patients: patients,
            activePatient: activePatient,
            variables: variables,
            patients: patients,
            annotationLevel: annotationLevel,
            annotationMode: true,
            activeVariable: activeVariable,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            columns: columns,
            rows: initialRows
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
        if (this.state.jumpBackToPatientIndex >= 0) {
            this._nextPatient()
        } else if (activeVariableIndex === this.state.variables.length) {
            activeVariableIndex = 0
            this._nextPatient()
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

    _nextPatient = () => {
        let activePatientIndex = this.state.activePatientIndex
        let jumpBackToPatientIndex = this.state.jumpBackToPatientIndex
        if (jumpBackToPatientIndex >= 0) {
            activePatientIndex = jumpBackToPatientIndex
            jumpBackToPatientIndex = -1
        } else {
            activePatientIndex++
        }
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.state.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.state.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this._updateImageIds(activePatient)
        this.setState({
            activePatient: activePatient,
            activePatientIndex: activePatientIndex,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            jumpBackToPatientIndex: jumpBackToPatientIndex,
        })
    }

    _updateImageIds = (activePatient: Patient | undefined) => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
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
                imageIds = [...imageIds, ...imageIdsTemp]
            })
        })
        return {imageIds, instanceNumbers}
    }

    _handleCellClick = (params: GridCellParams) => {
        const activePatientIndex = Number(params.id)
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.state.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.state.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }

        let activeVariableIndex: number
        this.state.variables.forEach((variable, index) => {
            if (variable.name === params.field)
                activeVariableIndex = index
        })
        const activeVariable = this.state.variables[activeVariableIndex]
        const columns = this._variablesToColumns(activePatientIndex, activeVariable.name, this.state.variables, this.state.annotationLevel);
        const {imageIds, instanceNumbers} = this._updateImageIds(activePatient)
        this.setState({
            activeVariableIndex: activeVariableIndex,
            activeVariable: activeVariable,
            activePatientIndex: activePatientIndex,
            activePatient: activePatient,
            columns: columns,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
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
                row[this.state.activeVariable.name] = json
            }
        })
        return rows
    }

    _setWidth = (width: number) => {
        this.setState({width: width})
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
                        <Box sx={{height: "95vh"}}>
                            <Slider
                                track={false}
                                orientation="vertical"
                                value={this.state.width}
                                onChange={(_, value) => this._setWidth(value as number)}
                            />
                        </Box>
                        <Box sx={{width: String(100 - this.state.width) + "%"}}>
                            <Image activePatient={this.state.activePatient}
                                   activeVariable={this.state.activeVariable}
                                   nextVariable={this.nextVariable}
                                   imageIds={this.state.imageIds}
                                   instanceNumbers={this.state.instanceNumbers}
                                   width={String(100 - this.state.width) + "%"}/>
                        </Box>
                    </Stack>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm}/>
                }
            </div>
        )

    }

}

export default Annotation;
