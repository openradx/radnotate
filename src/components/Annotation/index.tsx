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
    imageIds: string[]
    instanceNumbers: Map<string, number>
    annotationsCount: number
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
            activeStudyIndex: 0,
            annotationsCount: 0,
        }
    }

    saveAnnotationForm = (variables: Variable[], annotationLevel: AnnotationLevel) => {
        let activePatient: Patient
        if (annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(this.state.activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(this.state.activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this.updatePatient(activePatient)
        this.setState({
            activePatient: activePatient,
            variables: variables.slice(0, variables.length - 1),
            annotationLevel: annotationLevel,
            annotationMode: true,
            activeVariable: variables.slice(0, 1).pop(),
            imageIds: imageIds,
            instanceNumbers: instanceNumbers
        })
    }

    nextVariable = (currentValues: Map<string, number>[]) => {
        let activeVariableIndex = this.state.activeVariableIndex
        activeVariableIndex++
        if (activeVariableIndex === this.state.variables.length) {
            activeVariableIndex = 0
            this.nextPatient()
        }
        const activeVariable = this.state.variables[activeVariableIndex]
        this.setState({activeVariableIndex: activeVariableIndex, activeVariable: activeVariable})
    }

    nextPatient = () => {
        let activePatientIndex = this.state.activePatientIndex
        activePatientIndex++
        let activePatient: Patient
        if (this.state.annotationLevel === AnnotationLevel.patient) {
            activePatient = this.props.patients.getPatient(activePatientIndex)
        } else {
            activePatient = this.props.patients.getPatientStudy(activePatientIndex, this.state.activeStudyIndex)
        }
        const {imageIds, instanceNumbers} = this.updatePatient(activePatient)
        this.setState({
            activePatient: activePatient,
            activePatientIndex: activePatientIndex,
            imageIds: imageIds,
            instanceNumbers: instanceNumbers,
            annotationsCount: 0
        })
    }

    updateAnnotationsCount = (annotationsCount: number) => {
        this.setState({annotationsCount: annotationsCount})
    }

    updatePatient = (activePatient: Patient) => {
        let imageIds: string[] = []
        let instanceNumbers: Map<string, number> = new Map<string, number>()
        activePatient.studies.forEach((study) => {
            study.series.forEach((series) => {
                let imageIdsTemp = new Array<string>(series.images.length)
                series.images.forEach((image) => {
                    imageIdsTemp[image.instanceNumber - 1] = image.imageID
                    instanceNumbers.set(image.imageID, image.instanceNumber);
                })
                imageIds = [...imageIds, ...imageIdsTemp]
            })
        })
        return {imageIds, instanceNumbers}
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
                        <Image activePatient={this.state.activePatient}
                               activeVariable={this.state.activeVariable}
                               nextVariable={this.nextVariable}
                               imageIds={this.state.imageIds}
                               instanceNumbers={this.state.instanceNumbers}
                               annotationsCount={this.state.annotationsCount}
                               updateAnnotationsCount={this.updateAnnotationsCount}/>
                    </div>
                    :
                    <AnnotationForm saveAnnotationForm={this.saveAnnotationForm} patientsAreLoaded={patientsAreLoaded}/>
                }
            </div>
        )

    }

}

export default Annotation;
