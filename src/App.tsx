//import Image from "./components/Image";
import DicomDropzone from "./components/DicomDropzone";
import Annotation from "./components/Annotation";
import {Component} from "react";
import {Box, CssBaseline, ThemeProvider} from "@mui/material";
import {theme} from "./styles";


class App extends Component<any, any> {

    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <ThemeProvider theme={theme}>
                <Box sx={{marginLeft: "10px", marginTop: "10px", marginRight: "10px"}}>
                    <CssBaseline/>
                    <Annotation/>
                </Box>
            </ThemeProvider>
        )
    }
}

export default App;