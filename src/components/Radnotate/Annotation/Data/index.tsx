import {ReactElement, ReactNode, useEffect, useRef, useState} from "react";
import {Box, Button, Stack, Tooltip} from "@mui/material";
import {
    DataGridPro, GridCellParams, GridColDef, GridColumnHeaderParams, GridRenderCellParams, GridRowModel,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';
import {CSVLink} from "react-csv";
import exportFromJSON from "export-from-json";
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import Variable, {VariableType} from "../../Form/variable";
import {RadnotateState, useRadnotateStore} from "../../index";
import {AnnotationLevel} from "../../Form";
import clsx from "clsx";
import {Patient} from "../../Form/DicomDropzone/dicomObject";
import {AnnotationState, useAnnotationStore} from "../index";

type DataProps = {
    width: number,
}

const Data = (props: DataProps): ReactElement => {
    const patients = useRadnotateStore((state: RadnotateState) => state.patients)
    const activePatient = useRadnotateStore((state: RadnotateState) => state.activePatient)
    const activeVariable = useRadnotateStore((state: RadnotateState) => state.activeVariable)
    const setActivePatient = useRadnotateStore((state: RadnotateState) => state.setActivePatient)
    const setActiveVariable = useRadnotateStore((state: RadnotateState) => state.setActiveVariable)
    const annotationLevel = useRadnotateStore((state: RadnotateState) => state.annotationLevel)
    const variables = useRadnotateStore((state: RadnotateState) => state.variables)
    const rows = useRadnotateStore((state: RadnotateState) => state.rows)
    const lastPatientIndex = useAnnotationStore((state: AnnotationState) => state.previousPatientIndex)
    const setLastPatientIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousPatientIndex)
    const lastVariableIndex = useAnnotationStore((state: AnnotationState) => state.previousVariableIndex)
    const setLastVariableIndex = useAnnotationStore((state: AnnotationState) => state.setPreviousVariableIndex)
    const variablesToColumns = (): GridColDef[] => {
        const columns: GridColDef[] = []
        let activePatientIndex = -1
        if (activePatient !== null) {
            activePatientIndex = activePatient.id
        }
        let activeVariableName: string = ""
        if (activeVariable !== null) {
            activeVariableName = activeVariable.name
        }
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
                // @ts-ignore
                cellClassName: (params: GridCellParams): string => {
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
    const [columns, setColumns] = useState<GridColDef[]>(() => variablesToColumns())
    const [csvData, setCsvData] = useState([]);
    const csvLinkRef = useRef<CSVLink & HTMLAnchorElement & { link: HTMLAnchorElement }>(null)
    const apiRef = useGridApiRef();

    useEffect(() => {
        const data = rows.map((row: GridRowModel) => {
            return {...row}
        })
        data.forEach((row: GridRowModel) => {
            // @ts-ignore
            delete row.id
        })
        setCsvData(data)
        if (typeof apiRef.current !== "undefined" && apiRef.current !== null) {
            try {
                const coordinates = {
                    rowIndex: activePatient.id,
                    colIndex: activeVariable.id + 1
                };
                apiRef.current.scrollToIndexes(coordinates);
                const id = gridVisibleSortedRowIdsSelector(apiRef.current.state)[coordinates.rowIndex];
                const column = visibleGridColumnsSelector(apiRef.current.state)[coordinates.colIndex];
                apiRef.current.setCellFocus(id, column.field);
            } catch (e) {

            }
        }
    }, [apiRef, props]);

    useEffect(() => {
        const columns = variablesToColumns()
        setColumns(columns)
    }, [activeVariable, activePatient])

    const handleCellDoubleClick = (params: GridCellParams): void => {
        if (activePatient === null) {
            setLastVariableIndex
        } else if (lastPatientIndex >= 0 || lastVariableIndex >= 0) {
            return
        } else if (lastPatientIndex === -1 && lastVariableIndex === -1) {
            setLastVariableIndex(activeVariable.id)
            setLastPatientIndex(activePatient.id)
        }
        const newActivePatientIndex = Number(params.id)
        let newActivePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            newActivePatient = patients.getPatient(newActivePatientIndex)
        } else {
            // ToDo Implement annotation on study level
            // activePatient = props.patients.getPatientStudy(activePatientIndex, activeStudyIndex)
        }

        let newActiveVariableIndex: number = -1
        variables.forEach((variable: Variable, index: number) => {
            if (variable.name === JSON.parse(params.field).name)
                newActiveVariableIndex = index
        })
        const newActiveVariable = variables[newActiveVariableIndex]

        // @ts-ignore Because annotationLevel currently always true for patient
        setActivePatient(newActivePatient)
        setActiveVariable(newActiveVariable)
    }

    const handleExportButton = (): void => {
        csvLinkRef?.current?.link.click();
    };

    const handleExportXLSButton = (): void => {
        let data = rows.map((row: GridRowModel) => {
            return {...row}
        })
        columns.slice(1, columns.length).forEach(column => {
            const field = column.field
            const variable: Variable = JSON.parse(field)
            data = data.map((row: GridRowModel) => {
                // @ts-ignore
                delete row.id
                if (!(field in row)) {
                    delete row[field]
                    if (variable.type === VariableType.boolean ||
                        variable.type === VariableType.integer ||
                        variable.type === VariableType.length) {
                            const tmp = {}
                            // @ts-ignore
                            tmp[variable.name] = ""
                            return {...row, ...tmp}
                    } else {
                        return {...row}
                    }
                } else {
                    const newCell: string[] = []
                    const cell = JSON.parse(row[field])
                    cell.forEach((annotation: {value: string, length: string}) => {
                        switch (variable.type) {
                            case VariableType.boolean:
                                newCell.push(annotation.value)
                                break;
                            case VariableType.integer:
                                newCell.push(annotation.value)
                                break;
                            case VariableType.length:
                                newCell.push(annotation.length)
                                break;
                        }
                    })
                    delete row[field]
                    if (newCell.length) {
                        const tmp = {}
                        // @ts-ignore
                        tmp[variable.name] = newCell.toString()
                        return {...row, ...tmp}
                    } else {
                        return {...row}
                    }
                }
            })
        })
        exportFromJSON({data: data, fileName: "radnotate_" + getNow(), extension: "xls", exportType: "xls"})
    }

    const getNow = (): string => {
        const now = new Date()
        const date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
        const time = now.getHours() + "-" + now.getMinutes() + "-" + now.getSeconds();
        return date + "_" + time
    }

    return (
        <Box sx={{width: String(props.width) + "%", height: "100vh"}}>
            <Stack direction={"column"}>
                <Stack direction={"row"} spacing={2} sx={{marginBottom: 1}}>
                    <Box sx={{width: 140, minWidth: 140}}>
                        <CSVLink ref={csvLinkRef} data={csvData} filename={"radnotate_" + getNow() + ".csv"}
                                 separator={";"} enclosingCharacter={""}>
                        </CSVLink>
                        <Button variant={"outlined"} startIcon={<SaveAltIcon/>}
                                onClick={handleExportButton}>
                            Export CSV
                        </Button>
                    </Box>
                    <Button variant={"outlined"} component={"label"} sx={{width: 140, minWidth: 140}}
                            startIcon={<SaveAltIcon/>} onClick={(): void => {
                        handleExportXLSButton()
                    }}>
                        Export XLS
                    </Button>
                </Stack>
                <Box sx={{
                    height: "92vh",
                    overflow: "auto",
                    '& .isActive': {
                        backgroundColor: "#5e1024",
                        color: "#ffffff"
                    },
                }}>
                    <DataGridPro apiRef={apiRef}
                                 columns={columns}
                                 rows={rows}
                                 initialState={{pinnedColumns: {left: [columns[0].field]}}}
                                 onCellDoubleClick={(params): void => handleCellDoubleClick(params)}
                    />
                </Box>
            </Stack>
        </Box>
    )
}

export default Data;