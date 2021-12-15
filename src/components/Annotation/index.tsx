import {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import {Patient, Patients} from "../DicomDropzone/dicomObject";
import Image from "../Image"
import {DataGrid, GridCellParams, GridColDef, GridRowsProp} from "@mui/x-data-grid";
import clsx from "clsx";
import {Box} from "@mui/material";
import {TSMap} from "typescript-map"

type AnnotationStateType = {
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
    rows: GridRowsProp
}

type AnnotationStateProps = {
    patients: Patients
}

class Annotation extends Component<AnnotationStateProps, AnnotationStateType> {

    constructor(props: AnnotationStateProps) {
        super(props);
        this.state = {
            annotationMode: false,
            annotationLevel: AnnotationLevel.patient,
            activeVariableIndex: 0,
            activePatientIndex: 0,
            activeStudyIndex: 0,
            annotationsCount: 0,
        }
    }

    _variablesToColumns = (activePatientIndex: number, activeVariableName: string, variables: Variable[]) => {
        const columns: GridColDef[] = []
        if (this.state.annotationLevel === AnnotationLevel.patient) {
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
                }
            })
        })
        return columns
    }

    _defineRowNames = () => {
        const patients = this.props.patients
        const annotationLevel = this.state.annotationLevel
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

    saveAnnotationForm = (variables: Variable[], annotationLevel: AnnotationLevel) => {
        let activePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(this.state.activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(this.state.activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this._updateImageIds(activePatient)
        const rowNames = this._defineRowNames()

        variables = variables.slice(0, variables.length - 1)
        const activeVariable = variables.slice(0, 1).pop()
        const columns = this._variablesToColumns(0, activeVariable.name, variables);

        let initialRows = []
        rowNames.forEach((rowName, index) => {
            let row = {}
            row[columns[0].field] = rowName
            row.id = index
            initialRows.push(row)
        })
        this.setState({
            activePatient: activePatient,
            variables: variables,
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
        activeVariableIndex++
        if (activeVariableIndex === this.state.variables.length) {
            activeVariableIndex = 0
            this._nextPatient()
        }
        const activeVariable = this.state.variables[activeVariableIndex]
        const columns = this._variablesToColumns(this.state.activePatientIndex, activeVariable.name, this.state.variables)
        this.setState({
            activeVariableIndex: activeVariableIndex,
            activeVariable: activeVariable,
            columns: columns,
            rows: rows
        })
    }

    _nextPatient = () => {
        let activePatientIndex = this.state.activePatientIndex
        activePatientIndex++
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this._updateImageIds(activePatient)
        this.setState({
            activePatient: activePatient,
            activePatientIndex: activePatientIndex,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            annotationsCount: 0
        })
    }

    _updateImageIds = (activePatient: Patient) => {
        let imageIds: string[] = []
        const instanceNumbers: Map<string, number> = new Map<string, number>()
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

    updateAnnotationsCount = (annotationsCount: number) => {
        this.setState({annotationsCount: annotationsCount})
    }

    _handleCellClick = (params: GridCellParams) => {
        const activePatientIndex = Number(params.id)
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }

        let activeVariableIndex: number
        this.state.variables.forEach((variable, index) => {
            if (variable.name === params.field)
                activeVariableIndex = index
        })
        const activeVariable = this.state.variables[activeVariableIndex]
        const columns = this._variablesToColumns(activePatientIndex, activeVariable.name, this.state.variables);
        this.setState({
            activeVariableIndex: activeVariableIndex,
            activeVariable: activeVariable,
            activePatientIndex: activePatientIndex,
            activePatient: activePatient,
            columns: columns
        })
    }

    _updateRows = (currentValues: TSMap<string, number>[]) => {
        let rows = this.state.rows
        rows.forEach(row => {
            if (row.id === this.state.activePatientIndex) {
                let json = "["
                currentValues.forEach(value => {
                    json += JSON.stringify(value.toJSON())
                    json += ","
                })
                json = json.slice(0, json.length - 1) + "]"
                row[this.state.activeVariable.name] = json
            }
        })
        return rows
    }

    render() {
        let patientsAreLoaded = true
        if (this.props.patients === null) {
            patientsAreLoaded = false
        }
        return (
            <div>
                {this.state.annotationMode ?
                    <div>
                        <Box style={{height: 400}}
                             sx={{
                                 height: 300,
                                 width: '100%',
                                 '& .cell.isActive': {
                                     backgroundColor: 'green',
                                     color: '#1a3e72',
                                     fontWeight: '600',
                                 },
                             }}>
                            <DataGrid columns={this.state.columns} rows={this.state.rows}
                                      onCellDoubleClick={(params) => this._handleCellClick(params)
                                      }/>
                        </Box>
                        <Image activePatient={this.state.activePatient}
                               activeVariable={this.state.activeVariable}
                               nextVariable={this.nextVariable}
                               imageIds={this.state.imageIds}
                               instanceNumbers={this.state.instanceNumbers}
                               annotationsCount={this.state.annotationsCount}
                               updateAnnotationsCount={this.updateAnnotationsCount}/>
                    </div>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm} patientsAreLoaded={patientsAreLoaded}/>
                }
            </div>
        )

    }

}

export default Annotation;
