import React, {useRef, useState} from "react";
import {Box, Button, Stack} from "@mui/material";
import {
    DataGridPro, GridColDef, GridRowsProp,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';
import {CSVLink} from "react-csv";
import SaveAltIcon from '@mui/icons-material/SaveAlt';

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

    const getNow = () => {
        const now = new Date()
        const date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
        const time = now.getHours() + "-" + now.getMinutes() + "-" + now.getSeconds();
        return date + "_" + time
    }

    return (
        <Box sx={{width: String(props.width) + "%", height: "100vh"}}>
            <Stack direction={"column"}>
                <Stack sx={{marginBottom: 1}}>
                    <Box sx={{width: 80}}>
                        <CSVLink ref={csvLinkRef} data={csvData} filename={"radnotate_" + getNow() + ".csv"}
                                 separator={";"} enclosingCharacter={""}>
                        </CSVLink>
                        <Button color="primary" variant="outlined" startIcon={<SaveAltIcon/>}
                                onClick={handleExportButton}>
                            Export
                        </Button>
                    </Box>
                </Stack>
                <Box sx={{
                    height: "92vh",
                    overflow: "auto",
                    '& .isActive': {
                        backgroundColor: "#de751a"
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