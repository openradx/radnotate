//import Image from "./components/Image";
import DicomDropzone from "./components/DicomDropzone";
import Annotation from "./components/Annotation";
import {Component} from "react";
import {Patients} from "./components/DicomDropzone/dicomObject";
import {ThemeProvider} from "@mui/material";
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
                <DicomDropzone savePatients={this.savePatients}/>
                <Annotation patients={this.state.patients}/>
            </ThemeProvider>
        )
    }
}

export default App;