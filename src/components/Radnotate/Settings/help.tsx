import {Typography} from "@mui/material";

export const helpStartPage = 
    <Typography component={"div"} variant={"body1"} align={"justify"}>
        Description of possible workflows:
        <ul>
            <li>
                Annotation of images:
                <ol>
                    <li>Load images either by selecting a whole folder or only files after pressing the selection button,
                        or by dropping folders or files on the selection button.
                    </li>
                    <li>Define the variables you want to annotate and press the plus button to add them to your variable
                        definitions.
                    </li>
                    <li>If you are not happy with a variable, you can delete it again by pressing the corresponding minus
                        button.
                    </li>
                    <li>If you already used Radnotate, you could reuse variable definitions by loading a previous export
                        CSV file via the corresponding button.
                    </li>
                    <li>Either way, you can add and remove variables as you please.
                    </li>
                    <li>If you decided on your variable definitions and all images are loaded, you can start annotating by
                        pressing the corresponding button.
                    </li>
                </ol>
            </li>
            <li>
                Validation of annotations:
                <ol>
                    <li>Again, load images either by selecting a whole folder or only files after pressing the selection
                        button, or by dropping folders or files on the selection button.
                    </li>
                    <li>As described already, load a previous export CSV file via the corresponding button.
                    </li>
                    <li>Before pressing the start annotation button, turn on the corresponding switch to not only load the
                        variable definitions, but also some annotations that have already been made.
                    </li>
                    <li>You can still add and remove variables as you please. Consider that the corresponding annotations of
                        a variable can not be validated if you delete a variable.
                    </li>
                    <li>Again, press the start button to proceed.
                    </li>
                </ol>
            </li>
        </ul>
        Start annotating to view more detailed help on how to annotate your data.<br/><br/>
        Settings:
        <ul>
            <li>You can switch between dark and light mode. Just look into the settings menu.</li>
        </ul>
        Processing the CSV file:
        <ul>
            <li>Since a few features are still missing, please contact me regarding processing the exported CSV file. I can generate a custom extraction of the CSV file.</li>
            <li>I implemented a Transfomer for a PyTorch based preprocessing pipeline. It automatically generates masks from the CSV file, no coding necessary. It should be also suitable for other processing pipelines in Python, e.g. if you work with scikit-learn.</li>
        </ul>
        Future features:
        <ul>
            <li>Directly export all segmentations and annotation masks into DCMSEG or NIFTI files.</li>
            <li>Load images from PACS directly from Radnotate (DICOM QR functionality).</li>
            <li>Interpolate segmentations and annotation masks between slices.</li>
            <li>Load existing segmentations from DCMSEG into Radnotate for quality control purposes.</li>
        </ul>
        Since this is the first release, it still can contain bugs. Therefore please contact me if you stumble over some wierd behaviour.<br/><br/>
        Kind regards,<br/>
        Manuel Debić
    </Typography>

