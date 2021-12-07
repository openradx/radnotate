//import Image from "./components/Image";
import DicomDropzone from "./components/DicomDropzone";
import Annotation from "./components/Annotation";
import {Component} from "react";
import {Patients} from "./components/DicomDropzone/dicomObject";


type AppState = {
    patients: Patients | null
}

class App extends Component<any, AppState> {

    constructor() {
        super();
        this.state = {
            patients: null
        }
    }

    savePatients = (patients: Patients) => {
        this.setState({patients: patients})
    }

    render() {
        return(
            <div>
                <DicomDropzone savePatients={this.savePatients}/>
                <Annotation patients={this.state.patients}/>
            </div>
        )
    }
}

export default App;