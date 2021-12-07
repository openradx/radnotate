import {Component} from "react";
import {Patients} from "../../DicomDropzone/dicomObject";
import Variable from "../AnnotationForm/variable";
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";


type AnnotationDataProps = {
    patients: Patients | null,
    variables: Variable[] | undefined
}

class AnnotationData extends Component<AnnotationDataProps, {}> {

    constructor() {
        super();
    }

    render() {
        return (
            <div>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>

                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        )
    }
}

export default AnnotationData;