export const helpAnnotationMode = 
    <Typography component={"div"} variant="body1" align={"justify"}>
        On the right-hand side, you can see the image which you can annotate according to the previously made variable definitions. On the left hand-side, you can see the annotation data table You will recognize, that the columns correspond to your variable definitions. The rows in the table correspond to the patient ID of the images you previously loaded. Furthermore, one of the cells in the table stand out with an orange background. The highlighted cell always marks your currently active cell and tells you, which patient you are currently seeing on the right-hand side, and which variable is currently active.<br/><br/>
        Annotation workflow:
        <ol>
            <li>During variable definition you provided a variable type for each variable. This type defines the annotation tool of each variable. You do not need to activate the defined annotation tool, it is already active and you can start annotating. E.g. if you defined the first column as a length type variable, you can directly start measuring a length with left mouse button click.
            </li>
            <li>You can annotate as much as you want within one active variable, but rather try to split multiple annotations onto multiple variables. E.g. if you want to measure the length of an organ and a lesion, create a separate variable for both with variable type length.
            </li>
            <li>On the other hand, annotations of the same type and target structure should be gathered within the same variable. E.g. if you want to draw a rectangle ROI around a lesion which is visible in multiple slices, then do not create a variable for each slice, but rather create multiple rectangle ROI on each slice in one variable.
            </li>
            <li>If you are done with your current annotation, press enter. The annotations and some meta data will be saved in the active cell of the annotation data table as JSON.
            </li>
            <li>By the way, zero annotations are also possible. The resulting cell value will just be empty.
            </li>
            <li>You will notice that the highlighted active cell automatically moved to the next cell. The next variable type and its corresponding tool is automatically active and you can proceed with the annotation. Furthermore, you do not need to scroll within the annotation data table. The table scrolls automatically, keeping the highlighted active cell visible for you. Of course, if needed, you can scroll.
            </li>
            <li>The annotation tool is always accessible via left mouse button click. Only for the variable types integer and boolean, you have to press keys. The integer variable type expects a number as input, whereas the boolean either excepts the keys 0 (false) or 1 (true) to be pressed. Alternatively, you can also press the f (false) or t (true) key.
            </li>
            <li>Finished annotations always need to be confirmed with pressing the enter key. Only if the enter key is pressed, the annotations are saved in the annotation data table.
            </li>
            <li>If you are done with all annotations for a patient, the active cell will jump to the next patient in the row, starting at the first variable. The displayed images are automatically updated and you will see the next patient.
            </li>
            <li>If you notice that you made a mistake while annotating, you can always jump back to a another patient and variable by double clicking into the cell you would like to change. The displayed images are automatically updated to the selected patient and the tool defined by the variable type is activated. Proceed with the desired correction and confirm by pressing enter. The annotation workflow proceed at the last active cell before you double clicked into the desired cell.
            </li>
        </ol>
        Validation workflow:
        <ol>
            <li>In contrast to the blank annotation workflow, the validation workflow has two noticeable differences: The annotation data table already contains annotations, and those annotations are already visible on the images. For convenience, the first image with the current active annotation is displayed for you, so you do not need to scroll to it anymore.
            </li>
            <li>If you agree with the already available annotation, you can confirm it by pressing enter. The annotation as well as the active cell in the annotation data table stay unchanged. If you do not agree, you can change the annotation as you please, and confirm it by pressing enter. The active cell will be updated.
            </li>
        </ol>
        You can export the annotation data table whenever you want by pressing the corresponding export button. Be sure to always export the CSV file, since it contains the maximum of information and the meta data which is necessary, to load the annotations again in future for example for validation purposes.<br/><br/>
        Additional information:
        <ul>
            <li>Annotations and segmentations support a correction/deletion mode, undo and redo functionality, which should be self explanatory. By pressing reset, all already made annotations or segmentations of the current variable are deleted.
            </li>
            <li>The variable types boolean and integer can be reset by pressing the delete key.
            </li>
            <li>The remaining annotations types can be deleted by clicking them while the deletion mode is enabled.
            </li>
            <li>You can enable and disable the deletion/correction mode not only via the switch, but also by keeping the control key pressed.
            </li>
            <li>Undo and redo functionality can be also triggered via pressing the keys control and z resp. y.
            </li>
            <li>You can set the transparency of segmentations via the slider.
            </li>
            <li>By default, scroll mouse button can be used to change the window level, while the right mouse button can be used for zooming. If the control key is pressed, you can scroll fast through the image stack with the scroll mouse button and pan with the right mouse button.
            </li>
            <li>You can use the series description drop down list to jump to a specific series within the image stack.
            </li>
        </ul>
        Settings:
        <ul>
            <li>You can switch between dark and light mode. Just look into the settings menu.</li>
            <li>Restart from variable definition by pressing the button in the settings menu.</li>
            <li>Restart from the first cell in the annotation data table without deleting any annotations by pressing the corresponding button in the settings menu.</li>
        </ul>
        Processing the CSV file:
        <ul>
            <li>Since a few features are still missing, please contact me regarding processing the exported CSV file. I can generate a custom extraction of the CSV file.</li>
            <li>I implemented a Transfomer for a PyTorch based preprocessing pipeline. It automatically generates masks from the CSV file, no coding necessary. It should be also suitable for other processing pipelines in Python, e.g. if you work with scikit-learn.</li>
        </ul>
        Future features:
        <ul>
            <li>Directly export all segmentations and annotation masks into DCMSEG or NIFTI files.</li>
            <li>Load images from PACS directly from Radnotate (DICOM QR functiontality).</li>
            <li>Interpolate segmentations and annotation masks between slices.</li>
            <li>Load existing segmentations from DCMSEG into Radnotate for quality control purposes.</li>
        </ul>
        Since this is the first release, it still can contain bugs. Therefore please contact me if you stumble over some wierd behaviour.<br/><br/>
        Kind regards,<br/>
        Manuel Debić
    </Typography>