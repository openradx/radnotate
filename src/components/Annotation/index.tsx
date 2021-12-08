import {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import AnnotationData from "./AnnotationData";
import {Patients} from "../DicomDropzone/dicomObject";

type AnnotationStateType = {
    variables: Variable[] | undefined
    annotationMode: boolean
    annotationLevel: AnnotationLevel
}

type AnnotationStateProps = {
    patients: Patients | null
}

class Annotation extends Component<AnnotationStateProps, AnnotationStateType> {

    constructor() {
        super();
        this.state = {
            annotationMode: false,
            annotationLevel: AnnotationLevel.patient
        }
    }

    saveAnnotationForm = (variables: Variable[], annotationLevel: AnnotationLevel) => {
        this.setState({variables: variables.slice(0, variables.length - 1), annotationLevel: annotationLevel,annotationMode: true})
    }

    render() {
        return (
            <div>
                {this.state.annotationMode ?
                    <AnnotationData patients={this.props.patients} variables={this.state.variables} annotationLevel={this.state.annotationLevel}/>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm}/>
                }
            </div>)

    }
}

export default Annotation;
