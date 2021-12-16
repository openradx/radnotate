//import Image from "./components/Image";
import DicomDropzone from "./components/DicomDropzone";
import Annotation from "./components/Annotation";
import {Component} from "react";
import {Patients} from "./components/DicomDropzone/dicomObject";
import {Divider, Stack, ThemeProvider} from "@mui/material";
import {theme} from "./styles";


type AppState = {
    patients: Patients | null
}

class App extends Component<any, AppState> {

    constructor(props: AppState) {
        super(props);
        this.state = {
            patients: null
        }
    }

    savePatients = (patients: Patients) => {
        this.setState({patients: patients})
    }

    render() {
        return(
            <ThemeProvider theme={theme}>
                <Stack direction="row" divider={<Divider orientation="vertical" flexItem/>} spacing={2}>
                    <Annotation patients={this.state.patients}/>
                </Stack>
            </ThemeProvider>
        )
    }
}

export default App;