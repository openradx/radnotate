import {Component} from "react";
import {Patient, Patients} from "../../DicomDropzone/dicomObject";
import Variable from "../AnnotationForm/variable";
import {DataGrid, GridCellParams, GridColDef, GridRowsProp} from "@mui/x-data-grid";
import {AnnotationLevel} from "../AnnotationForm";
import {Box} from "@mui/material";
import clsx from 'clsx';


type AnnotationDataPropsType = {
    patients: Patients | null,
    variables: Variable[] | undefined,
    annotationLevel: AnnotationLevel,
    activePatient: Patient,
    activeVariable: Variable
}

type AnnotationDataStateType = {
    columns: GridColDef[],
    rowNames: String[],
    rows: GridRowsProp
}

class AnnotationData extends Component<AnnotationDataPropsType, AnnotationDataStateType> {

    constructor(props: AnnotationDataPropsType) {
        super(props)
        const columns = this.defineColumns()
        const rowNames = this.defineRows()
        const rows = this.setRows(rowNames, columns)
        this.state = {
            columns: columns,
            rowNames: rowNames,
            rows: rows
        }
    }

    defineColumns = () => {
        const variables = this.props.variables
        const columns: GridColDef[] = []
        if (this.props.annotationLevel === AnnotationLevel.patient) {
            columns.push({field: "PatientID", headerName: "PatientID", width: 150})
        } else {
            columns.push({field: "Study", headerName: "Study", width: 150})
        }
        variables?.forEach((variable) => {
            columns.push({
                field: variable.name,
                headerName: variable.name,
                width: 150,
                cellClassName: (params: GridCellParams) => {
                    return (clsx('cell', {
                        isActive: (params.row.PatientID === this.props.activePatient.patientID && params.field === this.props.activeVariable.name),
                    }))
                }
            })
        })
        return columns
    }

    defineRows = () => {
        const patients = this.props.patients
        const annotationLevel = this.props.annotationLevel
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

    setRows = (rowNames, columns) => {
        const rows = []
        let idCol = "Study"
        if (this.props.annotationLevel === AnnotationLevel.patient) {
            idCol = "PatientID"
        }
        rowNames.forEach((rowName, index) => {
            const row = {}
            columns.forEach((column: GridColDef) => {
                if (column.field === idCol) {
                    row[column.field] = rowName
                } else {
                    row[column.field] = ""
                }
            })
            row["id"] = index
            rows.push(row)
        })
        return rows
    }

    render() {
        return (
            <Box style={{height: 400}}
                 sx={{
                     height: 300,
                     width: '100%',
                     '& .cell.isActive': {
                         backgroundColor: 'green',
                         color: '#1a3e72',
                         fontWeight: '600',
                     },
                 }}
            >
                <DataGrid columns={this.defineColumns()} rows={this.state.rows}/>
            </Box>
        )
    }
}

export default AnnotationData;