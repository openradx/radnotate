import React, {Component} from "react";
import AnnotationForm, {AnnotationLevel} from "./AnnotationForm";
import Variable from "./AnnotationForm/variable";
import AnnotationData from "./AnnotationData";
import {Patient, Patients} from "../DicomDropzone/dicomObject";
import Image from "../Image"


type AnnotationStateType = {
    variables: Variable[]
    annotationMode: boolean
    annotationLevel: AnnotationLevel
    activePatient: Patient | undefined
    activeVariable: Variable | undefined
    activeVariableIndex: number
    activePatientIndex: number
    activeStudyIndex: number
}

type AnnotationStateProps = {
    patients: Patients
}

class Annotation extends Component<AnnotationStateProps, AnnotationStateType> {

    constructor(props: AnnotationStateProps) {
        super(props);
        this.state = {
            annotationMode: false,
            annotationLevel: AnnotationLevel.patient,
            activeVariableIndex: 0,
            variables: [],
            activePatientIndex: 0,
            activeStudyIndex: 0
        }
    }

    saveAnnotationForm = (variables: Variable[], annotationLevel: AnnotationLevel) => {
        let activePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(this.state.activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(this.state.activePatientIndex, this.state.activeStudyIndex)
        }
        this.setState({
            activePatient: activePatient,
            variables: variables.slice(0, variables.length - 1),
            annotationLevel: annotationLevel,
            annotationMode: true,
            activeVariable: variables.slice(0, 1).pop()
        })
    }

    nextVariable = () => {
        let activeVariableIndex = this.state.activeVariableIndex
        activeVariableIndex++
        const activeVariable = this.state.variables[activeVariableIndex]
        this.setState({activeVariableIndex: activeVariableIndex, activeVariable: activeVariable})
    }

    nextPatient = () => {
        let activePatientIndex = this.state.activePatientIndex
        activePatientIndex++
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(this.state.activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(this.state.activePatientIndex, this.state.activeStudyIndex)
        }
        this.setState({activePatient: activePatient, activePatientIndex: activePatientIndex})
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
                        <AnnotationData patients={this.props.patients} variables={this.state.variables}
                                        annotationLevel={this.state.annotationLevel}
                                        activePatient={this.state.activePatient}
                                        activeVariable={this.state.activeVariable}/>
                        <Image activePatient={this.state.activePatient} activeVariable={this.state.activeVariable}
                               nextVariable={this.nextVariable} nextPatient={this.nextPatient}/>
                    </div>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm} patientsAreLoaded={patientsAreLoaded}/>
                }
            </div>
        )

    }

}

export default Annotation;
