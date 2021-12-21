import React, {Component, useState} from "react";
import {Box, gridClasses} from "@mui/material";
import {
    DataGridPro,
    GridCellParams, GridColDef, GridRowsProp, GridToolbarContainer, GridToolbarExport, gridVisibleRowCountSelector,
    gridVisibleSortedRowIdsSelector, useGridApiRef, visibleGridColumnsLengthSelector,
    visibleGridColumnsSelector
} from '@mui/x-data-grid-pro';
import _ from "lodash";


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
                <GridToolbarExport printOptions={{disableToolbarButton: true}}/>
            </GridToolbarContainer>
        );
    }

    React.useEffect(() => {
        if (typeof apiRef.current !== "undefined" && apiRef.current !== null) {
            try {
                const coordinates = {
                    rowIndex: props.activePatientIndex,
                    colIndex: props.activeVariableIndex+1
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
            height: "95vh",
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