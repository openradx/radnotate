import {isBoolean} from "util";

class Series {
    seriesInstanceUID: string;

    constructor(seriesInstanceUID: string) {
        this.seriesInstanceUID = seriesInstanceUID
    }

    add ()
}

class Study {
    studyInstanceUID: string;
    series: Series[];

    constructor(studyInstanceUID: string, seriesInstanceUID: string) {
        this.studyInstanceUID = studyInstanceUID
        const series = new Series(seriesInstanceUID)
        this.series = []
        this.add(series)
    }

    add(newSeries: Series) {
        if (this.series.length === 0) {
            this.series = [newSeries]
        } else {
            let isSame: boolean = false
            this.series.forEach((series) => {
                if (series.seriesInstanceUID === newSeries.seriesInstanceUID && !isSame) {
                    isSame = true
                }
            })
            if (!isSame) {
                this.series.push(newSeries)
            }
        }
    }

    get(index: number) {
        return this.series[index]
    }
}

export class Patient {
    patiendID: string;
    studies: Study[];

    constructor(patientID: string, studyInstanceUID: string, seriesInstanceUID: string) {
        this.patiendID = patientID;
        this.studies = []
        const study = new Study(studyInstanceUID, seriesInstanceUID)
        this.add(study)
    }

    add(newStudy: Study) {
        if (this.studies.length === 0) {
            this.studies = [newStudy]
        } else {
            let isSame: boolean = false
            this.studies.forEach((study) => {
                if (study.studyInstanceUID === newStudy.studyInstanceUID && !isSame) {
                    study.add(newStudy.get(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.studies.push(newStudy)
            }
        }
    }

    get(index: number) {
        return this.studies[index]
    }
}

export class Patients {
    patients: Patient[]

    constructor() {
        this.patients = []
    }

    add(newPatient: Patient) {
        if (this.patients.length === 0) {
            this.patients = [newPatient]
        } else {
            let isSame: boolean = false
            this.patients.forEach((patient) => {
                if (patient.patiendID === newPatient.patiendID && !isSame) {
                    patient.add(newPatient.get(0))
                    isSame = true
                }
            })
            if (!isSame) {
                this.patients.push(newPatient)
            }
        }
    }
}
