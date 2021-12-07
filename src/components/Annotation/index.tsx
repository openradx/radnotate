import {Component} from "react";
import AnnotationForm from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import AnnotationData from "./AnnotationData";
import {Patients} from "../DicomDropzone/dicomObject";

type AnnotationStateType = {
    variables: Variable[] | undefined
    annotationMode: boolean
}

type AnnotationStateProps = {
    patients: Patients | null
}

class Annotation extends Component<AnnotationStateProps, AnnotationStateType> {

    constructor() {
        super();
        this.state = {
            annotationMode: false
        }
    }

    saveAnnotationForm = (variables: Variable[]) => {
        this.setState({variables: variables.slice(0, variables.length - 1), annotationMode: true})
    }

    render() {
        return (
            <div>
                {this.state.annotationMode ?
                    <AnnotationData patients={this.props.patients} variables={this.state.variables}/>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm}/>
                }
            </div>)

    }
}

export default Annotation;
