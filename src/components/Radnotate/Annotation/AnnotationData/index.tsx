import React, {useRef, useState} from "react";
import {Box, Button, Stack} from "@mui/material";
import {
    DataGridPro, GridColDef, GridRowsProp,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';
import {CSVLink} from "react-csv";
import exportFromJSON from "export-from-json";
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import {VariableType} from "../../Form/variable";

type AnnotationDataProps = {
    columns: GridColDef[],
    rows: GridRowsProp,
    width: number,
    handleCellClick: Function,
    activePatientIndex: number,
    activeVariableIndex: number
}


const AnnotationData = (props: AnnotationDataProps) => {
    const csvLinkRef = useRef<CSVLink & HTMLAnchorElement & { link: HTMLAnchorElement }>(null)
    const apiRef = useGridApiRef();

    const [csvData, setCsvData] = useState([]);

    React.useEffect(() => {
        const data = props.rows.map(row => {
            return {...row}
        })
        data.forEach(row => {
            delete row.id
        })
        setCsvData(data)
        if (typeof apiRef.current !== "undefined" && apiRef.current !== null) {
            try {
                const coordinates = {
                    rowIndex: props.activePatientIndex,
                    colIndex: props.activeVariableIndex + 1
                };
                apiRef.current.scrollToIndexes(coordinates);
                const id = gridVisibleSortedRowIdsSelector(apiRef.current.state)[coordinates.rowIndex];
                const column = visibleGridColumnsSelector(apiRef.current.state)[coordinates.colIndex];
                apiRef.current.setCellFocus(id, column.field);
            } catch (e) {

            }
        }
    }, [apiRef, props]);

    const handleExportButton = () => {
        csvLinkRef?.current?.link.click();
    };

    const handleExportXLSButton = async () => {
        let data = props.rows.map(row => {
            return {...row}
        })
        props.columns.slice(1, props.columns.length).forEach(column => {
            const field = column.field
            const variable = JSON.parse(field)
            data = data.map(row => {
                delete row.id
                if (!(field in row)) {
                    delete row[field]
                    if (variable.type === VariableType.boolean ||
                        variable.type === VariableType.integer ||
                        variable.type === VariableType.length) {
                            const tmp = {}
                            tmp[variable.name] = ""
                            return {...row, ...tmp}
                    } else {
                        return {...row}
                    }
                } else {
                    const newCell = []
                    const cell = JSON.parse(row[field])
                    cell.forEach(annotation => {
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

    const getNow = () => {
        const now = new Date()
        const date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
        const time = now.getHours() + "-" + now.getMinutes() + "-" + now.getSeconds();
        return date + "_" + time
    }

    return (
        <Box sx={{width: String(props.width) + "%", height: "100vh"}}>
            <Stack direction={"column"}>
                <Stack direction={"row"} spacing={2} sx={{marginBottom: 1}}>
                    <Box sx={{width: 140, minWidth: 70}}>
                        <CSVLink ref={csvLinkRef} data={csvData} filename={"radnotate_" + getNow() + ".csv"}
                                 separator={";"} enclosingCharacter={""}>
                        </CSVLink>
                        <Button variant={"outlined"} startIcon={<SaveAltIcon/>}
                                onClick={handleExportButton}>
                            Export CSV
                        </Button>
                    </Box>
                    <Button variant={"outlined"} component={"label"} sx={{width: 140, minWidth: 70}}
                            startIcon={<SaveAltIcon/>} onClick={() => {
                        handleExportXLSButton()
                    }}>
                        Export XLS
                    </Button>
                </Stack>
                <Box sx={{
                    height: "90vh",
                    overflow: "auto",
                    '& .isActive': {
                        backgroundColor: "#e85818"
                    },
                }}>
                    <DataGridPro apiRef={apiRef}
                                 columns={props.columns}
                                 rows={props.rows}
                                 initialState={{pinnedColumns: {left: [props.columns[0].field]}}}
                                 onCellDoubleClick={(params) => props.handleCellClick(params)}
                    />
                </Box>
            </Stack>
        </Box>
    )
}

export default AnnotationData;