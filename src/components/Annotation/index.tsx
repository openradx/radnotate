import React, {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import AnnotationData from "./AnnotationData";
import {Patient, Patients} from "../DicomDropzone/dicomObject";
import Image from "../Image"

type AnnotationStateType = {
    variables: Variable[] | undefined
    annotationMode: boolean
    annotationLevel: AnnotationLevel
    activePatient: Patient
}

type AnnotationStateProps = {
    patients: Patients
}

class Annotation extends Component<AnnotationStateProps, AnnotationStateType> {

    constructor(props: AnnotationStateProps) {
        super(props);
        this.state = {
            annotationMode: false,
            annotationLevel: AnnotationLevel.patient
        }
    }

    saveAnnotationForm = (variables: Variable[], annotationLevel: AnnotationLevel) => {
        const index = 0
        let activePatient:Patient
        if (annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(index)
        } else {
            //ToDO Implement removement of studies from patient
            activePatient = this.props.patients.getPatient(index)
        }
        this.setState({activePatient: activePatient, variables: variables.slice(0, variables.length - 1), annotationLevel: annotationLevel, annotationMode: true})
    }

    render() {
        let patientsAreLoaded = true
        if (this.props.patients === null) {
            patientsAreLoaded = false
        }
        return (
            <div>
                {this.state.annotationMode ?
                    <div>
                        <AnnotationData patients={this.props.patients} variables={this.state.variables} annotationLevel={this.state.annotationLevel}/>
                        <Image activePatient={this.state.activePatient}/>
                    </div>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm} patientsAreLoaded={patientsAreLoaded}/>
                }
            </div>
        )

    }

}

export default Annotation;
