//import Image from "./components/Image";
import DicomDropzone from "./components/DicomDropzone";
import Annotation from "./components/Annotation";
import {Component} from "react";
import {Patients} from "./components/DicomDropzone/dicomObject";
import {CssBaseline, Divider, Stack, ThemeProvider} from "@mui/material";
import {theme} from "./styles";




class App extends Component<any, any> {

    constructor(props: any) {
        super(props);
    }

    render() {
        return(
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                <Annotation/>
            </ThemeProvider>
        )
    }
}

export default App;