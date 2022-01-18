import React from "react";
import {Box, Button, gridClasses, Stack} from "@mui/material";
import {
    DataGridPro, GridColDef, GridRowsProp, GridToolbarContainer, GridToolbarExport,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';
import GestureOutlinedIcon from '@mui/icons-material/GestureOutlined';
import {VariableType} from "../AnnotationForm/variable";
import axios from "axios";

type AnnotationDataProps = {
    columns: GridColDef[],
    rows: GridRowsProp,
    width: number,
    handleCellClick: Function,
    activePatientIndex: number,
    activeVariableIndex: number
}

const AnnotationData = (props: AnnotationDataProps) => {

    const apiRef = useGridApiRef();

    const handleButtonClick = (event: Event) => {
        props.rows.forEach(patient => {
            const keys = Object.keys(patient)
            keys.forEach(jsonString => {
                if (jsonString !== "PatientID" && jsonString !== "id") {
                    const variable = JSON.parse(jsonString)
                    if (variable.type === VariableType.segmentation) {
                        const values = JSON.parse(patient[jsonString])
                        values.forEach(value => {
                            console.log(value)
                            const filename = "/home/manuel/test.png"
                            const image = {
                                imageType: {
                                    dimension: 2,
                                    componentType: 'uint16_t',
                                    pixelType: 1,
                                    components: 1
                                },
                                name: 'Image',
                                origin: [ 0, 0 ],
                                spacing: [ 0.148489, 0.148489 ],
                                direction: { rows: 2, columns: 2, data: [ 1, 0, 0, 1 ] },
                                size: [ 2, 2 ],
                                data: new Uint16Array ([0, 1, 0, 1])
                            }
                            window.test.newobj(image, filename)
                        })
                    }
                }
            })
        })
    }

    const exportAnnotationsToolbar = () => {
        return (
            <GridToolbarContainer className={gridClasses.toolbarContainer}>
                <Stack direction={"row"} spacing={1} sx={{marginBottom: 1}}>
                    <GridToolbarExport sx={{fontSize: 12, minWidth: 80}} variant={"outlined"}
                                       printOptions={{disableToolbarButton: true}}/>
                    <Button sx={{minWidth: 210}}
                            onClick={handleButtonClick}
                            variant="outlined"
                            component="label"
                            startIcon={<GestureOutlinedIcon/>}
                    >
                        Export segmentations
                        {/*<input onChange={handleButtonClick}*/}
                        {/*    directory=""*/}
                        {/*    webkitdirectory=""*/}
                        {/*    type="file"*/}
                        {/*    hidden*/}
                        {/*/>*/}
                    </Button>
                </Stack>
            </GridToolbarContainer>
        );
    }

    React.useEffect(() => {
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

    return (
        <Box sx={{
            maxHeight: "100%",
            width: String(props.width) + "%",
            overflow: "auto",
            '& .cell.isActive': {
                backgroundColor: "#de751a"
            },
        }}>
            <DataGridPro apiRef={apiRef}
                         components={{Toolbar: exportAnnotationsToolbar}}
                         columns={props.columns}
                         rows={props.rows}
                         initialState={{pinnedColumns: {left: [props.columns[0].field]}}}
                         onCellDoubleClick={(params) => props.handleCellClick(params)}
            />
        </Box>
    )
}

export default AnnotationData;