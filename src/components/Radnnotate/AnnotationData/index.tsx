import React from "react";
import {Box, gridClasses, Tooltip} from "@mui/material";
import {
    DataGridPro, GridColDef, GridRowsProp, GridToolbarContainer, GridToolbarExport,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';

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

    const exportAnnotationsToolbar = () => {
        return (
            <GridToolbarContainer className={gridClasses.toolbarContainer}>
                <Tooltip title={"Export only selected files"}>
                    <GridToolbarExport printOptions={{disableToolbarButton: true}}/>
                </Tooltip>
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